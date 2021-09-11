const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const Web3 = require("web3");
const namehash = require("eth-ens-namehash").hash;
const os = require("os");
var IP = os.networkInterfaces()["wlp2s0"][0].address;

const MerkleTree = require("merkletreejs").MerkleTree;
const keccak256 = require("keccak256").keccak256;

const accounts = require("../data/accounts.json");
const charterparties = require("../data/charterparties.json");
const registry = require("../data/registry.json");
const orders = require("../data/orders.json");
const billsOfLading = require("../data/billOfLadings.json");
const proofOfDeliveries = require("../data/proofOfDeliveries.json");
const deliveries = require("../data/deliveries.json");
const jp = require("jsonpath");

const env = require("./env");
const envCharterer = require("./charterer/variables");
const envShipowner = require("./shipowner/variables");
const envCustomer = require("./customer/variables");

const gas = 5000000;
const funds = 100000000;
let web3 = new Web3(env.ethereumUri);

function getPubKey(val) {
    if (typeof val === "string") {
        return web3.eth.accounts.privateKeyToAccount("0x" + val).address;
    } else {
        return web3.eth.accounts.privateKeyToAccount("0x" + val.privateKey)
            .address;
    }
}

function getAddress(tx) {
    return tx.logs[0].args._address;
}

async function testDIDService(address) {
    const Resolver = require("did-resolver").Resolver;
    const getResolver = require("ethr-did-resolver").getResolver;
    const config = {
        networks: [
            {
                name: "development",
                rpcUrl: "http://0.0.0.0:8545",
                registry: env.contracts.did_registry.address,
            },
        ],
    };

    var resolver = new Resolver(getResolver(config));
    var did = await resolver.resolve(`did:ethr:development:${address}`);
    return did;
}

async function step5(envs) {
    // 1 - create registry
    for (var i in envs) {
        var e = envs[i];
        var reg = registry.find(
            (reg) =>
                reg.role == e.role &&
                (reg.address === "" || reg.address == null)
        );
        reg._id = new ObjectID(reg._id["$oid"]);
        reg.address = e.address.toLowerCase();
        reg.domain = e.domain;
        if ("privateKey" in e) {
            reg.privateKey = e.privateKey;
        }
        if (e.delegatable != null) {
            reg.delegatable = e.delegatable;
        }
    }

    var client = await mongo.connect(env.dbUri, {
        useUnifiedTopology: true,
    });

    await client.db(envCustomer.role).collection("deliveries").deleteMany();
    await client
        .db(envCustomer.role)
        .collection("deliveries")
        .insertMany(deliveries);

    await client.db(envShipowner.role).collection("credentials").deleteMany();

    await client.db(envCharterer.role).collection("registry").deleteMany();
    await client.db(envShipowner.role).collection("registry").deleteMany();

    await client.db(envCustomer.role).collection("registry").deleteMany();

    await client
        .db(envCharterer.role)
        .collection("registry")
        .insertMany(registry);

    await client
        .db(envShipowner.role)
        .collection("registry")
        .insertMany(registry);

    await client
        .db(envCustomer.role)
        .collection("registry")
        .insertMany(registry);

    // 2 - create charterparties
    var oracle = env.contracts.oracle.address;
    for (var i in charterparties) {
        var item = charterparties[i];
        item._id = new ObjectID(item._id["$oid"]);
        item.charterer.id = new ObjectID(item.charterer.id["$oid"]);
        item.shipowner.id = new ObjectID(item.shipowner.id["$oid"]);
        item.loading_port.agent = new ObjectID(item.loading_port.agent["$oid"]);
        item.discharging_port.agent = new ObjectID(
            item.discharging_port.agent["$oid"]
        );
        item.oracle_address = oracle;

        var objects = jp.query(item, "$..[?(@.value)]");
        for (var o in objects) {
            var obj = objects[o];
            obj.hash = web3.utils.soliditySha3(obj.value);
        }
    }

    await client
        .db(envCharterer.role)
        .collection("charterparties")
        .deleteMany();
    await client
        .db(envShipowner.role)
        .collection("charterparties")
        .deleteMany();

    await client
        .db(envCharterer.role)
        .collection("charterparties")
        .insertMany(charterparties);

    await client
        .db(envShipowner.role)
        .collection("charterparties")
        .insertMany(charterparties);

    // 2 - create B/L list
    for (var bl of billsOfLading) {
        bl._id = new ObjectID(bl._id["$oid"]);
        bl.charterparty = new ObjectID(bl.charterparty["$oid"]);
        bl.consignee = new ObjectID(bl.consignee["$oid"]);
        bl.notify_party.id = new ObjectID(bl.notify_party.id["$oid"]);
        bl.signer.id = new ObjectID(bl.signer.id["$oid"]);
    }

    await client.db(envCharterer.role).collection("billOfLadings").deleteMany();
    await client.db(envShipowner.role).collection("billOfLadings").deleteMany();
    await client
        .db(envCharterer.role)
        .collection("billOfLadings")
        .insertMany(billsOfLading);
    await client
        .db(envShipowner.role)
        .collection("billOfLadings")
        .insertMany(billsOfLading);

    // 2- create PoD list
    for (var pod of proofOfDeliveries) {
        pod._id = new ObjectID(pod._id["$oid"]);
        pod.billOfLading = new ObjectID(pod.billOfLading["$oid"]);
        pod.consignee = new ObjectID(pod.consignee["$oid"]);
        pod.shipowner = new ObjectID(pod.shipowner["$oid"]);
    }

    await client
        .db(envCharterer.role)
        .collection("proofOfDeliveries")
        .deleteMany();
    await client
        .db(envShipowner.role)
        .collection("proofOfDeliveries")
        .deleteMany();
    await client
        .db(envCharterer.role)
        .collection("proofOfDeliveries")
        .insertMany(proofOfDeliveries);
    await client
        .db(envShipowner.role)
        .collection("proofOfDeliveries")
        .insertMany(proofOfDeliveries);

    await client.db(envCharterer.role).collection("orders").deleteMany();

    var _orders = [];
    for (var i in orders) {
        var order = orders[i];
        order.charterparty = new ObjectID(order.charterparty["$oid"]);
        order.buyer = new ObjectID(order.buyer["$oid"]);
        if (order.billOfLading !== "null") {
            order.billOfLading = new ObjectID(order.billOfLading["$oid"]);
        }
        _orders.push(order);
    }

    await client.db(envCharterer.role).collection("orders").insertMany(_orders);

    await client.close();
}

