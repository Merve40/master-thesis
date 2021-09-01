const mongo = require("mongodb").MongoClient;
const fetch = require("node-fetch");
const Web3 = require("web3");
const jp = require("jsonpath");
const MerkleTree = require("merkletreejs").MerkleTree;
const keccak256 = require("keccak256").keccak256;

const EthrDID = require("ethr-did").EthrDID;
const {
    Issuer,
    JwtCredentialPayload,
    createVerifiableCredentialJwt,
    JwtPresentationPayload,
    createVerifiablePresentationJwt,
    verifyCredential,
    verifyPresentation,
} = require("did-jwt-vc");
const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;
const ES256KSigner = require("did-jwt").ES256KSigner;

const env = require("../env");

const gas = 5000000;
const web3 = new Web3(env.ethereumUri);

const broker = "http://192.168.178.24:8787";
const abiList = env.contracts;

async function Deployer(account) {
    const database = db();
    const _smartContract = smartContract(account);

    async function deployBillOfLading(BL, charterpartyAddress) {
        var name = `BL_${Date.now()}`;
        var billOfLading = database.createBillOfLading(name, BL);
        var contract = await _smartContract.deployBillOfLading(
            billOfLading,
            charterpartyAddress
        );
        billOfLading.contract_address = contract.options.address;
        var result = await post(broker, "/billOfLading", billOfLading);
        var data = await result.json();
        billOfLading._id = data.insertedId;
        return billOfLading;
    }

    async function deployProofOfDelivery(POD) {
        var name = `POD_${Date.now()}`;
        var proofOfDelivery = database.createProofOfDelivery(name, POD);
        var contract = await _smartContract.deployProofOfDelivery(
            proofOfDelivery,
            POD.billOfLading
        );
        proofOfDelivery.contract_address = contract.options.address;
        var result = await post(broker, "/proofOfDelivery", proofOfDelivery);
        var data = await result.json();
        proofOfDelivery._id = data.insertedId;
        return proofOfDelivery;
    }

    return {
        deployBillOfLading,
        deployProofOfDelivery,
    };
}

function smartContract(account) {
    const factory = new web3.eth.Contract(
        abiList.factory.abi,
        abiList.factory.address
    );

    const methods = [
        ["createBillOfLading", abiList.billOfLading.abi, "CreatedBillOfLading"],
        [
            "createProofOfDelivery",
            abiList.proofOfDelivery.abi,
            "CreatedProofOfDelivery",
        ],
    ];

    async function deployBillOfLading(billOfLading, charterpartyAddress) {
        var hashes = jp.query(billOfLading, "$..hash");
        var merkleTree = merkle(hashes);
        var root = merkleTree.getHexRoot();

        var contract = await get(methods[0]);
        await contract.methods
            .init(abiList.oracle.address, charterpartyAddress)
            .send({ from: account.address, gas });

        await contract.methods
            .initialize(
                root,
                billOfLading.date.hash,
                billOfLading.cargo.weight.hash,
                billOfLading.cargo.moisture_level.hash
            )
            .send({ from: account.address, gas });

        //save proof to db
        await post(broker, "/proofs", { merkleroot: root, leafs: hashes });

        return contract;
    }

    async function deployProofOfDelivery(proofOfDelivery, billOfLading) {
        var hashes = jp.query(proofOfDelivery, "$..hash");
        var merkleTree = merkle(hashes);
        var root = merkleTree.getHexRoot();

        var contract = await get(methods[1]);
        await contract.methods
            .init(
                abiList.oracle.address,
                billOfLading.contract_address,
                root,
                proofOfDelivery.cargo.weight.hash,
                proofOfDelivery.cargo.moisture_level.hash,
                proofOfDelivery.time_delivery.hash
            )
            .send({ from: account.address, gas });

        //save proof to db
        await post(broker, "/proofs", { merkleroot: root, leafs: hashes });

        return contract;
    }

    async function get(method) {
        var tx = await factory.methods[method[0]]().send({
            from: account.address,
            gas,
        });
        var addr = tx.events[method[2]].returnValues._address;
        return new web3.eth.Contract(method[1], addr);
    }

    return {
        deployBillOfLading,
        deployProofOfDelivery,
    };
}

