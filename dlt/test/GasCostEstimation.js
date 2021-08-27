const utils = require("./utils")(web3);
const merkle = utils.merkle;
const getSignature = utils.getSignature;
const toBN = utils.toBN;
const checkBalance = utils.checkBalance;
const create = utils.create;

const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Factory = artifacts.require("Factory");
const Charterparty = artifacts.require("Charterparty");
const BillOfLading = artifacts.require("BillOfLading");
const ProofOfDelivery = artifacts.require("ProofOfDelivery");
const Delegatable = artifacts.require("Delegatable");
const DelegatableFactory = artifacts.require("DelegatableFactory");
const Oracle = artifacts.require("Oracle");

contract("Factory", async (accounts) => {
    var owner = accounts[0];
    var charterer = accounts[1];
    var shipowner = accounts[2];
    var agentLoading = accounts[3];
    var agentDischarging = accounts[4];
    var master = accounts[5];

    var delegatableCharterer;
    var delegatableShipowner;

    var oracle;
    var charterparty;
    var billOfLading;

    var gas = 5000000;
    var gasPrice;

    var timeLoaded;

    var factory;
    var delegatableFactory;

    beforeEach(async () => {
        var price = web3.utils.toWei("20", "gwei");
        gasPrice = web3.utils.toBN(price);

        // linking libraries
        Factory.link(Clone);
        Factory.link(Lib);
        DelegatableFactory.link(Clone);
        DelegatableFactory.link(Lib);
        Delegatable.link(Lib);
        Charterparty.link(Lib);
        BillOfLading.link(Lib);
        ProofOfDelivery.link(Lib);

        factory = await Factory.deployed();
        delegatableFactory = await DelegatableFactory.deployed();

        // create Delegatable Charterer
        delegatableCharterer = await create(delegatableFactory, Delegatable, {
            from: charterer,
            gas,
        });
        // create Delegatable Shipowner
        delegatableShipowner = await create(delegatableFactory, Delegatable, {
            from: shipowner,
            gas,
        });

        await delegatableShipowner.addDelegate(master, { from: shipowner });
        await delegatableShipowner.authorizePayer(master, { from: shipowner });

        // transfers ether to Delegatable, so that Delegatable can deposit ether to B/L
        var paymentFee = await delegatableShipowner.paymentFee();
        var fineFee = 5000;
        fee = paymentFee.words[0] * 2 + fineFee * 3;
        await delegatableShipowner.transferFunds({
            from: shipowner,
            value: fee,
        });
    });

    it("should estimate deployments", async () => {
        var gas = await BillOfLading.new.estimateGas();
        console.log("B/L deploy()", gas);

        var gas2 = await ProofOfDelivery.new.estimateGas();
        console.log("B/L deploy()", gas2);
    });

    /*
    it("should estimate factory methods", async () => {
        var gas1 = await factory.createCharterparty.estimateGas();
        var gas2 = await factory.createBillOfLading.estimateGas();
        var gas3 = await factory.createProofOfDelivery.estimateGas();

        console.log("C/P:", gas1, "; B/L:", gas2, "; PoD:", gas3);
    });
    */
    async function createCP() {
        oracle = await Oracle.new();
        charterparty = await create(factory, Charterparty);

        await charterparty.init(
            oracle.address,
            delegatableCharterer.address,
            delegatableShipowner.address,
            agentLoading,
            agentDischarging,
            { from: charterer }
        );

        var fee = 5000;
        var laytime = 12 * 1000 * 60 * 60 * 24; // 12 days
        var maxMoistureLevel = 17; // in %

        var elements = [laytime, maxMoistureLevel].map((e) =>
            web3.utils.soliditySha3(e)
        );
        var tree = merkle(elements);
        var root = tree.getHexRoot();

        await charterparty.initialize(root, fee, elements[1], elements[0], {
            from: charterer,
        });
    }
    /*
    it("should estimate B/L methods", async () => {
        await createCP();
        billOfLading = await create(factory, BillOfLading);
        var gas1 = await billOfLading.init.estimateGas(
            oracle.address,
            charterparty.address,
            {
                from: agentLoading,
            }
        );

        await billOfLading.init(oracle.address, charterparty.address, {
            from: agentLoading,
        });

        console.log("B/L.init()", gas1);

        const measuredMoistureLevel = 18; // percent
        const timeLoaded = Date.now(); // milliseconds
        const quantity = 255; // tonnes
        const test1 = "Test Variable 1";
        const test2 = "Test Variable 2";

        const elements = [
            measuredMoistureLevel,
            timeLoaded,
            quantity,
            test1,
            test2,
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();
        var gas2 = await billOfLading.initialize.estimateGas(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );
        console.log("B/L.initialize()", gas2);
        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        var gas3 = await delegatableShipowner.payContractFee.estimateGas(
            billOfLading.address,
            {
                from: master,
                gas,
            }
        );
        console.log("Delegatable.payContractFee()", gas3);
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

        var signature = await getSignature(agentLoading, billOfLading.address);
        var gas4 = await billOfLading.submitSignature.estimateGas(signature, {
            from: agentLoading,
        });
        console.log("B/L.submitSignature()", gas4);

        var gas5 = await billOfLading.submitCredential.estimateGas("Test", {
            from: agentLoading,
        });
        console.log("B/L.submitCredential()", gas5);
    });
    */
    async function createBL() {
        await createCP();
        billOfLading = await create(factory, BillOfLading);
        await billOfLading.init(oracle.address, charterparty.address, {
            from: agentLoading,
        });

        const measuredMoistureLevel = 18; // percent
        timeLoaded = Date.now(); // milliseconds
        const quantity = 255; // tonnes
        const test1 = "Test Variable 1";
        const test2 = "Test Variable 2";

        const elements = [
            measuredMoistureLevel,
            timeLoaded,
            quantity,
            test1,
            test2,
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();
        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

        var signature = await getSignature(agentLoading, billOfLading.address);
        await billOfLading.submitSignature(signature, {
            from: agentLoading,
        });
    }
    /*
    it("should estimate PoD methods", async () => {
        await createCP();
        await createBL();

        var proofOfDelivery = await create(factory, ProofOfDelivery);

        const quantity = 217;
        const measuredMoistureLevel = 14;
        const timeDelivery = timeLoaded + 1000 * 60 * 60 * 24 * 3;

        const elements = [measuredMoistureLevel, timeDelivery, quantity].map(
            (e) => web3.utils.soliditySha3(e)
        );
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

        var gas1 = await proofOfDelivery.init.estimateGas(
            oracle.address,
            billOfLading.address,
            root,
            elements[2],
            elements[0],
            elements[1],
            { from: agentDischarging }
        );
        console.log("PoD.init()", gas1);
        await proofOfDelivery.init(
            oracle.address,
            billOfLading.address,
            root,
            elements[2],
            elements[0],
            elements[1],
            { from: agentDischarging }
        );

        var logs = await oracle.getPastEvents();
        const handle = logs[3].args.handle;

        var data = [
            measuredMoistureLevel,
            17,
            12 * 1000 * 60 * 60 * 24,
            timeLoaded,
            timeDelivery,
            255,
            quantity,
        ];

        var gas2 = await oracle.submitBatchQuery.estimateGas(handle, data, [], {
            from: agentDischarging,
        });
        console.log("Oracle.submitBatchQuery()", gas2);
        await oracle.submitBatchQuery(handle, data, [], {
            from: agentDischarging,
        });

        var signature = await getSignature(
            agentDischarging,
            proofOfDelivery.address
        );
        var gas3 = await proofOfDelivery.submitSignature.estimateGas(
            signature,
            {
                from: agentDischarging,
            }
        );
        console.log("PoD.submitSignature()", gas3);
    });
    */
});
