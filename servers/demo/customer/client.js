const mongo = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
const fetch = require("node-fetch");
var express = require("express");
var cors = require("cors");

var util = require("../../tda-core/tda-util");
var env = require("./variables");

const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;

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

const logger = util.getLogger("customer", util.colors.YELLOW);

/**
 * REST implementation
 */
var app = express();
app.use(express.json());
app.use(cors());

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

app.get("/abiList", async (req, res) => {
    res.status(200).send({
        billOfLading: env.contracts.billOfLading,
        proofOfDeliveries: env.contracts.proofOfDelivery,
        oracle: env.contracts.oracle,
        didRegistry: env.contracts.did_registry,
        ensRegistry: env.contracts.ens,
        ensResolver: env.contracts.resolver,
    });
});

app.get("/deliveries", async (req, res) => {
    await doWithErrorHandling(res, async (client) => {
        return await client
            .db(env.role)
            .collection("deliveries")
            .find()
            .toArray();
    });
});

app.put("/deliveries/:id", async (req, res) => {
    await doWithErrorHandling(res, async (client) => {
        var delivery = await client
            .db(env.role)
            .collection("deliveries")
            .findOne({ _id: new ObjectID(req.params.id) });

        notify({
            name: "Verified",
            body: `> Verified merkleroots of BillOfLading (${delivery.billOfLading}) and ProofOfDelivery (${delivery.proofOfDelivery})\n`,
        });
        return await client
            .db(env.role)
            .collection("deliveries")
            .updateOne(
                { _id: new ObjectID(req.params.id) },
                { $set: req.body }
            );
    });
});

app.post("/delivery", async (req, res) => {
    await doWithErrorHandling(res, async (client) => {
        return await client
            .db(env.role)
            .collection("deliveries")
            .insertOne(req.body);
    });
});

function notify(notification) {
    for (var c in sseClients) {
        sseClients[c].write(`data: ${JSON.stringify(notification)}\n\n`);
    }
}

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
        //console.log("error", error);
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

app.listen(env.client.port, env.client.host);
logger.info(`running at ${env.client.host}:${env.client.port}`);
