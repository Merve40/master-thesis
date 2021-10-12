const mongo = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const fetch = require("node-fetch");
const Web3 = require("web3");
const os = require("os");
const IP = os.networkInterfaces()["wlp2s0"][0].address;
const { Deployer, post, get, put, issue, tryWith, hash } = require("./util");

const env = require("../env");
const abiList = env.contracts;
const gas = 5000000;
const web3 = new Web3(env.ethereumUri);

const portAgentA = {
    account: web3.eth.accounts.privateKeyToAccount("0x" + env.pa2_key),
};
const portAgentB = {
    account: web3.eth.accounts.privateKeyToAccount("0x" + env.pa1_key),
};
const master = {
    account: web3.eth.accounts.privateKeyToAccount("0x" + env.master_key),
};

const broker_charterer = `http://${IP}:8787`;
const broker_shipowner = `http://${IP}:9797`;

async function issueBL(charterparty) {
    console.log("1 - issueBL");
    var order = await tryWith(async (client) => {
        return (
            await client
                .db("charterer")
                .collection("orders")
                .find({ status: "open" })
                .toArray()
        )[0];
    });
    var customer = await tryWith(async (client) => {
        return await client
            .db("charterer")
            .collection("registry")
            .findOne({ role: "customer" });
    });
    var consignee = await (
        await get(
            broker_charterer,
            `/consignee/${charterparty.contract_address}`
        )
    ).json();

    var BL = {
        charterparty,
        vesselId: "722",
        notifyParty: customer,
        agent: portAgentA.user,
        consignee: consignee,
        cargo: order.cargo,
        place: "Duisburg",
    };
    BL.cargo.moisture_level = 13;
    BL.cargo.weight = 200;

    var deployer = await Deployer(portAgentA.account);
    var newBL = await deployer.deployBillOfLading(
        BL,
        charterparty.contract_address
    );
    //update order: set BL id
    put(broker_charterer, `/order/${order._id}`, { billOfLading: newBL._id });
    return newBL;
}

async function issueCredential(billOfLading) {
    console.log("2 - issueCredential");
    const credentialType = "VesselInspectionCredential";
    const payload = {
        vesselId: "722",
        carrier: "0x0..0",
        vesselCondition: "OK",
    };
    var subject = master.account.address;
    var date = Math.round(Date.now() / 1000);
    const cred = await issue(
        portAgentA.account,
        subject,
        date,
        credentialType,
        payload
    );
    //save the credentials
    const newCred = {
        issuer: portAgentA.account.address,
        subject,
        date,
        jwt: cred,
    };
    post(broker_shipowner, `/credentials`, newCred);
    return cred;
}

async function depositBL(billOfLading, credential) {
    console.log("3 - depositBL");
    var contract = new web3.eth.Contract(
        abiList.billOfLading.abi,
        billOfLading.contract_address
    );

    await contract.methods
        .submitCredential(credential)
        .send({ from: master.account.address, gas });

    var response = await get(broker_shipowner, `/registry/shipowner`);
    var data = await response.json();
    var delegatableShipowner = new web3.eth.Contract(
        abiList.delegatable.abi,
        data[0].delegatable
    );
    await delegatableShipowner.methods
        .payContractFee(billOfLading.contract_address)
        .send({ from: master.account.address, gas });

    await put(broker_shipowner, `/billOfLading/${billOfLading._id}`, {
        deposited: true,
    });
}

async function signBL(billOfLading) {
    console.log("4 - signBL");
    try {
        var signature = portAgentA.account.sign(
            hash(billOfLading.contract_address)
        ).signature;

        var contract = new web3.eth.Contract(
            abiList.billOfLading.abi,
            billOfLading.contract_address
        );

        await contract.methods
            .submitSignature(signature)
            .send({ from: portAgentA.account.address, gas });

        var response = await put(
            broker_charterer,
            `/billOfLading/${billOfLading._id}`,
            {
                "signer.signature": signature,
            }
        );
        if (response.status === 500) {
            throw { message: "Server error: could not insert signature" };
        }
    } catch (err) {
        console.error(err.message);
    }
}

async function issuePoD(charterparty, billOfLading) {
    console.log("5 - issuePoD");
    const obj = {
        billOfLading,
        consignee: portAgentB.user._id,
        shipowner: charterparty.shipowner.id,
        time_delivery: Date.now() + 60 * 60 * 1000,
        port: "Bonn",
        cargo: {
            weight: 180,
            condition: "OK",
            moisture_level: 17,
        },
        signature: "null",
    };

    try {
        var deployer = await Deployer(portAgentB.account);
        var proofOfDelivery = await deployer.deployProofOfDelivery(obj);
        // update state of BL
        await put(
            broker_charterer,
            `/billOfLading/${proofOfDelivery.billOfLading}`,
            {
                issued: true,
            }
        );
        return proofOfDelivery;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function signPoD(proofOfDelivery) {
    console.log("6 - signPoD");
    var contract = new web3.eth.Contract(
        abiList.proofOfDelivery.abi,
        proofOfDelivery.contract_address
    );
    var sig = portAgentB.account.sign(hash(proofOfDelivery.contract_address));

    await contract.methods
        .submitSignature(sig.signature)
        .send({ from: portAgentB.account.address, gas });

    //update proofOfDelivery list
    await put(broker_charterer, `/proofOfDelivery/${proofOfDelivery._id}`, {
        signature: sig.signature,
        checked: true,
    });

    //update order status
    await put(
        broker_charterer,
        `/order/billOfLading/${proofOfDelivery.billOfLading}`,
        {
            status: "closed",
        }
    );
}

async function run() {
    portAgentA.user = await tryWith(
        async (client) =>
            await client
                .db("charterer")
                .collection("registry")
                .findOne({ address: portAgentA.account.address.toLowerCase() })
    );
    portAgentB.user = await tryWith(
        async (client) =>
            await client
                .db("charterer")
                .collection("registry")
                .findOne({ address: portAgentB.account.address.toLowerCase() })
    );
    master.user = await tryWith(
        async (client) =>
            await client
                .db("charterer")
                .collection("registry")
                .findOne({ address: master.account.address.toLowerCase() })
    );

    var charterparty = await tryWith(async (client) => {
        var arr = await client
            .db("charterer")
            .collection("charterparties")
            .find()
            .toArray();
        return arr[0];
    });

    var billOfLading = await issueBL(charterparty);
    var credential = await issueCredential(billOfLading);
    await depositBL(billOfLading, credential);
    await signBL(billOfLading);
    var proofOfDelivery = await issuePoD(charterparty, billOfLading);

    var contract = new web3.eth.Contract(
        abiList.proofOfDelivery.abi,
        proofOfDelivery.contract_address
    );

    contract.events.BatchQueryCompleted().on("data", async (e) => {
        //manipulate PoD
        await tryWith(
            async (client) =>
                await client
                    .db("charterer")
                    .collection("proofOfDeliveries")
                    .updateOne(
                        { _id: new ObjectID(proofOfDelivery._id) },
                        {
                            $set: {
                                "cargo.weight.value": 200,
                                "cargo.moisture_level.value": 15,
                            },
                        }
                    )
        );
        await signPoD(proofOfDelivery);
        process.exit(1);
    });
}

run();
