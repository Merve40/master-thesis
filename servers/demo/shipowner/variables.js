const env = require("../env");
const os = require("os");
var IP = os.networkInterfaces()["wlp2s0"][0].address;

module.exports = {
    ethereumUrl: env.ethereumUri,
    dbUri: env.dbUri,
    privateKey: env.shipowner1_key,
    pathObjects: env.pathObjects,
    contracts: env.contracts,
    role: "shipowner",
    hasIdms: false,
    domain: "shipowner",
    oracle: {
        port: 7070,
        host: "0.0.0.0",
    },
    broker: {
        port: 9797,
        host: "0.0.0.0",
        client: `http://${IP}:5000`,
    },
    idm: env.idm,
};
