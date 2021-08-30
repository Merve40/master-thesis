const mongo = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
var express = require("express");
var cors = require("cors");
var http = require("http");
var Web3 = require("web3");
var env = require("./variables");
var util = require("../../tda-core/tda-util");
const DidAuth = require("../../tda-core/did-auth");
const CoreBroker = require("../../tda-core/broker");

const logger = util.getLogger("broker/charterer", util.colors.BRIGHT_CYAN);

let web3 = new Web3(env.ethereumUrl);
var account = web3.eth.accounts.privateKeyToAccount(env.privateKey);

const didAuth = DidAuth(web3, account, env, logger);

/**
 * REST implementation
 */
var app = express();
app.use(express.json());
app.use(cors());

//var server = http.createServer(app);

/**
 * Imports core Rest Api functionalities
 */
const coreBroker = CoreBroker(env, app, didAuth, web3, logger);

//serves react website
//coreBroker.dynamicallyServeWebsite(__dirname);

app.get("/orders/:address", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const agent = await client
            .db(env.role)
            .collection("registry")
            .findOne({ address: req.params.address.toLowerCase() });
        const orders = await client
            .db(env.role)
            .collection("orders")
            .find()
            .toArray();

        const results = [];
        for (var i in orders) {
            var order = orders[i];
            const cp = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(order.charterparty);
            if (
                new ObjectID(cp.loading_port.agent).equals(
                    new ObjectID(agent._id)
                )
            ) {
                const buyer = await client
                    .db(env.role)
                    .collection("registry")
                    .findOne(order.buyer);
                order.charterparty = cp;
                order.buyer = buyer;
                results.push(order);
            }
        }
        return results;
    });
});

app.get("/orders", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const orders = await client
            .db(env.role)
            .collection("orders")
            .find()
            .toArray();

        const results = [];
        for (var i in orders) {
            var order = orders[i];
            const cp = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(order.charterparty);

            const buyer = await client
                .db(env.role)
                .collection("registry")
                .findOne(order.buyer);
            order.charterparty = cp;
            order.buyer = buyer;
            results.push(order);
        }
        return results;
    });
});

app.put("/order/:id", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    // detects string IDs and converts them to ObjectID
    var update = {};
    for (var key in req.body) {
        if (ObjectID.isValid(req.body[key])) {
            update[key] = new ObjectID(req.body[key]);
        } else {
            update[key] = req.body[key];
        }
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        return await client
            .db(env.role)
            .collection("orders")
            .updateOne({ _id: new ObjectID(req.params.id) }, { $set: update });
    });
});

app.put("/order/billOfLading/:id", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        return await client
            .db(env.role)
            .collection("orders")
            .updateOne(
                { billOfLading: new ObjectID(req.params.id) },
                { $set: req.body }
            );
    });
});

app.get("/consignee/:addressCharterparty", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const cpAddr = req.params.addressCharterparty;
        const cp = await client
            .db(env.role)
            .collection("charterparties")
            .findOne({ contract_address: cpAddr });
        const consignee = await client
            .db(env.role)
            .collection("registry")
            .findOne(cp.discharging_port.agent);
        return consignee;
    });
});

app.get("/billsOfLading/:addressAgent", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const addr = req.params.addressAgent.toLowerCase();
        const agent = await client
            .db(env.role)
            .collection("registry")
            .findOne({ address: addr });

        const query = {
            $or: [{ "signer.id": agent._id }, { consignee: agent._id }],
        };
        const blArray = await client
            .db(env.role)
            .collection("billOfLadings")
            .find(query)
            .toArray();

        for (var i in blArray) {
            const bl = blArray[i];
            const charterparty = await client
                .db(env.role)
                .collection("charterparties")
                .findOne(new ObjectID(bl.charterparty.id));
            const consignee = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.consignee.id));
            const notify_party = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(bl.notify_party.id));

            bl.charterparty = charterparty;
            bl.consignee = consignee;
            bl.notify_party = notify_party;
            bl.signer.agent = agent;
        }
        return blArray;
    });
});

app.get("/proofOfDeliveries/:addressAgent", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        const addr = req.params.addressAgent.toLowerCase();
        const agent = await client
            .db(env.role)
            .collection("registry")
            .findOne({ address: addr });

        const podArray = await client
            .db(env.role)
            .collection("proofOfDeliveries")
            .find({ consignee: new ObjectID(agent._id) })
            .toArray();

        for (var i in podArray) {
            const pod = podArray[i];
            const bol = await client
                .db(env.role)
                .collection("billOfLadings")
                .findOne(new ObjectID(pod.billOfLading));
            const shipowner = await client
                .db(env.role)
                .collection("registry")
                .findOne(new ObjectID(pod.shipowner));

            pod.billOfLading = bol;
            pod.consignee = agent;
            pod.shipowner = shipowner;
        }
        return podArray;
    });
});

app.post("/billOfLading", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        var data = req.body;
        data.charterparty = new ObjectID(req.body.charterparty);
        data.consignee = new ObjectID(req.body.consignee);
        data.notify_party.id = new ObjectID(req.body.notify_party.id);
        data.signer.id = new ObjectID(req.body.signer.id);

        return await client
            .db(env.role)
            .collection("billOfLadings")
            .insertOne(data);
    });
});

app.post("/proofOfDelivery", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        var data = req.body;
        data.billOfLading = new ObjectID(req.body.billOfLading);
        data.consignee = new ObjectID(req.body.consignee);
        data.shipowner = new ObjectID(req.body.shipowner);

        return await client
            .db(env.role)
            .collection("proofOfDeliveries")
            .insertOne(data);
    });
});

app.put("/proofOfDelivery/:id", async (req, res) => {
    if (!(await coreBroker.handlePermission(didAuth, req, res))) {
        return;
    }

    await coreBroker.doWithErrorHandling(res, async (client) => {
        var update = {};
        update["$set"] = req.body;

        return await client
            .db(env.role)
            .collection("proofOfDeliveries")
            .updateOne({ _id: new ObjectID(req.params.id) }, update);
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
            if ("shipowner.signature" in next.updateDescription.updatedFields) {
                logger.debug(
                    "charterparty/update: %o",
                    next.updateDescription.updatedFields
                );
                var update = next.updateDescription.updatedFields;
                var event = "sign_charterparty";

                for (var client in sseClients) {
                    sseClients[client].write(
                        `event: ${event}\ndata: ${JSON.stringify(
                            next.fullDocument
                        )}\n\n`
                    );
                }
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
            if (next.updateDescription) {
                if ("deposited" in next.updateDescription.updatedFields) {
                    var event = "deposit_billOfLading";

                    for (var client in sseClients) {
                        sseClients[client].write(
                            `event: ${event}\ndata: ${JSON.stringify(
                                next.fullDocument
                            )}\n\n`
                        );
                    }
                }
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
