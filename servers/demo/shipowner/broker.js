const mongo = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
const cors = require("cors");
const express = require("express");
const http = require("http");
const Web3 = require("web3");
const env = require("./variables");
var util = require("../../tda-core/tda-util");
const DidAuth = require("../../tda-core/did-auth");
const CoreBroker = require("../../tda-core/broker");

const logger = util.getLogger("broker/shipowner", util.colors.BRIGHT_MAGENTA);

let web3 = new Web3(env.ethereumUrl); // set the url of ethereum
var account = web3.eth.accounts.privateKeyToAccount(env.privateKey);
const didAuth = DidAuth(web3, account, env, logger);

/**
 * REST implementation
 */
var app = express();
app.use(express.json());
app.use(cors());

/**
 * Imports core Rest Api functionalities
 */
const coreBroker = CoreBroker(env, app, didAuth, web3, logger);

//serves react website
//coreBroker.dynamicallyServeWebsite(__dirname);

app.post("/credentials", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const collCred = client.db(env.role).collection("credentials");
        const collReg = client.db(env.role).collection("registry");
        const issuer = await collReg.findOne({
            address: req.body.issuer.toLowerCase(),
        });
        const subject = await collReg.findOne({
            address: req.body.subject.toLowerCase(),
        });
        return await collCred.insertOne({
            issuer: issuer._id,
            subject: subject._id,
            date: req.body.date,
            jwt: req.body.jwt,
        });
    });
});

app.get("/credentials/:id", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    if ("billOfLading" in req.query) {
        await coreBroker.doWithErrorHandling(res, async (client) => {
            //get BL
            const bl = await client
                .db(env.role)
                .collection("billOfLadings")
                .findOne({ contract_address: req.query.billOfLading });
            //get loading agent
            const issuer = await client
                .db(env.role)
                .collection("registry")
                .findOne({ _id: new ObjectID(bl.signer.id) });
            //get credential by subject and issuer
            const collCred = client.db(env.role).collection("credentials");
            const day = 60 * 60 * 24;
            const dt = Date.now() / 1000;
            const credentials = await client
                .db(env.role)
                .collection("credentials")
                .find({
                    subject: new ObjectID(req.params.id),
                    issuer: new ObjectID(issuer._id),
                    date: { $gt: dt - day },
                })
                .sort("date", -1)
                .limit(1)
                .toArray();

            for (var i in credentials) {
                const cred = credentials[i];
                const subject = await client
                    .db(env.role)
                    .collection("registry")
                    .findOne(new ObjectID(cred.subject));

                cred.issuer = issuer;
                cred.subject = subject;
            }
            return credentials;
        });
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const collCred = client.db(env.role).collection("credentials");
        const credentials = await collCred
            .find({ subject: new ObjectID(req.params.id) })
            .toArray();

        for (var i in credentials) {
            const cred = credentials[i];
            const issuer = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(cred.issuer));
            const subject = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(cred.subject));

            cred.issuer = issuer;
            cred.subject = subject;
        }
        return credentials;
    });
});

app.get("/vessels", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const coll = client.db(env.role).collection("billOfLadings");
        return await coll.distinct("vessel_id", {});
    });
});

app.get("/recentBillsOfLading/:vesselId", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const coll = client.db(env.role).collection("billOfLadings");
        const query = {
            "vessel_id.value": req.params.vesselId,
        };
        var blArray = await coll
            .find(query)
            .sort("date", -1)
            .limit(3)
            .toArray();

        for (var i in blArray) {
            const bl = blArray[i];
            const charterparty = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(new ObjectID(bl.charterparty));
            const consignee = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.consignee.id));
            const notify_party = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.notify_party.id));
            const signer = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.signer.id));

            bl.charterparty = charterparty;
            bl.consignee = consignee;
            bl.notify_party = notify_party;
            bl.signer.agent = signer;
        }
        return blArray;
    });
});

app.get("/billsOfLading", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const blArray = await client
            .db(env.role)
            .collection("billOfLadings")
            .find()
            .toArray();

        for (var i in blArray) {
            const bl = blArray[i];
            const charterparty = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(new ObjectID(bl.charterparty));
            const consignee = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.consignee.id));
            const notify_party = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.notify_party.id));
            const signer = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.signer.id));

            bl.charterparty = charterparty;
            bl.consignee = consignee;
            bl.notify_party = notify_party;
            bl.signer.agent = signer;
        }
        return blArray;
    });
});

app.get("/masters", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        return await client
            .db(env.role)
            .collection("registry")
            .find({ role: "master" })
            .toArray();
    });
});

app.get("/carrier", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        return await client
            .db(env.role)
            .collection("registry")
            .findOne({ role: "shipowner" });
    });
});

sseClients = {};

app.get("/events/:id", async (req, res) => {
    logger.info(`registered event-listener for user ${req.params.id}`);
    if (!(await didAuth.isTokenValid(req.query.jwt))) {
        didAuth.reject(res);
        logger.debug("rejecting request");
        return;
    }

    res.writeHead(200, {
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
    });
    sseClients[req.params.id] = res;
});

async function initEvents() {
    try {
        var client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });

        //event for charterparty: deployment and signature
        var stream = client
            .db(env.role)
            .collection("charterparties")
            .watch([{ $match: { operationType: "update" } }], {
                fullDocument: "updateLookup",
            });

        stream.on("change", async (next) => {
            var update = next.updateDescription.updatedFields;
            var event;
            if ("contract_address" in update) {
                event = "deploy_charterparty";
            } else if ("charterer.signature" in update) {
                event = "sign_charterparty";
            }

            for (var client in sseClients) {
                sseClients[client].write(
                    `event: ${event}\ndata: ${JSON.stringify(
                        next.fullDocument
                    )}\n\n`
                );
            }
        });

        //event for billOfLading: insert and signature
        var stream2 = client
            .db(env.role)
            .collection("billOfLadings")
            .watch([], {
                fullDocument: "updateLookup",
            });

        stream2.on("change", async (next) => {
            var event;
            if (next.operationType == "insert") {
                event = "new_billOfLading";
            } else if (next.operationType == "update") {
                event = "sign_billOfLading";
            }

            for (var client in sseClients) {
                sseClients[client].write(
                    `event: ${event}\ndata: ${JSON.stringify(
                        next.fullDocument
                    )}\n\n`
                );
            }
        });

        //event for proofOfDelivery: insert
        var stream3 = client
            .db(env.role)
            .collection("proofOfDeliveries")
            .watch([], {
                fullDocument: "updateLookup",
            });

        stream3.on("change", async (next) => {
            var event;
            if (next.operationType == "insert") {
                event = "new_proofOfDelivery";
            } else if (next.operationType == "update") {
                event = "sign_proofOfDelivery";
            }

            for (var client in sseClients) {
                sseClients[client].write(
                    `event: ${event}\ndata: ${JSON.stringify(
                        next.fullDocument
                    )}\n\n`
                );
            }
        });

        logger.info("listening for database events..");
    } catch (err) {
        logger.error(error);
    }
}
initEvents();

app.listen(env.broker.port, "0.0.0.0");
logger.info(`running at ${env.broker.host}:${env.broker.port}`);
