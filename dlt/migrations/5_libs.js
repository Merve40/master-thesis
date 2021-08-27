const Lib = artifacts.require("Lib");
const Clone = artifacts.require("Clone");

module.exports = function (deployer) {
    deployer.deploy(Lib);
    deployer.deploy(Clone);
};
