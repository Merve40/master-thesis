const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const fetch = require("node-fetch");
const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;
const jp = require("jsonpath");

module.exports = async function (
    env,
    app,
    account,
    oracle,
    web3,
    logger,
    sseClients = {}
) {
    const gas = 8000000;
    const role = env.role; // e.g. charterer, shipowner, supplier, etc.

    const config = {
        networks: [
            {
                name: "development",
                rpcUrl: `http${env.ethereumUrl.substr(2)}`,
                registry: env.contracts.did_registry.address,
            },
        ],
    };

    var resolver = new Resolver(getResolver(config));

    /**************************************************************************
     ****************************** Events ************************************
     **************************************************************************/

    // Signature Events

    var contractEvent;
    var contracts = [];

    async function initializeOnContractSignedEvent() {
        var client;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            var coll = await client.db(env.role).collection("charterparties");

            var role = env.role === "charterer" ? "shipowner" : "charterer";
            var query = {
                contract_address: {
                    $ne: "null",
                },
            };
            query[`${role}.signature`] = "null";
            var list = await coll
                .find(query)
                .map((c) => c.contract_address)
                .toArray();

            if (list.length > 0) {
                contracts = list;
                updateOnContractSignedEventListener();
            }
        } catch (error) {
            logger.error(error);
        } finally {
            if (client) await client.close();
        }
    }

    async function onContractSigned(event) {
        logger.debug("event: onContractSigned %o", event.returnValues);
        var address = event.returnValues._contract;
        var name = event.returnValues.contractName;
        var signer = event.returnValues.signer;
        var signature = event.returnValues.signature;

        var client;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            var user = await client
                .db(env.role)
                .collection("registry")
                .findOne({ address: signer.toLowerCase() });
            if (user) {
                if (user.role == env.role) {
                    return;
                }
                var update = {};
                update["$set"] = {};
                update["$set"][`${user.role}.signature`] = signature;
                var updated = await client
                    .db(env.role)
                    .collection("charterparties")
                    .updateOne({ contract_address: address }, update);

                logger.debug("update %o", update);
                contracts = contracts.filter((c) => c !== address);
                updateOnContractSignedEventListener();
            } else {
                throw { error: "User does not exist in the system" };
            }
        } catch (error) {
            logger.error(error);
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    function updateOnContractSignedEventListener() {
        logger.debug("updating event: SignedContract for %o", contracts);
        if (contractEvent) {
            // un-subscribes from existing event
            contractEvent.off("data", onContractSigned);
        }

        if (contracts.length > 0) {
            contractEvent = oracle.events
                .SignedContract({
                    filter: {
                        _contract: contracts,
                    },
                })
                .on("data", onContractSigned);
        }
    }

    function addContract(con) {
        contracts.push(con);
    }

    initializeOnContractSignedEvent();

    // Query Events
    var queryEvent;
    var queryContracts = [];
    async function initializeBatchQueryEventListener() {
        var client;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            var coll = await client
                .db(env.role)
                .collection("proofOfDeliveries");

            var role = env.role === "charterer" ? "shipowner" : "charterer";
            var query = { checked: {} };
            query.checked["$exists"] = false;
            queryContracts = await coll
                .find(query)
                .map((c) => c.contract_address)
                .toArray();

            logger.debug(
                "fetched unchecked proof-of-deliveries %o",
                queryContracts
            );

            await updateBatchQueryEventListener();
        } catch (error) {
            logger.error(error);
        } finally {
            if (client) await client.close();
        }
    }

    async function updateBatchQueryEventListener() {
        if (queryEvent) {
            // un-subscribes from existing event
            queryEvent.off("data", batchQueryEvent);
        }

        if (queryContracts.length > 0) {
            //TODO: use oracle.getPastEvents() instead!
            var logs = await oracle.getPastEvents();
            var events = logs.filter((l) =>
                l.event == "BatchQuery" && l.returnValues.srcContract
                    ? queryContracts.includes(l.returnValues.srcContract)
                    : false
            );
            events.forEach((ev) => {
                batchQueryEvent(ev);
            });

            /*
            queryEvent = oracle.events
                .BatchQuery({
                    filter: {
                        _contract: queryContracts,
                    },
                })
                .on("data", batchQueryEvent);
                */
        }
    }

    async function batchQueryEvent(event) {
        logger.debug("event: BatchQuery %o", event.returnValues);
        var address = event.returnValues.srcContract;
        var handle = event.returnValues.handle;
        var hashes = event.returnValues.values;

        var client;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            var pod = await client
                .db(env.role)
                .collection("proofOfDeliveries")
                .findOne({ contract_address: address });

            var bl = await client
                .db(env.role)
                .collection("billOfLadings")
                .findOne(new ObjectID(pod.billOfLading));

            var cp = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(new ObjectID(bl.charterparty));

            var numbers = [
                cp.max_moisture_level.value,
                pod.cargo.moisture_level.value,
                cp.laytime.value,
                bl.date.value,
                pod.time_delivery.value,
                bl.cargo.weight.value,
                pod.cargo.weight.value,
            ];

            var tx = await oracle.methods
                .submitBatchQuery(handle, numbers, [])
                .send({ from: account.address, gas })
                .on("error", async (e) => {
                    logger.error("BatchQuery failed: %o", e);
                    if (client) {
                        await client.close();
                    }
                })
                .on("receipt", async (r) => {
                    //sending logs
                    notify({
                        name: "batchQuery",
                        body: `> query for: ${JSON.stringify(
                            hashes
                        )}\n> response data: ${JSON.stringify([...numbers])}`,
                    });

                    var update = {};
                    update["$set"] = { checked: true };
                    var updated = await client
                        .db(env.role)
                        .collection("proofOfDeliveries")
                        .updateOne({ contract_address: address }, update);

                    logger.debug("update %o", update);

                    queryContracts = queryContracts.filter(
                        (c) => c !== address
                    );
                    updateBatchQueryEventListener();

                    if (client) {
                        await client.close();
                    }
                });
        } catch (error) {
            logger.error(error);
            if (client) {
                await client.close();
            }
        }
    }

    function notify(notification) {
        for (var c in sseClients) {
            sseClients[c].write(`data: ${JSON.stringify(notification)}\n\n`);
        }
    }

    async function initDbEvents() {
        var client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });
        var stream2 = client
            .db(env.role)
            .collection("proofOfDeliveries")
            .watch([{ $match: { operationType: "insert" } }]);

        stream2.on("change", async (next) => {
            //var doc = next.fullDocument;
            initializeBatchQueryEventListener();
        });
    }

    initDbEvents();

    /**************************************************************************
     ***************************** REST API ***********************************
     **************************************************************************/

    var nonces = {};

    // query parameters: address, contractAddress, contractName
    app.get("/challenge", async (req, res) => {
        await doWithErrorHandling(res, async (client) => {
            var address = req.query.address;
            var nonce = Date.now();

            nonces[address] = {
                contract: {
                    address: req.query.contractAddress,
                    name: req.query.contractName.toLowerCase(),
                },
                nonce,
            };

            return { nonce: nonce };
        });
    });

    // query parameters: sender, signature
    app.get("/request", async (req, res) => {
        await doWithErrorHandling(res, async (client) => {
            var address = req.query.sender;
            var signature = req.query.signature;

            var message = web3.eth.accounts.hashMessage(nonces[address].nonce);
            var recoveredSigner = await web3.eth.accounts.recover(
                message,
                signature
            );

            if (recoveredSigner !== address) {
                throw { error: "Signature does not match" };
            }

            var collection;
            if (nonces[address].contract.name == "charterparty") {
                collection = "charterparties";
            } else if (nonces[address].contract.name == "billoflading") {
                collection = "billOfLadings";
            } else if (nonces[address].contract.name == "proofofdelivery") {
                collection = "proofOfDeliveries";
            } else {
                throw { error: "Contract name not known" };
            }

            var numObjects = await client
                .db(env.role)
                .collection(collection)
                .find()
                .toArray();

            var object = await client
                .db(env.role)
                .collection(collection)
                .findOne({
                    contract_address: nonces[address].contract.address,
                });

            if (!object) {
                throw { error: "Contract address is not known" };
            }

            delete nonces[address];
            return object;
        });
    });

    app.get("/proofs/:merkleroot", async (req, res) => {
        doWithErrorHandling(res, async (client) => {
            return await client
                .db(env.role)
                .collection("proofs")
                .findOne({ merkleroot: req.params.merkleroot });
        });
    });

    async function doWithErrorHandling(res, func) {
        var client;
        var result;
        var hasNoError = true;
        var error;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            result = await func(client);
        } catch (err) {
            hasNoError = false;
            error = err;
            logger.error(error);
        } finally {
            if (client) {
                await client.close();
            }

            hasNoError
                ? res.status(200).send(result)
                : res.status(500).send({ error });
        }
    }

    return {
        addContract,
        updateOnContractSignedEventListener,
        notify,
    };
};
