const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const Web3 = require("web3");
const fetch = require("node-fetch");
const util = require("../../tda-core/tda-util");
const env = require("./variables");

const express = require("express");
const cors = require("cors");
const http = require("http");

const BUYER_SERVER = "http://0.0.0.0:3434";

const logger = util.getLogger("oracle/charterer", util.colors.CYAN);

var app = express();
app.use(express.json());
app.use(cors());

let web3 = new Web3(env.ethereumUrl);
var account = web3.eth.accounts.privateKeyToAccount(env.privateKey);
var oracle = new web3.eth.Contract(
    env.contracts.oracle.abi,
    env.contracts.oracle.address
);

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

var depositEvent;
var contractsBL = [];

async function initializeDepositedEvent() {
    // fetch unsigned B/Ls
    var list = await tryWith(async (client) => {
        var coll = client.db(env.role).collection("billOfLadings");
        return await coll
            .find({
                "signer.signature": "null",
            })
            .map((bl) => bl.contract_address)
            .toArray();
    });

    if (list.length > 0) {
        contractsBL = list;
        updateDepositedEvent();
    }
}

function updateDepositedEvent() {
    logger.debug("update event: Deposited");
    if (depositEvent) {
        // un-subscribes from existing event
        depositEvent.off("data", deposited);
    }

    if (contractsBL.length > 0) {
        depositEvent = oracle.events
            .Deposited({
                filter: {
                    srcContract: contractsBL,
                },
            })
            .on("data", deposited);
    }
}

async function deposited(event) {
    var address = event.returnValues.srcContract;
    await tryWith(async (client) => {
        return await client
            .db(env.role)
            .collection("billOfLadings")
            .findOneAndUpdate(
                { contract_address: address },
                { $set: { deposited: true } }
            );
    });
    contractsBL = contractsBL.filter((c) => c != address);
    updateDepositedEvent();
}

try {
    require("../../tda-core/oracle")(
        env,
        app,
        account,
        oracle,
        web3,
        logger,
        sseClients
    ).then(async (core) => {
        // db events for listening to charterparty deployment
        var client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });
        var stream = client
            .db(env.role)
            .collection("charterparties")
            .watch([], {
                fullDocument: "updateLookup",
            });
        stream.on("change", async (next) => {
            var update = next.updateDescription.updatedFields;
            if ("contract_address" in update) {
                core.addContract(update.contract_address);
                core.updateOnContractSignedEventListener();
            }
        });

        //set listener for deposit event for each new B/L
        var stream2 = client
            .db(env.role)
            .collection("billOfLadings")
            .watch([{ $match: { operationType: "insert" } }]);

        stream2.on("change", async (next) => {
            logger.debug("inserted bill of lading");
            var doc = next.fullDocument;
            //update event listener
            contractsBL.push(doc.contract_address);
            updateDepositedEvent();
        });

        // set listener for Deposited events
        await initializeDepositedEvent();

        /**
         * Notifies buyer once order has been closed
         */
        var stream3 = client.db(env.role).collection("orders").watch([], {
            fullDocument: "updateLookup",
        });
        stream3.on("change", async (next) => {
            var update = next.updateDescription.updatedFields;
            if ("status" in update) {
                var doc = next.fullDocument;
                logger.debug(`document change with id ${doc._id}`);

                var bl = await tryWith(async (client) => {
                    return await client
                        .db(env.role)
                        .collection("billOfLadings")
                        .findOne(new ObjectID(doc.billOfLading));
                });
                var pod = await tryWith(async (client) => {
                    return await client
                        .db(env.role)
                        .collection("proofOfDeliveries")
                        .findOne({ billOfLading: new ObjectID(bl._id) });
                });

                var delivery = {
                    billOfLading: bl.contract_address,
                    proofOfDelivery: pod.contract_address,
                    loading_time: bl.date.value,
                    loading_port: bl.port.value,
                    description: bl.cargo.description.value,
                    discharging_time: pod.time_delivery.value,
                    discharging_port: pod.port.value,
                    weight: pod.cargo.weight.value,
                    moisture_level: pod.cargo.moisture_level.value,
                    nutrition_levels: bl.cargo.nutrition_levels.value,
                    verified: false,
                };
                await fetch(`${BUYER_SERVER}/delivery`, {
                    method: "post",
                    mode: "cors",
                    body: JSON.stringify(delivery),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                core.notify({
                    name: "POST /delivery",
                    body: `> sending delivery update to customer: ${JSON.stringify(
                        delivery,
                        0,
                        2
                    )}`,
                });
            }
        });
    });
} catch (error) {
    logger.error(error);
}

async function tryWith(func) {
    var client;
    var result;
    try {
        client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });
        result = await func(client);
    } catch (error) {
        logger.error(error);
        result = null;
    } finally {
        if (client) {
            await client.close();
        }
        return result;
    }
}

app.listen(env.oracle.port, "0.0.0.0");
logger.info(`running at ${env.oracle.host}:${env.oracle.port}`);
