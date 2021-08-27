const Dummy = artifacts.require("Dummy");

module.exports = function (deployer) {
    deployer.deploy(Dummy);
};