async function step6(charterparty, contract, client) {
    var hashes = jp.query(charterparty, "$..hash");
    var merkleTree = new MerkleTree(hashes, keccak256, {
        hashLeaves: false,
        sortPairs: true,
    });
    var root = merkleTree.getHexRoot();

    await contract.methods
        .init(
            env.contracts.oracle.address,
            charterparty.charterer.id.delegatable,
            charterparty.shipowner.id.delegatable,
            charterparty.loading_port.agent.address,
            charterparty.discharging_port.agent.address
        )
        .send({ from: envCharterer.address, gas });

    await contract.methods
        .initialize(
            root,
            charterparty.fine,
            charterparty.max_moisture_level.hash,
            charterparty.laytime.hash
        )
        .send({ from: envCharterer.address, gas });

    function sign(privateKey, contractAddress) {
        var account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
        var hash = web3.utils.soliditySha3({
            t: "bytes",
            v: contractAddress,
        });
        return account.sign(hash).signature;
    }

    await contract.methods
        .submitSignature(
            sign(envCharterer.privateKey, contract.options.address)
        )
        .send({ from: envCharterer.address, gas });

    await contract.methods
        .submitSignature(
            sign(envShipowner.privateKey, contract.options.address)
        )
        .send({ from: envShipowner.address, gas });

    var update = {
        "charterer.signature": sign(
            envCharterer.privateKey,
            contract.options.address
        ),
        "shipowner.signature": sign(
            envShipowner.privateKey,
            contract.options.address
        ),
        contract_address: contract.options.address,
    };

    await client
        .db(envCharterer.role)
        .collection("charterparties")
        .updateOne({ _id: new ObjectID(charterparty._id) }, { $set: update });
}

async function deployCharterparty() {
    var factory = new web3.eth.Contract(
        env.contracts.factory.abi,
        env.contracts.factory.address
    );
    var tx = await factory.methods.createCharterparty().send({
        from: envCharterer.address,
        gas,
    });
    var addr = tx.events.CreatedCharterparty.returnValues._address;
    return new web3.eth.Contract(env.contracts.charterparty.abi, addr);
}

