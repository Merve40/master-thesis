const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

/**
 * Utility functions
 */

module.exports = function (web3) {
    function merkle(elements) {
        return new MerkleTree(elements, keccak256, {
            hashLeaves: false,
            sortPairs: true,
        });
    }

    async function getSignature(account, data) {
        var hash = web3.utils.soliditySha3(data);
        var signature = await web3.eth.sign(hash, account);
        signature =
            signature.substr(0, 130) +
            (signature.substr(130) == "00" ? "1b" : "1c");
        return signature;
    }

    function toBN(num) {
        if (typeof num == "string" || typeof num == "number") {
            return web3.utils.toBN(num);
        } else if (web3.utils.isBN(num)) {
            return num;
        }
        throw "Invalid input";
    }

    function checkBalance(before, after, transferAmount, gasUsed, gasPrice) {
        before = toBN(before);
        after = toBN(after);
        gasUsed = toBN(gasUsed);
        transferAmount = toBN(transferAmount);
        gasPrice = toBN(gasPrice);

        var txFee = gasPrice.mul(gasUsed);
        var balanceWithoutPayment = before.sub(txFee);
        var balanceWithPayment = balanceWithoutPayment.add(transferAmount);
        return after.toString() == balanceWithPayment.toString();
    }

    async function create(factory, artifact, options = null) {
        if (artifact.contractName.startsWith("Charterparty")) {
            var tx = await factory.createCharterparty();
            var addr = tx.logs[0].args._address;
            return await artifact.at(addr);
        }
        if (artifact.contractName.startsWith("BillOfLading")) {
            var tx = await factory.createBillOfLading();
            var addr = tx.logs[0].args._address;
            return await artifact.at(addr);
        }
        if (artifact.contractName.startsWith("ProofOfDelivery")) {
            var tx = await factory.createProofOfDelivery();
            var addr = tx.logs[0].args._address;
            return await artifact.at(addr);
        }
        if (artifact.contractName.startsWith("Delegatable")) {
            var tx = await factory.createDelegatable(options);
            var addr = tx.logs[0].args._address;
            return await artifact.at(addr);
        }
    }

    return {
        merkle,
        getSignature,
        toBN,
        checkBalance,
        create,
    };
};
