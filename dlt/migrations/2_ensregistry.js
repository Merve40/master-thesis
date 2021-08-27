const ENS = artifacts.require("ensregistry/ENS");
const Resolver = artifacts.require("ensregistry/Resolver");
const Registrar = artifacts.require("ensregistry/Registrar");
var namehash = require("eth-ens-namehash").hash;

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(Resolver);
    await deployer.deploy(ENS);

    var tldOwner = accounts[0];
    var tld = web3.utils.sha3("eth");

    var ens = await ENS.deployed();
    await ens.setSubnodeOwner("0x0", tld, tldOwner);

    tld = namehash("eth");

    var resolver = await Resolver.deployed();
    await resolver.setAddr(tld, tldOwner);

    await ens.setResolver(tld, resolver.address);
};
