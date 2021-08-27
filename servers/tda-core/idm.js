const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const namehash = require("eth-ens-namehash").hash;

module.exports = async function (env, app, web3, logger) {
    const account = web3.eth.accounts.privateKeyToAccount(env.idm.key);
    const config = {
        networks: [
            {
                name: "development",
                rpcUrl: `http${env.ethereumUri.substr(2)}`,
                registry: env.contracts.did_registry.address,
            },
        ],
    };
    const resolver = new Resolver(getResolver(config));

    app.get("/", (req, res) => {
        res.sendFile(__dirname + "/build/index.html");
    });

    /**
     * Dynamically serves files from reacts build directory
     */
    var nextPathCss = "static/css";
    var p = path.join(__dirname, "build", nextPathCss);
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
    var p2 = path.join(__dirname, "build", nextPathJs);
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

    const nonces = {};
    const tokens = {};

    app.get("/challenge/:address", async (req, res) => {
        var nonce = web3.utils.randomHex(16);
        nonces[req.params.address] = nonce;
        res.status(200).send({ nonce });
    });

    // query: address, signature, broker-ens
    app.get("/authenticate", async (req, res) => {
        var notification = { name: "GET /authenticate", body: "" };

        var message = web3.eth.accounts.hashMessage(nonces[req.query.address]);
        var recoveredSigner = await web3.eth.accounts.recover(
            message,
            req.query.signature
        );

        delete nonces[req.query.address];

        if (recoveredSigner !== req.query.address) {
            res.status(500).send({ error: "Signature does not match" });
            notification.body +=
                "> response status: 500, Signature does not match\n";
            notify(notification);
            return;
        }
        notification.body += "> verified signature\n";

        // 1 - resolve broker address
        var broker = req.query.broker;
        // retrieves all node domains in hierarchy except for the leaf itself
        var domain = broker.substr(broker.indexOf(".") + 1);
        var contractResolver;
        try {
            contractResolver = await web3.eth.ens.getResolver(domain);
        } catch (error) {
            logger.info("transaction out of sync. Making dummy request..");
            // library is buggy: make a dummy request to sync nodes
            var dummy = new web3.eth.Contract(
                env.contracts.dummy.abi,
                env.contracts.dummy.address
            );
            await dummy.methods.dummy().send({ from: account.address });

            contractResolver = await web3.eth.ens.getResolver(domain);
        }

        var address = await contractResolver.methods
            .addr(namehash(broker))
            .call();

        //console.log("resolved address", address);
        logger.debug(`resolved address ${address}`);

        const addrZero = "0x0000000000000000000000000000000000000000";
        if (address == addrZero) {
            res.status(500).send({ error: "Address could not be resolved" });
            notification.body += `> response status 500, broker domain could not be resolved\n`;
            notify(notification);
            return;
        }

        notification.body += `> resolved broker domain to ${address}\n`;

        // 2 - resolve broker did and get service
        var did = await resolver.resolve(`did:ethr:development:${address}`);

        var brokers = did.didDocument.service.filter(
            (service) => service.type === "broker"
        );
        var broker = brokers[brokers.length - 1];

        notification.body += `> resolved did-document\n`;
        notification.body += `> fetched brokers service-endpoint: '${broker.serviceEndpoint}'\n`;

        // 3 - make fetch request to service
        // first time IDM makes a request to broker
        if (!(address in tokens)) {
            // idm authenticates itself to broker first
            var authenticated = await authenticateSelfToBroker(broker, address);
            if (!authenticated) {
                res.status(500).send({
                    error: "IDM does not have brokers authorization to authenticate",
                });
                notification.body += `> response status 500, challenge-response to '${broker.serviceEndpoint}' failed\n`;
                notify(notification);
                return;
            }
            notification.body += `> performed challenge-response to '${broker.serviceEndpoint}'\n`;
        }

        var response = await authorize(broker, address, req.query.address);
        if (response.status == 511) {
            // token expired
            // renews existing token
            var authenticated = await authenticateSelfToBroker(broker, address);
            if (!authenticated) {
                res.status(500).send({
                    error: "IDM does not have brokers authorization to authenticate",
                });
                notification.body += `> response status 500, challenge-response to '${broker.serviceEndpoint}' failed\n`;
                notify(notification);
                return;
            }
            notification.body += `> renewed token for '${broker.serviceEndpoint}'\n`;
            response = await authorize(broker, address, req.query.address);
            if (response.status == 500 || response.status == 511) {
                // 511 should theoretically not happen
                var error = await response.json();
                res.status(500).send({
                    error: "Broker refused to grant access",
                });
                return;
            }
        } else if (response.status == 500) {
            var error = await response.json();
            res.status(500).send(error);
            return;
        }
        notification.body += `> response status 200, successfully authorized user to ${broker.serviceEndpoint}\n`;
        notify(notification);

        // 4 - return token and forward to website
        var data = await response.json();
        res.status(200).send(data);
    });

    async function authenticateSelfToBroker(broker, address) {
        var resp = await fetch(
            `${broker.serviceEndpoint}/challenge/${account.address}`,
            {
                method: "get",
                mode: "cors",
            }
        );
        if (resp.status === 500 || resp.status === 404) {
            logger.warn("unexpected status in authenticateSelfToBroker()");
            //console.error("ERROR");
            return false;
        }

        var data = await resp.json();

        var hash = web3.eth.accounts.hashMessage(data.nonce);
        var sig = account.sign(hash).signature;

        resp = await fetch(
            `${broker.serviceEndpoint}/authenticate?address=${account.address}&signature=${sig}`,
            {
                method: "get",
                mode: "cors",
            }
        );

        data = await resp.json();
        if ("error" in data || data.jwt == null) {
            return false;
        }

        tokens[address] = data.jwt;
        return true;
    }

    async function authorize(broker, brokerAddress, address) {
        return await fetch(`${broker.serviceEndpoint}/authorize/${address}`, {
            method: "get",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                "DID-JWT": tokens[brokerAddress],
            },
        });
    }

    function notify(notification) {
        for (var c in sseClients) {
            sseClients[c].write(`data: ${JSON.stringify(notification)}\n\n`);
        }
    }

    async function doWithErrorHandling(res, func) {
        var client = null;
        var result;
        var error = null;
        try {
            client = await mongo.connect(env.dbUri, {
                useUnifiedTopology: true,
            });
            result = await func(client);
        } catch (err) {
            //console.error(err);
            logger.error(err);
            error = err;
        } finally {
            if (client) {
                client.close();
            }

            if (error) {
                res.status(500).send({ error });
            } else {
                res.status(200).send(result);
            }
        }
    }
};
