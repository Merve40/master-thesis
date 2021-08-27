const utils = require("./utils")(web3);
const create = utils.create;
const merkle = utils.merkle;
const getSignature = utils.getSignature;
const toBN = utils.toBN;
const checkBalance = utils.checkBalance;

const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Factory = artifacts.require("Factory");
const Oracle = artifacts.require("Oracle");
const Delegatable = artifacts.require("Delegatable");
const DelegatableFactory = artifacts.require("DelegatableFactory");
const Charterparty = artifacts.require("Charterparty");
const BillOfLading = artifacts.require("BillOfLading");

contract("BillOfLading", async (accounts) => {
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

    var oracle;
    var charterparty;
    var billOfLading;

    beforeEach(async () => {
        var price = web3.utils.toWei("20", "gwei");
        gasPrice = web3.utils.toBN(price);

        oracle = await Oracle.new();

        Factory.link(Clone);
        Factory.link(Lib);
        DelegatableFactory.link(Clone);
        DelegatableFactory.link(Lib);
        Charterparty.link(Lib);
        BillOfLading.link(Lib);

        factory = await Factory.deployed();
        delegatableFactory = await DelegatableFactory.deployed();

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

        BillOfLading.link(Lib);
        BillOfLading.link(Clone);

        billOfLading = await create(factory, BillOfLading);
        await billOfLading.init(oracle.address, charterparty.address, {
            from: agentLoading,
        });
    });
    /*
    it('should emit "Merkleroot" and "BatchQuery" events upon calling "initialize()"', async () => {
        // transfer ether to B/L
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

        const measuredMoistureLevel = 15; // percent
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

        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        const logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(2);
        expect(logs[0]).to.have.property("event");
        assert.equal(
            logs[0].event,
            "Merkleroot",
            "'Merkleroot' event was not emitted"
        );
        assert.equal(
            logs[1].event,
            "BatchQuery",
            "'BatchQuery' event was not emitted"
        );
    });

    it('should emit "Warn" with value "MaxMoistureLevelExceeded" event', async () => {
        // transfer ether to B/L
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

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

        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        var logs = await oracle.getPastEvents();

        const handle = logs[1].args.handle;
        const charterpartyMaxMoistureLevel = 17;
        await oracle.submitBatchQuery(
            handle,
            [charterpartyMaxMoistureLevel, measuredMoistureLevel],
            []
        );

        logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(1);
        expect(logs[0]).to.have.property("event");
        assert.equal(
            logs[0].event,
            "Warn",
            "'Merkleroot' event was not emitted"
        );
        assert.equal(
            logs[0].args.warning,
            "MaxMoistureLevelExceeded",
            "wrong event value"
        );
    });

    it('should revert when passing wrong parameter to "submitBatchQuery"', async () => {
        // transfer ether to B/L
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

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

        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        var logs = await oracle.getPastEvents();

        const handle = logs[1].args.handle;
        const charterpartyMaxMoistureLevel = 17;

        var reason;
        try {
            await oracle.submitBatchQuery(
                handle,
                [100, measuredMoistureLevel],
                []
            );
        } catch (e) {
            reason = e.reason;
        }

        assert.equal(reason, "Given parameters do not match");
    });

    
    it('should revert when passing wrong number of parameters to "submitBatchQuery"', async () => {
        // transfer ether to B/L
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

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

        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        var logs = await oracle.getPastEvents();

        const handle = logs[1].args.handle;
        const charterpartyMaxMoistureLevel = 17;

        var reason;
        try {
            await oracle.submitBatchQuery(handle, [measuredMoistureLevel], []);
        } catch (e) {
            reason = e.reason;
        }

        assert.equal(reason, "invalid parameters");
    });*/

    it("should revert due to missing deposit", async () => {
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
        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        var reason = "";
        try {
            var signature = await getSignature(
                agentLoading,
                billOfLading.address
            );

            var tx = await billOfLading.submitSignature(signature, {
                from: agentLoading,
            });
        } catch (e) {
            reason = e.reason;
        }

        assert.equal(reason, "Aborted: deposit is missing.", "Wrong reason");
    });

    it('should transfer payment to agent upon calling "submitSignature"', async () => {
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

        await billOfLading.initialize(
            root,
            elements[1],
            elements[2],
            elements[0],
            { from: agentLoading }
        );

        // transfer ether to B/L
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

        var signature = await getSignature(agentLoading, billOfLading.address);

        var balanceBefore = await web3.eth.getBalance(agentLoading);
        var paymentFee = await delegatableShipowner.paymentFee();

        var tx = await billOfLading.submitSignature(signature, {
            from: agentLoading,
        });
        var gasUsed = tx.receipt.gasUsed;
        var balanceAfter = await web3.eth.getBalance(agentLoading);

        var isEqual = checkBalance(
            balanceBefore,
            balanceAfter,
            paymentFee,
            gasUsed,
            gasPrice
        );
        assert.ok(isEqual, "Balance is incorrect");
    });
});
