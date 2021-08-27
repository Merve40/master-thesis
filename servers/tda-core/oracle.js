const mongo = require("mongodb").MongoClient;
const fetch = require("node-fetch");
const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;

module.exports = async function (
    env,
    app,
    account,
    oracle,
    web3,
    logger,
    sseClients = {}
) {
    const gas = 4000000;
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

            logger.debug("fetched unchecked proof-of-deliveries %o", contracts);

            updateBatchQueryEventListener();
        } catch (error) {
            logger.error(error);
        } finally {
            if (client) await client.close();
        }
    }

    function updateBatchQueryEventListener() {
        if (queryEvent) {
            // un-subscribes from existing event
            queryEvent.off("data", batchQueryEvent);
        }

        if (queryContracts.length > 0) {
            queryEvent = oracle.events
                .BatchQuery({
                    filter: {
                        _contract: queryContracts,
                    },
                })
                .on("data", batchQueryEvent);
        }
    }

    async function batchQueryEvent(event) {
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
                .findOne({ address });

            var bl = await client
                .db(env.role)
                .collection("billOfLadings")
                .findOne(pod.billOfLading);

            var cp = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(bl.charterparty);

            var pairs = jp.query(pod, "$..[?(@.hash)]");
            pairs.concat(jp.query(bl, "$..[?(@.hash)]"));
            pairs.concat(jp.query(cp, "$..[?(@.hash)]"));

            var matches = pairs
                .filter((p) => hashes.includes(p.hash))
                .map((p) => p.value);

            var numbers = matches.filter((m) => typeof m === "number");
            var bytes32 = matches
                .filter((m) => typeof m === "string")
                .map((m) => web3.utils.asciiToHex(m));

            await oracle.methods
                .submitBatchQuery(handle, numbers, bytes32)
                .send({ gas });

            //sending logs
            var strings = matches.filter((m) => typeof m === "string");
            notify({
                name: "batchQuery",
                body: `> query for: ${JSON.stringify(
                    hashes
                )}\n> response data: ${JSON.stringify([
                    ...numbers,
                    ...strings,
                ])}`,
            });

            var update = {};
            update["$set"] = { checked: true };
            var updated = await client
                .db(env.role)
                .collection("proofOfDeliveries")
                .updateOne({ contract_address: address }, update);

            logger.debug("update %o", update);

            queryContracts = queryContracts.filter((c) => c !== address);
            updateBatchQueryEventListener();
        } catch (error) {
            logger.error(error);
        } finally {
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
