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

        oracle = await Oracle.new();
        factory = await Factory.deployed();
        delegatableFactory = await DelegatableFactory.deployed();

        await create(null, null);

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

        console.log(delegatableCharterer);

        await delegatableShipowner.addDelegate(master, { from: shipowner });
        await delegatableShipowner.authorizePayer(master, { from: shipowner });

        charterparty = await create("charterparty", charterer);

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

        billOfLading = await create("billoflading", agentLoading);
        await billOfLading.init(oracle.address, charterparty.address, {
            from: agentLoading,
        });
    });

    async function create(contract, account) {
        if (contract == "charterparty") {
            //var tx = await factory.createCharterparty({from: account})
            var tx = await factory.createCharterparty();
            var addr = tx.logs[0].args._address;
            return await Charterparty.at(addr);
        }
        if (contract == "billoflading") {
            //var tx = await factory.createBillOfLading({from: account})
            var tx = await factory.createBillOfLading();
            var addr = tx.logs[0].args._address;
            return await BillOfLading.at(addr);
        }
    }

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
    });

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

        var reason = "";
        try {
            await billOfLading.initialize(
                root,
                elements[1],
                elements[2],
                elements[0],
                { from: agentLoading }
            );
        } catch (e) {
            reason = e.reason;
        }

        assert.equal(
            reason,
            "Cannot initialize: deposit is missing",
            "Wrong reason"
        );
    });

    it('should transfer payment to agent upon calling "submitSignature"', async () => {
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

    /*
    it('should emit "Merkleroot" upon calling "initialize()"', async () =>{
        
        var fee = 5000;
        var laytime = 12 * 1000 * 60 * 60 * 24 // 12 days
        var maxMoistureLevel = 17 // in %
        var test1 = "This is a test variable"
        var test2 = 190

        const elements = [laytime, maxMoistureLevel, test1, test2].map(e => web3.utils.soliditySha3(e))
        const merkleTree = merkle(elements)
        const root = merkleTree.getHexRoot()

        await charterparty.initialize(root, fee, elements[1], elements[0], {from: charterer})

        const logs = await oracle.getPastEvents()

        expect(logs).to.be.a('Array');
        expect(logs).to.have.lengthOf(1);
        expect(logs[0]).to.have.property('event');
        assert.equal(logs[0].event, "Merkleroot", "'Merkleroot' event was not emitted");
        assert.equal(logs[0].args.srcContract, charterparty.address, "event name parameter is wrong");
        assert.equal(logs[0].args.setter, charterer, "event name parameter is wrong");
        assert.equal(logs[0].args.merkleroot, root, "event name parameter is wrong");
    })

    it('should revert upon calling "initialize()" from unauthorized account', async () =>{

        var fee = 5000;
        var laytime = 12 * 1000 * 60 * 60 * 24 // 12 days
        var maxMoistureLevel = 17 // in %
        var test1 = "This is a test variable"
        var test2 = 190

        const elements = [laytime, maxMoistureLevel, test1, test2].map(e => web3.utils.soliditySha3(e))
        const merkleTree = merkle(elements)
        const root = merkleTree.getHexRoot()

        var reason
        try{
            unauthorizedAccount = accounts[10]
            await charterparty.initialize(root, fee, elements[1], elements[0], {from: unauthorizedAccount})
        }catch(err){
            reason = err.reason
        }

        const logs = await oracle.getPastEvents()
        expect(logs).to.have.lengthOf(0);

        assert.equal(reason, "You are not authorized to create a Charterparty.", "Wrong error reason");
    })
    */
});
