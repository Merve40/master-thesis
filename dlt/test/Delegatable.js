const utils = require("./utils")(web3);
const merkle = utils.merkle;

var namehash = require("eth-ens-namehash").hash;

const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Oracle = artifacts.require("Oracle");
const Delegatable = artifacts.require("Delegatable");
const Charterparty = artifacts.require("Charterparty");
const Resolver = artifacts.require("ensregistry/Resolver");
const ENS = artifacts.require("ensregistry/ENS");
const DidReg = artifacts.require("EthereumDIDRegistry");
const BillOfLading = artifacts.require("BillOfLading");
const Factory = artifacts.require("DelegatableFactory");

contract("Delegatable", async (accounts) => {
    var tldOwner = accounts[0];

    var charterer = accounts[1];
    var shipowner = accounts[2];
    var agentLoading = accounts[3];
    var agentDischarging = accounts[4];
    var master = accounts[5];

    var delegatableCharterer;
    var delegatableShipowner;

    var tld = "eth";
    var gas = 5000000;

    var ens;
    var didReg;
    var oracle;
    var factory;
    var charterparty;
    var billOfLading;

    beforeEach(async () => {
        // link libraries
        Factory.link(Clone);
        Factory.link(Lib);
        Delegatable.link(Lib);
        Charterparty.link(Lib);
        BillOfLading.link(Lib);

        resolver = await Resolver.deployed();
        ens = await ENS.deployed();
        didReg = await DidReg.deployed();
        oracle = await Oracle.new();
        factory = await Factory.deployed();

        var tx = await factory.createDelegatable({
            from: shipowner,
        });
        delegatableShipowner = await Delegatable.at(tx.logs[0].args._address);

        tx = await factory.createDelegatable({
            from: charterer,
        });
        delegatableCharterer = await Delegatable.at(tx.logs[0].args._address);
    });

    async function getDID(address) {
        const Resolver = require("did-resolver").Resolver;
        const getResolver = require("ethr-did-resolver").getResolver;
        const config = {
            networks: [
                {
                    name: "development",
                    rpcUrl: "http://0.0.0.0:8545",
                    registry: didReg.address,
                },
            ],
        };

        var resolver = new Resolver(getResolver(config));
        return await resolver.resolve(`did:ethr:development:${address}`);
    }

    it('should add "master" as named delegate', async () => {
        await ens.setSubnodeOwner(
            namehash("eth"),
            web3.utils.sha3("shipowner"),
            delegatableShipowner.address,
            { from: tldOwner }
        );

        await delegatableShipowner.setDomain(namehash("shipowner.eth"), {
            from: shipowner,
        });

        var domain = web3.utils.sha3("master");
        await delegatableShipowner.addNamedDelegate(master, domain, {
            from: shipowner,
        });

        var res = await ens.resolver(namehash("shipowner.eth"));
        res = await Resolver.at(res);
        var resolved = await res.addr(namehash("master.shipowner.eth"));
        assert.equal(resolved, master, "Incorrect address");
    });

    it("should add multiple delegates", async () => {
        await delegatableShipowner.addDelegates(
            [agentLoading, agentDischarging, master],
            { from: shipowner }
        );

        var isDelegate = await didReg.validDelegate(
            delegatableShipowner.address,
            web3.utils.asciiToHex("sigAuth"),
            master
        );
        assert.ok(isDelegate, "Is not a delegate");

        isDelegate = await didReg.validDelegate(
            delegatableShipowner.address,
            web3.utils.asciiToHex("sigAuth"),
            agentDischarging
        );
        assert.ok(isDelegate, "Is not a delegate");
    });

    it("should add oracle service", async () => {
        await delegatableShipowner.addOracle("test oracle", {
            from: shipowner,
        });

        var did = await getDID(delegatableShipowner.address);
        assert.equal(
            did.didDocument.service[0].serviceEndpoint,
            "test oracle",
            "Wrong service endpoint name"
        );
    });

    it("should transfer payment to billOfLading", async () => {
        await delegatableShipowner.addDelegate(master, { from: shipowner });
        await delegatableShipowner.authorizePayer(master, { from: shipowner });

        charterparty = await Charterparty.new();
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

        billOfLading = await BillOfLading.new();
        await billOfLading.init(oracle.address, charterparty.address, {
            from: agentLoading,
        });

        var paymentFee = await delegatableShipowner.paymentFee();
        var fineFee = await charterparty.fineFee();
        var fee = paymentFee.words[0] * 2 + fineFee.words[0] * 3;

        await delegatableShipowner.transferFunds({
            from: shipowner,
            value: fee,
        });
        await delegatableShipowner.payContractFee(billOfLading.address, {
            from: master,
            gas,
        });

        var balance = await web3.eth.getBalance(billOfLading.address);

        balance = await web3.eth.getBalance(billOfLading.address);
        assert.equal(balance, fee, "Balance is not equal");
    });
});
