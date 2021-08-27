const express = require("express");
const cors = require("cors");
const http = require("http");
const Web3 = require("web3");

var util = require("../tda-core/tda-util");
const env = require("./env");
const idm = require("../tda-core/idm");

const logger = util.getLogger("idm", util.colors.RED);

let web3 = new Web3(env.ethereumUri);
web3.eth.ens.registryAddress = env.contracts.ens.address;

var app = express();
app.use(express.json());
app.use(cors());

// initialize idm
idm(env, app, web3, logger);

//var server = http.createServer(app);
app.listen(env.idm.port, "0.0.0.0");
//app.listen(env.idm.port, env.idm.host);
//console.log(`Server running at ${env.idm.host}:${env.idm.port}`);
logger.info(`running at ${env.idm.host}:${env.idm.port}`);
