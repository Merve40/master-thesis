const utils = require("./utils")(web3);
const merkle = utils.merkle;
const getSignature = utils.getSignature;
const toBN = utils.toBN;
const checkBalance = utils.checkBalance;
const create = utils.create;

const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Factory = artifacts.require("Factory");
const DelegatableFactory = artifacts.require("DelegatableFactory");
const Oracle = artifacts.require("Oracle");
const Delegatable = artifacts.require("Delegatable");
const Charterparty = artifacts.require("Charterparty");
const DidReg = artifacts.require("EthereumDIDRegistry");
const BillOfLading = artifacts.require("BillOfLading");
const ProofOfDelivery = artifacts.require("ProofOfDelivery");

contract("ProofOfDelivery", async (accounts) => {
    var owner = accounts[0];
    var charterer = accounts[1];
    var shipowner = accounts[2];
    var agentLoading = accounts[3];
    var agentDischarging = accounts[4];
    var master = accounts[5];

    var delegatableCharterer;
    var delegatableShipowner;

    var gas = 5000000;
    var gasPrice;
    var values = {};

    var oracle;
    var charterparty;
    var billOfLading;
    var proofOfDelivery;

    beforeEach(async () => {
        // linking libraries
        Factory.link(Clone);
        Factory.link(Lib);
        Delegatable.link(Lib);
        Charterparty.link(Lib);
        BillOfLading.link(Lib);
        ProofOfDelivery.link(Lib);
        DelegatableFactory.link(Clone);
        DelegatableFactory.link(Lib);

        factory = await Factory.deployed();
        delegatableFactory = await DelegatableFactory.deployed();

        var price = web3.utils.toWei("20", "gwei");
        gasPrice = web3.utils.toBN(price);
        didReg = await DidReg.deployed();
        oracle = await Oracle.new();

        // create Delegatable Charterer
        delegatableCharterer = await create(delegatableFactory, Delegatable, {
            from: charterer,
        });
        // create Delegatable Shipowner
        delegatableShipowner = await create(delegatableFactory, Delegatable, {
            from: shipowner,
        });
        await delegatableShipowner.addDelegate(master, { from: shipowner });
        await delegatableShipowner.authorizePayer(master, { from: shipowner });

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
        values.charterparty = {
            laytime,
            maxMoistureLevel,
        };

        var elements = [laytime, maxMoistureLevel].map((e) =>
            web3.utils.soliditySha3(e)
        );
        var tree = merkle(elements);
        var root = tree.getHexRoot();

        await charterparty.initialize(root, fee, elements[1], elements[0], {
            from: charterer,
        });

        // transfers ether to Delegatable, so that Delegatable can deposit ether to B/L
        var paymentFee = await delegatableShipowner.paymentFee();
        var fineFee = await charterparty.fineFee();
        fee = paymentFee.words[0] * 2 + fineFee.words[0] * 3;
        await delegatableShipowner.transferFunds({
            from: shipowner,
            value: fee,
        });

        billOfLading = await create(factory, BillOfLading);
        await billOfLading.init(oracle.address, charterparty.address, {
            from: agentLoading,
        });

        // transfer ether to B/L
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

        ////////////////////////////////////////////////////////

        const measuredMoistureLevel = 15; // percent
        timeLoaded = Date.now(); // milliseconds
        const quantity = 255; // tonnes
        values.billOfLading = {
            measuredMoistureLevel,
            timeLoaded,
            quantity,
        };

        elements = [measuredMoistureLevel, timeLoaded, quantity].map((e) =>
            web3.utils.soliditySha3(e)
        );
        merkleTree = merkle(elements);
        root = merkleTree.getHexRoot();

        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );
        // submit signature
        var signature = await getSignature(agentLoading, billOfLading.address);
        await billOfLading.submitSignature(signature, { from: agentLoading });

        proofOfDelivery = await create(factory, ProofOfDelivery);
    });

    it('should emit "Merkleroot" and "BatchQuery" events upon calling "initialize()"', async () => {
        const quantity = 217;
        const measuredMoistureLevel = 14;
        const timeDelivery = timeLoaded + 1000 * 60 * 60 * 24 * 3;

        const elements = [measuredMoistureLevel, timeDelivery, quantity].map(
            (e) => web3.utils.soliditySha3(e)
        );
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

        await proofOfDelivery.init(
            oracle.address,
            billOfLading.address,
            root,
            elements[2],
            elements[0],
            elements[1],
            { from: agentDischarging }
        );
        const logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(4);
        expect(logs[0]).to.have.property("event");
        assert.equal(
            logs[1].event,
            "Merkleroot",
            "'Merkleroot' event was not emitted"
        );
        assert.equal(
            logs[3].event,
            "BatchQuery",
            "'BatchQuery' event was not emitted"
        );
    });

    it('should transfer funds from BillOfLading to ProofOfDelivery upon calling "initialize()"', async () => {
        const quantity = 217;
        const measuredMoistureLevel = 14;
        const timeDelivery = timeLoaded + 1000 * 60 * 60 * 24 * 3;

        const elements = [measuredMoistureLevel, timeDelivery, quantity].map(
            (e) => web3.utils.soliditySha3(e)
        );
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

        var before = await web3.eth.getBalance(proofOfDelivery.address);
        var amount = await web3.eth.getBalance(billOfLading.address);

        await proofOfDelivery.init(
            oracle.address,
            billOfLading.address,
            root,
            elements[2],
            elements[0],
            elements[1],
            { from: agentDischarging }
        );

        var after = await web3.eth.getBalance(proofOfDelivery.address);
        var afterBL = await web3.eth.getBalance(billOfLading.address);

        assert.equal(after, amount, "Balance is incorrect");
        assert.equal(afterBL, 0);
    });

    it('should emit "Warn" with value "MaxMoistureLevelExceeded" event', async () => {
        const quantity = values.billOfLading.quantity;
        const measuredMoistureLevel = 18;
        const timeDelivery = timeLoaded + 1000 * 60 * 60 * 24 * 3;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];

        await oracle.submitBatchQuery(handle, data, [], {
            from: agentDischarging,
        });

        logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(1);
        expect(logs[0]).to.have.property("event");
        assert.equal(logs[0].event, "Warn", "'Warn' event was not emitted");
        assert.equal(
            logs[0].args.warning,
            "MaxMoistureLevelExceeded",
            "wrong event value"
        );
    });

    it('should pay fine to charterer due to "MaxMoistureLevelExceeded" event', async () => {
        const quantity = values.billOfLading.quantity;
        const measuredMoistureLevel = 18;
        const timeDelivery = timeLoaded + 1000 * 60 * 60 * 24 * 3;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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

        var before = await web3.eth.getBalance(delegatableCharterer.address);

        var data = [
            measuredMoistureLevel,
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];
        await oracle.submitBatchQuery(handle, data, []);

        var after = await web3.eth.getBalance(delegatableCharterer.address);
        var fine = await charterparty.fineFee();

        assert.equal(before, 0, "Balance is incorrect");
        assert.equal(after, fine, "Balance is incorrect");
    });

    it('should emit "Warn" with value "MaxDelayExceeded" event', async () => {
        const quantity = values.billOfLading.quantity;
        const measuredMoistureLevel = values.billOfLading.measuredMoistureLevel;
        const timeDelivery = timeLoaded + values.charterparty.laytime + 1000;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];
        await oracle.submitBatchQuery(handle, data, []);

        logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(1);
        expect(logs[0]).to.have.property("event");
        assert.equal(logs[0].event, "Warn", "'Warn' event was not emitted");
        assert.equal(
            logs[0].args.warning,
            "MaxDelayExceeded",
            "wrong event value"
        );
    });

    it('should emit "Warn" with value "QuantityMissing" event', async () => {
        const quantity = values.billOfLading.quantity - 5;
        const measuredMoistureLevel = values.billOfLading.measuredMoistureLevel;
        const timeDelivery = timeLoaded + values.charterparty.laytime - 1000;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];
        await oracle.submitBatchQuery(handle, data, []);

        logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(1);
        expect(logs[0]).to.have.property("event");
        assert.equal(logs[0].event, "Warn", "'Warn' event was not emitted");
        assert.equal(
            logs[0].args.warning,
            "QuantityMissing",
            "wrong event value"
        );
    });

    it('should emit "Warn" with value "MaxDelayExceeded" and "QuantityMissing" event', async () => {
        const quantity = values.billOfLading.quantity - 5;
        const measuredMoistureLevel = values.billOfLading.measuredMoistureLevel;
        const timeDelivery = timeLoaded + values.charterparty.laytime + 1000;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];
        await oracle.submitBatchQuery(handle, data, []);

        logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(2);
        expect(logs[0]).to.have.property("event");
        assert.equal(logs[0].event, "Warn", "'Warn' event was not emitted");
        assert.equal(
            logs[0].args.warning,
            "QuantityMissing",
            "wrong event value"
        );
        assert.equal(
            logs[1].args.warning,
            "MaxDelayExceeded",
            "wrong event value"
        );
    });

    it('should transfer payment to discharging agent upon calling "submitSignature"', async () => {
        const quantity = values.billOfLading.quantity - 5;
        const measuredMoistureLevel = values.billOfLading.measuredMoistureLevel;
        const timeDelivery = timeLoaded + values.charterparty.laytime + 1000;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];
        await oracle.submitBatchQuery(handle, data, []);

        var before = await web3.eth.getBalance(agentDischarging);

        var signature = await getSignature(
            agentDischarging,
            proofOfDelivery.address
        );
        var tx = await proofOfDelivery.submitSignature(signature, {
            from: agentDischarging,
        });
        var gasUsed = tx.receipt.gasUsed;

        var after = await web3.eth.getBalance(agentDischarging);
        var amount = await delegatableShipowner.paymentFee();

        var check = checkBalance(before, after, amount, gasUsed, gasPrice);
        assert.ok(check, "Balance is incorrect");
    });

    it('should refund remainder of shipowners deposit upon calling "submitSignature"', async () => {
        const quantity = values.billOfLading.quantity - 5;
        const measuredMoistureLevel = values.billOfLading.measuredMoistureLevel;
        const timeDelivery = timeLoaded + values.charterparty.laytime + 1000;

        const elements = [
            measuredMoistureLevel,
            timeDelivery,
            quantity,
            "test1",
            "test2",
        ].map((e) => web3.utils.soliditySha3(e));
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

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
            values.charterparty.maxMoistureLevel,
            values.charterparty.laytime,
            values.billOfLading.timeLoaded,
            timeDelivery,
            values.billOfLading.quantity,
            quantity,
        ];
        await oracle.submitBatchQuery(handle, data, []);

        var before = await web3.eth.getBalance(delegatableShipowner.address);

        var signature = await getSignature(
            agentDischarging,
            proofOfDelivery.address
        );
        await proofOfDelivery.submitSignature(signature, {
            from: agentDischarging,
        });

        var after = await web3.eth.getBalance(delegatableShipowner.address);
        // shipowner paid two fines due to "MaxDelayExceeded" and "QuantityMissing"
        // remaining deposit is worth one fine amount
        var amount = await charterparty.fineFee();

        var expected = toBN(before).add(toBN(amount)).toString();

        assert.equal(after, expected, "Balance is incorrect");
    });
});
