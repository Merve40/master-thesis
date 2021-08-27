const utils = require("./utils")(web3);
const merkle = utils.merkle;
const create = utils.create;

const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Factory = artifacts.require("Factory");
const DelegatableFactory = artifacts.require("DelegatableFactory");
const Delegatable = artifacts.require("Delegatable");
const Charterparty = artifacts.require("Charterparty");
const Oracle = artifacts.require("Oracle");

contract("Charterparty", async (accounts) => {
    var owner = accounts[0];
    var charterer = accounts[1];
    var shipowner = accounts[2];

    var delegatableCharterer;
    var delegatableShipowner;

    var agentLoading = accounts[3];
    var agentDischarging = accounts[4];

    var oracle;
    var charterparty;

    beforeEach(async () => {
        // link libraries
        Factory.link(Clone);
        Factory.link(Lib);
        Delegatable.link(Lib);
        DelegatableFactory.link(Clone);
        DelegatableFactory.link(Lib);
        Charterparty.link(Lib);

        oracle = await Oracle.new();
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

        charterparty = await create(factory, Charterparty);

        await charterparty.init(
            oracle.address,
            delegatableCharterer.address,
            delegatableShipowner.address,
            agentLoading,
            agentDischarging,
            { from: charterer }
        );
    });

    it('should emit "Merkleroot" upon calling "initialize()"', async () => {
        var fee = 5000;
        var laytime = 12 * 1000 * 60 * 60 * 24; // 12 days
        var maxMoistureLevel = 17; // in %
        var test1 = "This is a test variable";
        var test2 = 190;

        const elements = [laytime, maxMoistureLevel, test1, test2].map((e) =>
            web3.utils.soliditySha3(e)
        );
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

        await charterparty.initialize(root, fee, elements[1], elements[0], {
            from: charterer,
        });

        const logs = await oracle.getPastEvents();

        expect(logs).to.be.a("Array");
        expect(logs).to.have.lengthOf(1);
        expect(logs[0]).to.have.property("event");
        assert.equal(
            logs[0].event,
            "Merkleroot",
            "'Merkleroot' event was not emitted"
        );
        assert.equal(
            logs[0].args.srcContract,
            charterparty.address,
            "event name parameter is wrong"
        );
        assert.equal(
            logs[0].args.setter,
            charterer,
            "event name parameter is wrong"
        );
        assert.equal(
            logs[0].args.merkleroot,
            root,
            "event name parameter is wrong"
        );
    });

    it('should revert upon calling "initialize()" from unauthorized account', async () => {
        var fee = 5000;
        var laytime = 12 * 1000 * 60 * 60 * 24; // 12 days
        var maxMoistureLevel = 17; // in %
        var test1 = "This is a test variable";
        var test2 = 190;

        const elements = [laytime, maxMoistureLevel, test1, test2].map((e) =>
            web3.utils.soliditySha3(e)
        );
        const merkleTree = merkle(elements);
        const root = merkleTree.getHexRoot();

        var reason;
        try {
            unauthorizedAccount = accounts[10];
            await charterparty.initialize(root, fee, elements[1], elements[0], {
                from: unauthorizedAccount,
            });
        } catch (err) {
            reason = err.reason;
        }

        const logs = await oracle.getPastEvents();
        expect(logs).to.have.lengthOf(0);

        assert.equal(
            reason,
            "You are not authorized to create a Charterparty.",
            "Wrong error reason"
        );
    });
});
