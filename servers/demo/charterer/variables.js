const env = require("../env");
const os = require("os");
var IP = os.networkInterfaces()["wlp2s0"][0].address;

module.exports = {
    ethereumUrl: env.ethereumUri,
    dbUri: env.dbUri,
    privateKey: env.charterer_key,
    role: "charterer",
    hasIdms: false,
    pathObjects: env.pathObjects,
    contracts: env.contracts,
    domain: "charterer",
    oracle: {
        port: 6060,
        host: "0.0.0.0",
    },
    broker: {
        port: 8787,
        host: "0.0.0.0",
        client: `http://${IP}:3000`,
    },
    idm: env.idm,
};
