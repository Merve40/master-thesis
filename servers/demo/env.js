const util = require("../tda-core/tda-util");
const accounts = require("../data/accounts.json");

const path_contracts = "../../dlt/build/contracts";

module.exports = {
    charterer_key: Object.values(accounts.private_keys)[19],
    shipowner1_key: Object.values(accounts.private_keys)[18],
    pa1_key: Object.values(accounts.private_keys)[17],
    pa2_key: Object.values(accounts.private_keys)[16],
    trader_key: Object.values(accounts.private_keys)[15],
    buyer_key: Object.values(accounts.private_keys)[14],
    master_key: Object.values(accounts.private_keys)[13],
    ethereumUri: "ws://0.0.0.0:8545",
    ethereumNetwork: "development",
    dbUri: "mongodb://172.17.0.3:27017",
    tld: "eth",
    contracts: {
        did_registry: util.readJson(
            require(`${path_contracts}/EthereumDIDRegistry.json`)
        ),
        oracle: util.readJson(require(`${path_contracts}/Oracle.json`)),
        factory: util.readJson(require(`${path_contracts}/Factory.json`)),
        charterparty: util.readJson(
            require(`${path_contracts}/Charterparty.json`)
        ),
        billOfLading: util.readJson(
            require(`${path_contracts}/BillOfLading.json`)
        ),
        proofOfDelivery: util.readJson(
            require(`${path_contracts}/ProofOfDelivery.json`)
        ),
        ens: util.readJson(require(`${path_contracts}/ENS.json`)),
        resolver: util.readJson(require(`${path_contracts}/Resolver.json`)),
        delegatable: util.readJson(
            require(`${path_contracts}/Delegatable.json`)
        ),
        delegatableFactory: util.readJson(
            require(`${path_contracts}/DelegatableFactory.json`)
        ),
        dummy: util.readJson(require(`${path_contracts}/Dummy.json`)),
    },
    pathObjects: path_contracts,
    idm: {
        port: 8080,
        host: "0.0.0.0",
        key: Object.values(accounts.private_keys)[4],
    },
};