function db() {
    function createBillOfLading(name, BL) {
        var date = Date.now();

        var obj = {
            name,
            contract_address: "null",
            charterparty: BL.charterparty._id,
            vessel_id: {
                value: BL.vesselId,
                hash: hash(BL.vesselId),
            },
            consignee: BL.consignee._id,
            notify_party: {
                id: BL.notifyParty._id,
                value: BL.notifyParty.contact,
                hash: hash(BL.notifyParty.contact),
            },
            cargo: {
                description: {
                    value: BL.cargo.description,
                    hash: hash(BL.cargo.description),
                },
                moisture_level: {
                    value: BL.cargo.moisture_level,
                    hash: hash(BL.cargo.moisture_level),
                },
                nutrition_levels: {
                    details: {
                        calories: BL.cargo.nutrition.calories,
                        protein: BL.cargo.nutrition.protein,
                        carbs: BL.cargo.nutrition.carbs,
                        sugar: BL.cargo.nutrition.sugar,
                        fiber: BL.cargo.nutrition.fiber,
                        fat: BL.cargo.nutrition.fat,
                    },
                    value: "null",
                    hash: "null",
                },
                weight: {
                    value: BL.cargo.weight,
                    hash: hash(BL.cargo.weight),
                },
            },
            port: {
                value: BL.place,
                hash: hash(BL.place),
            },
            date: {
                value: date,
                hash: hash(date),
            },
            signer: {
                id: BL.agent._id,
                signature: "null",
                on_behalf_of: "charterer",
            },
            issued: false,
            deposited: false,
        };

        //aggregates nutrition-levels
        var summary = "";
        var keys = Object.keys(obj.cargo.nutrition_levels.details);
        for (var k in keys) {
            summary +=
                keys[k] +
                ":" +
                obj.cargo.nutrition_levels.details[keys[k]] +
                ",";
        }
        obj.cargo.nutrition_levels.value = summary;
        obj.cargo.nutrition_levels.hash = hash(summary);
        return obj;
    }

    function createProofOfDelivery(name, POD) {
        const obj = {
            name,
            contract_address: "null",
            billOfLading: POD.billOfLading._id,
            consignee: POD.consignee,
            shipowner: POD.shipowner,
            signature: "null",
            time_delivery: {
                value: POD.time_delivery,
                hash: hash(POD.time_delivery),
            },
            port: {
                value: POD.port,
                hash: hash(POD.port),
            },
            cargo: {
                weight: {
                    value: POD.cargo.weight,
                    hash: hash(POD.cargo.weight),
                },
                moisture_level: {
                    value: POD.cargo.moisture_level,
                    hash: hash(POD.cargo.moisture_level),
                },
                condition: {
                    value: POD.cargo.condition,
                    hash: hash(POD.cargo.condition),
                },
            },
        };

        return obj;
    }

    return {
        createBillOfLading,
        createProofOfDelivery,
    };
}

function merkle(elements) {
    return new MerkleTree(elements, keccak256, {
        hashLeaves: false,
        sortPairs: true,
    });
}

function hash(value) {
    return web3.utils.soliditySha3(value);
}

async function put(broker, path, update) {
    return await fetch(`${broker}${path}`, {
        method: "put",
        mode: "cors",
        body: JSON.stringify(update),
        headers: {
            "Content-Type": "application/json",
            "DID-JWT": "test_token",
        },
    });
}

async function post(broker, path, obj) {
    return await fetch(`${broker}${path}`, {
        method: "post",
        mode: "cors",
        body: JSON.stringify(obj),
        headers: {
            "Content-Type": "application/json",
            "DID-JWT": "test_token",
        },
    });
}

async function get(broker, path) {
    return await fetch(`${broker}${path}`, {
        method: "get",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
            "DID-JWT": "test_token",
        },
    });
}

/**
    Helper function for handling Mongo exceptions
 */
async function tryWith(func) {
    var client;
    var result;
    try {
        client = await mongo.connect(env.dbUri, {
            useUnifiedTopology: true,
        });
        result = await func(client);
    } catch (e) {
        console.error(e);
        result = null;
    } finally {
        if (client) {
            await client.close();
        }
        return result;
    }
}

var config = null;
async function getConfig() {
    if (!config) {
        var web3Url = "ws://192.168.178.24:8545";
        var rpc = `http${web3Url.substr(2)}`;
        config = {
            networks: [
                {
                    name: "development",
                    rpcUrl: rpc,
                    registry: abiList.did_registry.address,
                },
            ],
        };
    }
    return config;
}

async function getIssuer(_signer) {
    var conf = (await getConfig()).networks[0];
    const signer = ES256KSigner(_signer.privateKey);

    const issuer = new EthrDID({
        identifier: _signer.address,
        privateKey: _signer.privateKey,
        rpcUrl: conf.rpcUrl,
        chainNameOrId: conf.name,
        registry: conf.registry,
        signer,
    });
    return issuer;
}

/**
 * Wrapper function for handling errors
 */
async function doWithErrorHandling(func) {
    try {
        return await func();
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function issue(signer, subject, date, credentialType, data) {
    return await doWithErrorHandling(async () => {
        const issuer = await getIssuer(signer);
        const vcPayload = {
            sub: subject,
            nbf: date,
            vc: {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiableCredential", credentialType],
                credentialSubject: data,
            },
        };
        return await createVerifiableCredentialJwt(vcPayload, issuer);
    });
}

module.exports = {
    issue,
    tryWith,
    get,
    post,
    put,
    Deployer,
    hash,
};
