const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const Web3 = require("web3");
const fetch = require("node-fetch");
const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;

var util = require("../../tda-core/tda-util");
const env = require("./variables");

const express = require("express");
const cors = require("cors");
const http = require("http");

const logger = util.getLogger("oracle/shipowner", util.colors.MAGENTA);

let web3 = new Web3(env.ethereumUrl);
var account = web3.eth.accounts.privateKeyToAccount(env.privateKey);
var oracle = new web3.eth.Contract(
    env.contracts.oracle.abi,
    env.contracts.oracle.address
);

var app = express();
app.use(express.json());
app.use(cors());

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

sseClients = {};

app.get("/logs", async (req, res) => {
    logger.info(`registered event-listener logging`);

    res.writeHead(200, {
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
    });
    sseClients[req.params.id] = res;
});

var core;
require("../../tda-core/oracle")(
    env,
    app,
    account,
    oracle,
    web3,
    logger,
    sseClients
).then(async (_core) => {
    core = _core;

    await createdCharterparty();
    await initLists();
    await updateBillOfLadingListener();
    await updateProofOfDeliveryListener();
});

var blEvent;
var podEvent;

var contractsCharterparty = [];
var contractsBillOfLading = [];

async function initLists() {
    var list = await tryWith(async (client) => {
        var filter = { contract_address: {} };
        filter.contract_address["$ne"] = "null";
        return await client
            .db(env.role)
            .collection("charterparties")
            .find()
            .filter(filter)
            .map((c) => c.contract_address)
            .toArray();
    });

    if (list) {
        contractsCharterparty = list;
    }

    // fetch bills-of-lading that do not already have a corresponding proof-of-delivery
    // either query db or query events
    list = await tryWith(async (client) => {
        var ids = await client
            .db(env.role)
            .collection("proofOfDeliveries")
            .find()
            .map((p) => p.billOfLading)
            .toArray();
        var query = { _id: {} };
        query._id["$nin"] = ids;

        return await client
            .db(env.role)
            .collection("billOfLadings")
            .find(query)
            .map((b) => b.contract_address)
            .toArray();
    });

    if (list) {
        contractsBillOfLading = list;
    }
}

async function createdCharterparty() {
    oracle.events
        .CreatedCharterparty({
            filter: {
                notifyParty: [account.address],
            },
        })
        .on("data", async (event) => {
            logger.info("event: CreatedCharterparty %o", event.returnValues);
            var charterparty = event.returnValues.charterparty;
            var creator = event.returnValues.creator;
            // update db
            var result = await tryWith(async (client) => {
                var update = {};
                update["$set"] = {
                    contract_address: charterparty,
                };

                var charterer = await client
                    .db(env.role)
                    .collection("registry")
                    .findOne({ delegatable: creator });
                return await client
                    .db(env.role)
                    .collection("charterparties")
                    .updateOne({ "charterer.id": charterer._id }, update);
            });
            // update list: contractsCharterparty
            contractsCharterparty.push(charterparty);
            updateBillOfLadingListener();
            // update list for ContractSigned event
            core.addContract(charterparty);
            core.updateOnContractSignedEventListener();
        });
}

async function createdBillOfLading(event) {
    logger.debug("event: CreatedBillOfLading %o", event.returnValues);
    var charterparty = event.returnValues.charterparty;
    var billOfLading = event.returnValues.billOfLading;
    var creator = event.returnValues.creator;

    var notification = {
        name: "CreatedBillOfLading",
        body: `> CreatedBillOfLading: ${JSON.stringify(
            {
                charterparty,
                billOfLading,
                creator,
            },
            0,
            2
        )}\n`,
    };

    setTimeout(async () => {
        var data = await requestData(
            creator,
            billOfLading,
            "billOfLading",
            notification
        );

        core.notify(notification);

        delete data._id;
        // set IDs of charterparty, consignee, signer, notify_party
        data.charterparty = new ObjectID(data.charterparty);
        data.consignee = new ObjectID(data.consignee);
        data.notify_party.id = new ObjectID(data.notify_party.id);
        data.signer.id = new ObjectID(data.signer.id);

        await tryWith(async (client) => {
            return await client
                .db(env.role)
                .collection("billOfLadings")
                .insertOne(data);
        });
        // update list: contractsBillOfLading & event listener
        contractsBillOfLading.push(billOfLading);
        // update proofOfDeliveryListener
        updateProofOfDeliveryListener();
    }, 5000);
}

