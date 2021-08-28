const env = require("../env");

module.exports = {
    ethereumUrl: env.ethereumUri,
    dbUri: env.dbUri,
    privateKey: env.buyer_key,
    role: "customer",
    hasIdms: false,
    pathObjects: env.pathObjects,
    contracts: env.contracts,
    domain: "customer",
    client: {
        port: 3434,
        host: "0.0.0.0",
    },
    idm: env.idm,
};
