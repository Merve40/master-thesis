import Web3 from "web3";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { keccak256 } from "keccak256";
import { MerkleTree } from "merkletreejs";

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
);

export async function getProof(oracle, abiList, merkleroot, nextStep) {
    var rpc = process.env.REACT_APP_WEB3;
    const config = {
        networks: [
            {
                name: "development",
                rpcUrl: `http${rpc.substr(2)}`,
                registry: abiList.didRegistry.address,
            },
        ],
    };
    var resolver = new Resolver(getResolver(config));
    // resolve oracles DID
    var did = await resolver.resolve(`did:ethr:development:${oracle}`);
    var orcl = did.didDocument.service.filter(
        (service) => service.type === "oracle"
    )[0];
    nextStep({
        payload: `did:ethr:development:${oracle}\nservice-endpoint: ${orcl.serviceEndpoint}`,
    });
    // fetch proofs from oracle
    var response = await fetch(`${orcl.serviceEndpoint}/proofs/${merkleroot}`);
    nextStep({ name: `GET ${orcl.serviceEndpoint}/proofs/${merkleroot}` });
    return await response.json();
}

export function verify(root, leaves, raw) {
    var hashed = raw.map((r) => web3.utils.soliditySha3(r));
    for (var i in hashed) {
        if (!leaves.includes(hashed[i])) {
            return false;
        }
    }

    var tree = merkle(leaves);
    var mroot = tree.getHexRoot();
    return mroot == root;
}

export function verify1(leaves, raw) {
    var tree = merkle(leaves.map((l) => MerkleTree.bufferify(l)));
    //hash leaves
    var hashed = raw.map((i) =>
        MerkleTree.bufferify(web3.utils.soliditySha3(i))
    );
    var sortedLeavesString = tree.getLeaves().map((l) => l.toString());
    var indices = hashed.map((h) => sortedLeavesString.indexOf(h.toString()));

    if (indices.indexOf(-1) != -1) {
        return false;
    }

    var depth = tree.getDepth();
    var root = tree.getRoot();
    const treeFlat = tree.getLayersFlat();
    var proof = tree.getMultiProof(treeFlat, indices);
    return tree.verifyMultiProof(root, indices, hashed, depth, proof);
}

export function merkle(elements) {
    return new MerkleTree(elements, keccak256, {
        hashLeaves: false,
        sortPairs: true,
    });
}

export async function get(path) {
    return await fetch(`${process.env.REACT_APP_SERVER}${path}`, {
        method: "get",
        mode: "cors",
    });
}