async function createdProofOfDelivery(event) {
    logger.debug("event: CreatedProofOfDelivery %o", event.returnValues);
    var billOfLading = event.returnValues.billOfLading;
    var proofOfDelivery = event.returnValues.proofOfDelivery;
    var creator = event.returnValues.creator;

    var notification = {
        name: "CreatedProofOfDelivery",
        body: `> CreatedProofOfDelivery: ${JSON.stringify(
            {
                billOfLading,
                proofOfDelivery,
                creator,
            },
            0,
            2
        )}\n`,
    };

    setTimeout(async () => {
        var data = await requestData(
            creator,
            proofOfDelivery,
            "proofOfDelivery",
            notification
        );

        core.notify(notification);

        delete data._id;
        await tryWith(async (client) => {
            var bl = await client
                .db(env.role)
                .collection("billOfLadings")
                .findOne({ contract_address: billOfLading });
            data.consignee = new ObjectID(data.consignee);
            data.shipowner = new ObjectID(data.shipowner);
            data.billOfLading = bl._id;

            return await client
                .db(env.role)
                .collection("proofOfDeliveries")
                .insertOne(data);
        });

        //remove billOfLading from contractsBillOfLading and update listener
        contractsBillOfLading = contractsBillOfLading.filter(
            (c) => c != billOfLading
        );
        updateBillOfLadingListener();
    }, 5000);
}

function updateBillOfLadingListener() {
    if (blEvent) {
        // un-subscribes from existing event
        blEvent.off("data", createdBillOfLading);
    }

    if (contractsCharterparty.length > 0) {
        blEvent = oracle.events
            .CreatedBillOfLading({
                filter: {
                    charterparty: contractsCharterparty,
                },
            })
            .on("data", createdBillOfLading);
    }
}

async function updateProofOfDeliveryListener() {
    if (podEvent) {
        // un-subscribes from existing event
        podEvent.off("data", createdProofOfDelivery);
    }

    if (contractsCharterparty.length > 0) {
        podEvent = oracle.events
            .CreatedProofOfDelivery({
                filter: {
                    billOfLading: contractsBillOfLading,
                },
            })
            .on("data", createdProofOfDelivery);
    }
}

/**
 * Makes a request to the oracle
 */
async function requestData(
    creator,
    contractAddress,
    contractName,
    notification = {}
) {
    // 1 - resolves sender and retrieves senders oracle service
    var did = await resolver.resolve(`did:ethr:development:${creator}`);

    notification.body += `> fetched did-document of 'creator'\n`;

    var services = did.didDocument.service.filter(
        (service) => service.type === "oracle"
    );
    var orcl = services[services.length - 1];

    notification.body += `> retrieved oracles service-endoint: '${orcl.serviceEndpoint}'\n`;

    // 2 - fetches a challenge from the oracle
    var response = await fetch(
        `${orcl.serviceEndpoint}/challenge?address=${account.address}&contractAddress=${contractAddress}&contractName=${contractName}`
    );
    var data = await response.json();

    notification.body += `> GET /challenge?address=${account.address}&contractAddress=${contractAddress}&contractName=${contractName}\n`;
    notification.body += `> response status 200, ${JSON.stringify(
        data,
        0,
        2
    )}\n`;

    var nonce = data.nonce;
    var hashed = web3.eth.accounts.hashMessage(data.nonce);
    var signature = account.sign(hashed).signature;
    // 3 - sends the signature of the challenge to the oracle
    response = await fetch(
        `${orcl.serviceEndpoint}/request?sender=${account.address}&signature=${signature}`
    );

    notification.body += `> GET /request?sender=${account.address}&signature=${signature}\n`;

    data = await response.json();
    if (data.error) {
        logger.error(data.error);
        notification.body += `> response status 500, failed to request data\n`;
        return null;
    }

    notification.body += `> response status 200, ${JSON.stringify(
        data,
        0,
        2
    )}\n`;
    return data;
}

async function tryWith(func) {
    var client;
    try {
        client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });
        return await func(client);
    } catch (error) {
        logger.error(error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

var server = http.createServer(app);
server.listen(env.oracle.port, "0.0.0.0");
logger.info(`running at ${env.oracle.host}:${env.oracle.port}`);
