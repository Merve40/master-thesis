const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");
const Factory = artifacts.require("Factory");

module.exports = function (deployer) {
    deployer.link(Lib, Factory);
    deployer.link(Clone, Factory);
    deployer.deploy(Factory);
};
