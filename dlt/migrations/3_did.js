const EthereumDIDRegistry = artifacts.require("EthereumDIDRegistry");

module.exports = function (deployer) {
    deployer.deploy(EthereumDIDRegistry)
};