const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const util = require("./tda-util");

module.exports = function (env, app, didAuth, web3, logger) {
    /**************************************************************************
     ***************************** REST API ***********************************
     **************************************************************************/

    app.get("/user/:address", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            return await client
                .db(env.role)
                .collection("registry")
                .findOne({ address: req.params.address.toLowerCase() });
        });
    });

    app.get("/contract/:contract", async (req, res) => {
        await doWithErrorHandling(res, async (client) => {
            const json = require(`../../dlt/build/contracts/${req.params.contract}.json`);
            return util.readJson(json);
        });
    });

    app.get("/charterparties", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            var arr = await client
                .db(env.role)
                .collection("charterparties")
                .find()
                .toArray();

            var reg = client.db(env.role).collection("registry");
            for (var i in arr) {
                var cp = arr[i];
                var charterer = await reg.findOne(cp.charterer.id);
                var shipowner = await reg.findOne(cp.shipowner.id);
                var agent_loading = await reg.findOne(cp.loading_port.agent);
                var agent_discharging = await reg.findOne(
                    cp.discharging_port.agent
                );

                cp.charterer.id = charterer;
                cp.shipowner.id = shipowner;
                cp.loading_port.agent = agent_loading;
                cp.discharging_port.agent = agent_discharging;
            }
            return arr;
        });
    });

    app.get("/charterparties/:address", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            async function linkRoles(list) {
                for (var i in list) {
                    var item = list[i];
                    var charterer = await client
                        .db(env.role)
                        .collection("registry")
                        .findOne(new ObjectID(item.charterer.id));
                    var shipowner = await client
                        .db(env.role)
                        .collection("registry")
                        .findOne(new ObjectID(item.shipowner.id));
                    var agentLoading = await client
                        .db(env.role)
                        .collection("registry")
                        .findOne(new ObjectID(item.loading_port.agent));
                    var agentDischarging = await client
                        .db(env.role)
                        .collection("registry")
                        .findOne(new ObjectID(item.discharging_port.agent));

                    item.charterer.id = charterer;
                    item.shipowner.id = shipowner;
                    item.loading_port.agent = agentLoading;
                    item.discharging_port.agent = agentDischarging;
                }
                return list;
            }

            const res = await client
                .db(env.role)
                .collection("registry")
                .findOne({ address: req.params.address.toLowerCase() });
            var role = res.role;
            if (role === "charterer" || role === "shipowner") {
                var list = await client
                    .db(env.role)
                    .collection("charterparties")
                    .find()
                    .toArray();
                return await linkRoles(list);
            } else {
                var query = {
                    $or: [
                        { "loading_port.agent": res._id },
                        { "discharging_port.agent": res._id },
                    ],
                    "charterer.signature": {
                        $ne: "null",
                    },
                    "shipowner.signature": {
                        $ne: "null",
                    },
                };
                var list = await client
                    .db(env.role)
                    .collection("charterparties")
                    .find(query)
                    .toArray();
                return await linkRoles(list);
            }
        });
    });

    app.get("/registry", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            return await client
                .db(env.role)
                .collection("registry")
                .find()
                .toArray();
        });
    });

    app.get("/registry/:role", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            return await client
                .db(env.role)
                .collection("registry")
                .find({ role: req.params.role })
                .toArray();
        });
    });

    app.get("/abiList", async (req, res) => {
        result = {
            factory: env.contracts.factory,
            oracle: env.contracts.oracle,
            charterparty: env.contracts.charterparty,
            billOfLading: env.contracts.billOfLading,
            proofOfDelivery: env.contracts.proofOfDelivery,
            delegatable: env.contracts.delegatable,
        };
        res.status(200).send(result);
    });

    app.put("/charterparty/:id", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            var update = {};
            update["$set"] = req.body;
            var coll = client.db(env.role).collection("charterparties");
            return await coll.updateOne(
                { _id: new ObjectID(req.params.id) },
                update
            );
        });
    });

    app.put("/billOfLading/:id", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            var update = {};
            update["$set"] = req.body;

            return await client
                .db(env.role)
                .collection("billOfLadings")
                .updateOne({ _id: new ObjectID(req.params.id) }, update);
        });
    });

    app.post("/proofs", async (req, res) => {
        if (!(await handlePermission(didAuth, req, res))) {
            return;
        }

        await doWithErrorHandling(res, async (client) => {
            return await client
                .db(env.role)
                .collection("proofs")
                .insertOne(req.body);
        });
    });

    /**************************************************************************
     *************************** Authentication *******************************
     **************************************************************************/

    nonces = {};
    const validity = 60 * 60 * 24 * 30;

    // query:
    app.get("/challenge/:address", async (req, res) => {
        var nonce = web3.utils.randomHex(16);
        nonces[req.params.address] = nonce;
        res.status(200).send({ nonce });
    });

    app.get("/authenticate", async (req, res) => {
        await doWithErrorHandling(res, async (client) => {
            var message = web3.eth.accounts.hashMessage(
                nonces[req.query.address]
            );
            var recoveredSigner = await web3.eth.accounts.recover(
                message,
                req.query.signature
            );

            delete nonces[req.query.address];

            if (recoveredSigner !== req.query.address) {
                throw { error: "Signature does not match" };
            }

            // check if IDM is known to the database
            var idm = await client
                .db(env.role)
                .collection("registry")
                .findOne({ address: req.query.address.toLowerCase() });

            if (!idm) {
                throw { error: "User does not exist in brokers system" };
            }

            var jwt = await didAuth.issueToken(req.query.address, validity);
            return { jwt };
        });
    });

    app.get("/authorize/:address", async (req, res) => {
        var jwt = req.get(didAuth.tokenHeader);
        if (jwt == null) {
            res.status(500).send({ error: "Token is missing" });
            return;
        }

        if (!(await didAuth.isTokenValid(jwt))) {
            // token expired
            res.status(511).send({ error: "Token expired or not valid" });
            return;
        }

        var client;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            var user = await client
                .db(env.role)
                .collection("registry")
                .findOne({ address: req.params.address.toLowerCase() });

            if (user == null) {
                throw { error: "User does not exist in brokers system" };
            }

            var jwt = await didAuth.issueToken(req.query.address, validity);
            res.status(200).send({ jwt, brokerUrl: env.broker.client });
        } catch (error) {
            if (error.error != null) {
                error = error.error;
            }
            res.status(500).send({ error });
        } finally {
            if (client) {
                await client.close();
            }
        }
    });

    /**************************************************************************
     ***************************** Functions **********************************
     **************************************************************************/

    /**
     * Helper function, which processes requests with error handling.
     * @param {callback function} func
     */
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

    /**
     * Checks whether incoming request is permitted, if not handles rejection.
     *
     * @param {*} didAuth
     * @param {*} req
     * @param {*} res
     * @returns true if permission was given, otherwise false
     */
    async function handlePermission(didAuth, req, res) {
        var jwt = req.get(didAuth.tokenHeader);
        if (!jwt) {
            res.status(500).send({ error: "Token is missing" });
            return false;
        }
        if (jwt == "test_token") {
            return true;
        }
        if (!(await didAuth.isTokenValid(jwt))) {
            didAuth.reject(res);
            logger.debug("rejecting request");
            return false;
        }
        return true;
    }

    /**
     * Dynamically serves files from reacts build directory
     */
    function dynamicallyServeWebsite(currentDir) {
        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname + "/build/index.html"));
        });

        var nextPathCss = "static/css";
        var p = path.join(currentDir, "build", nextPathCss);
        fs.readdir(p, (err, files) => {
            if (err) {
                return;
            }
            files.forEach((file) => {
                app.get(`/${nextPathCss}/${file}`, (req, res) => {
                    res.sendFile(`${p}/${file}`);
                });
            });
        });

        var nextPathJs = "static/js";
        var p2 = path.join(currentDir, "build", nextPathJs);
        fs.readdir(p2, (err, files) => {
            if (err) {
                return;
            }
            files.forEach((file) => {
                app.get(`/${nextPathJs}/${file}`, (req, res) => {
                    res.sendFile(`${p2}/${file}`);
                });
            });
        });
    }

    return {
        handlePermission,
        dynamicallyServeWebsite,
        doWithErrorHandling,
    };
};