async function init() {
    try {
        const didReg = new web3.eth.Contract(
            env.contracts.did_registry.abi,
            env.contracts.did_registry.address
        );

        const envIdm = {
            address: getPubKey(env.idm.key),
            privateKey: env.idm.key,
            role: "idm",
            domain: "idm",
        };

        const envPortAgent1 = {
            address: getPubKey(env.pa1_key),
            privateKey: env.pa1_key,
            role: "port agent",
            domain: "port-agency-duisburg",
        };

        const envPortAgent2 = {
            address: getPubKey(env.pa2_key),
            privateKey: env.pa2_key,
            role: "port agent",
            domain: "port-agency-koblenz",
        };

        const envMaster = {
            address: getPubKey(env.master_key),
            privateKey: env.master_key,
            role: "master",
            domain: "master",
        };

        const envTrader = {
            address: getPubKey(env.trader_key),
            privateKey: env.trader_key,
            role: "trader",
            domain: "charterer",
        };

        envCharterer.address = getPubKey(envCharterer);
        envShipowner.address = getPubKey(envShipowner);
        envCustomer.address = getPubKey(envCustomer);

        /**************************************************************************

        1 - create Delegatable shipowner & charterer ******************************

        **************************************************************************/
        console.log("1 - create Delegatable shipowner & charterer");

        var tld = "eth";

        var delegatableCharterer;
        var delegatableShipowner;

        var delegatableFactory = new web3.eth.Contract(
            env.contracts.delegatableFactory.abi,
            env.contracts.delegatableFactory.address
        );

        var tx = await delegatableFactory.methods
            .createDelegatable()
            .send({ from: envCharterer.address, gas });

        delegatableCharterer = new web3.eth.Contract(
            env.contracts.delegatable.abi,
            tx.events.CreatedDelegatable.returnValues._address
        );

        tx = await delegatableFactory.methods
            .createDelegatable()
            .send({ from: envShipowner.address, gas });

        delegatableShipowner = new web3.eth.Contract(
            env.contracts.delegatable.abi,
            tx.events.CreatedDelegatable.returnValues._address
        );

        // set addresses
        envCharterer.delegatable = delegatableCharterer.options.address;
        envShipowner.delegatable = delegatableShipowner.options.address;

        /**************************************************************************

        2 - register domains ******************************************************

        **************************************************************************/
        console.log("2 - register domains");

        const ensOwner = Object.keys(accounts.addresses)[0];
        const tldOwner = ensOwner;

        web3.eth.ens.registryAddress = env.contracts.ens.address;
        var resolver = await web3.eth.ens.getResolver("eth");

        // charterer subdomain
        await web3.eth.ens.setSubnodeOwner(
            tld,
            web3.utils.sha3(envCharterer.domain),
            envCharterer.delegatable,
            { from: tldOwner, gas }
        );

        var nodeSubdomain = `${envCharterer.domain}.${tld}`;
        await resolver.methods
            .setAddr(namehash(nodeSubdomain), envCharterer.delegatable)
            .send({ from: tldOwner });
        await delegatableCharterer.methods
            .setDomain(namehash(nodeSubdomain))
            .send({ from: envCharterer.address });

        // shipowner subdomain
        await web3.eth.ens.setSubnodeOwner(
            tld,
            web3.utils.sha3(envShipowner.domain),
            envShipowner.delegatable,
            { from: tldOwner, gas }
        );

        nodeSubdomain = `${envShipowner.domain}.${tld}`;
        await resolver.methods
            .setAddr(namehash(nodeSubdomain), envShipowner.delegatable)
            .send({ from: tldOwner });
        await delegatableShipowner.methods
            .setDomain(namehash(nodeSubdomain))
            .send({ from: envShipowner.address });

        // port agent 1 subdomain
        await web3.eth.ens.setSubnodeOwner(
            tld,
            envPortAgent1.domain,
            envPortAgent1.address,
            { from: tldOwner, gas }
        );
        nodeSubdomain = `${envPortAgent1.domain}.eth`;
        await resolver.methods
            .setAddr(namehash(nodeSubdomain), envPortAgent1.address)
            .send({ from: tldOwner });

        // port agent 2 subdomain
        await web3.eth.ens.setSubnodeOwner(
            tld,
            envPortAgent2.domain,
            envPortAgent2.address,
            { from: tldOwner, gas }
        );
        nodeSubdomain = `${envPortAgent2.domain}.eth`;
        await resolver.methods
            .setAddr(namehash(nodeSubdomain), envPortAgent2.address)
            .send({ from: tldOwner });

        // buyer subdomain
        await web3.eth.ens.setSubnodeOwner(
            tld,
            envCustomer.domain,
            envCustomer.address,
            {
                from: tldOwner,
                gas,
            }
        );
        nodeSubdomain = `${envCustomer.domain}.eth`;
        await resolver.methods
            .setAddr(namehash(nodeSubdomain), envCustomer.address)
            .send({ from: tldOwner });

        /**************************************************************************

        3 - register oracle & broker services to did-documents ********************

        **************************************************************************/
        console.log("3 - register oracle & broker services to did-documents");

        var orclCharterer = `http://${IP}:${envCharterer.oracle.port}`;
        var brokerCharterer = `http://${IP}:${envCharterer.broker.port}`;

        var orclShipowner = `http://${IP}:${envShipowner.oracle.port}`;
        var brokerShipowner = `http://${IP}:${envShipowner.broker.port}`;

        await delegatableCharterer.methods
            .addOracle(orclCharterer)
            .send({ from: envCharterer.address });

        await delegatableCharterer.methods
            .addBroker(brokerCharterer)
            .send({ from: envCharterer.address });

        await delegatableShipowner.methods
            .addOracle(orclShipowner)
            .send({ from: envShipowner.address });

        await delegatableShipowner.methods
            .addBroker(brokerShipowner)
            .send({ from: envShipowner.address });

        //var did = await testDIDService(envShipowner.delegatable);

        /**************************************************************************

        4 - add delegates & give authorizations

        **************************************************************************/
        console.log("4 - add delegates & give authorizations");

        await delegatableCharterer.methods
            .addDelegates([envPortAgent1.address, envPortAgent2.address])
            .send({ from: envCharterer.address, gas });

        await delegatableShipowner.methods
            .addDelegates([envPortAgent1.address, envPortAgent2.address])
            .send({ from: envShipowner.address, gas });

        var tx = await delegatableShipowner.methods
            .addNamedDelegate(envMaster.address, web3.utils.sha3("master"))
            .send({ from: envShipowner.address, gas });

        await delegatableShipowner.methods
            .authorizePayer(envMaster.address)
            .send({ from: envShipowner.address, gas });

        // transfer funds to delegatableShipowner
        await delegatableShipowner.methods
            .transferFunds()
            .send({ from: envShipowner.address, value: funds, gas });

        /**************************************************************************

        5 - register users to charterer's and shipowners db ***********************

        **************************************************************************/
        console.log("5 - register users to charterers and shipowners db");

        var envs = [
            envCharterer,
            envShipowner,
            envCustomer,
            envPortAgent1,
            envPortAgent2,
            envMaster,
            envIdm,
            envTrader,
        ];

        await step5(envs);

        /**************************************************************************

        6 - deploy and sign charterparty ******************************************

        **************************************************************************/
        console.log("6 - deploying & signing charterparty");

        var client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });

        var coll = await client
            .db(envCharterer.role)
            .collection("charterparties")
            .find()
            .toArray();

        var charterparty = coll[0];

        charterparty.charterer.id = await client
            .db(envCharterer.role)
            .collection("registry")
            .findOne({ _id: new ObjectID(charterparty.charterer.id) });
        charterparty.shipowner.id = await client
            .db(envCharterer.role)
            .collection("registry")
            .findOne({ _id: new ObjectID(charterparty.shipowner.id) });
        charterparty.loading_port.agent = await client
            .db(envCharterer.role)
            .collection("registry")
            .findOne({ _id: new ObjectID(charterparty.loading_port.agent) });
        charterparty.discharging_port.agent = await client
            .db(envCharterer.role)
            .collection("registry")
            .findOne({
                _id: new ObjectID(charterparty.discharging_port.agent),
            });

        var contract = await deployCharterparty();
        await step6(charterparty, contract, client);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(1);
    }
}

init();
