const DidReg = artifacts.require("EthereumDIDRegistry");
const ENS = artifacts.require("ensregistry/ENS");
const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Factory = artifacts.require("DelegatableFactory");

module.exports = function (deployer) {
    deployer.link(Lib, Factory);
    deployer.link(Clone, Factory);
    deployer.deploy(Factory, ENS.address, DidReg.address);
};
