import { MerkleTree } from "merkletreejs";
import jp from "jsonpath";
import { keccak256 } from "keccak256";
import Web3 from "web3";

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
);
const broker = process.env.REACT_APP_BROKER;
const gas = 8000000;

export async function Deployer(account, abiList) {
    const database = db(web3);

    const _smartContract = smartContract(web3, abiList, account);

    async function deployCharterparty(charterparty) {
        var contract = await _smartContract.deployCharterparty(charterparty);
        charterparty.contract_address = contract.options.address;
        var update = { contract_address: contract.options.address };
        await fetch(`${broker}/charterparty/${charterparty._id}`, {
            method: "put",
            mode: "cors",
            body: JSON.stringify(update),
            headers: {
                "Content-Type": "application/json",
                "DID-JWT": getCookie("jwt"),
            },
        });
        return charterparty;
    }

    async function deployBillOfLading(BL, charterpartyAddress) {
        var name = `BL_${Date.now()}`;
        var billOfLading = database.createBillOfLading(name, BL);
        var contract = await _smartContract.deployBillOfLading(
            billOfLading,
            charterpartyAddress
        );
        billOfLading.contract_address = contract.options.address;
        var result = await fetch(`${broker}/billOfLading`, {
            method: "post",
            mode: "cors",
            body: JSON.stringify(billOfLading),
            headers: {
                "Content-Type": "application/json",
                "DID-JWT": getCookie("jwt"),
            },
        });
        var data = await result.json();
        billOfLading._id = data.insertedId;
        return billOfLading;
    }

    async function deployProofOfDelivery(POD) {
        var name = `POD_${Date.now()}`;
        var proofOfDelivery = database.createProofOfDelivery(name, POD);
        var contract = await _smartContract.deployProofOfDelivery(
            proofOfDelivery,
            POD.billOfLading
        );
        proofOfDelivery.contract_address = contract.options.address;
        var result = await fetch(`${broker}/proofOfDelivery`, {
            method: "post",
            mode: "cors",
            body: JSON.stringify(proofOfDelivery),
            headers: {
                "Content-Type": "application/json",
                "DID-JWT": getCookie("jwt"),
            },
        });
        var data = await result.json();
        proofOfDelivery._id = data.insertedId;
        return proofOfDelivery;
    }

    return {
        deployCharterparty,
        deployBillOfLading,
        deployProofOfDelivery,
    };
}

export function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
            return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function setCookie(name, value, exp) {
    var expires = "";
    if (exp) {
        var date = new Date();
        date.setTime(exp);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie =
        name + "=" + (value || "") + expires + "; SameSite=Lax; path=/";
}

export function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999;";
}

function smartContract(web3, abiList, account) {
    const factory = new web3.eth.Contract(
        abiList.factory.abi,
        abiList.factory.address
    );

    const methods = [
        ["createCharterparty", abiList.charterparty.abi, "CreatedCharterparty"],
        ["createBillOfLading", abiList.billOfLading.abi, "CreatedBillOfLading"],
        [
            "createProofOfDelivery",
            abiList.proofOfDelivery.abi,
            "CreatedProofOfDelivery",
        ],
    ];

    async function deployCharterparty(charterparty) {
        var hashes = jp.query(charterparty, "$..hash");
        var merkleTree = merkle(hashes);
        var root = merkleTree.getHexRoot();

        var contract = await get(methods[0]);
        await contract.methods
            .init(
                abiList.oracle.address,
                charterparty.charterer.id.delegatable,
                charterparty.shipowner.id.delegatable,
                charterparty.loading_port.agent.address,
                charterparty.discharging_port.agent.address
            )
            .send({ from: account.address, gas });

        await contract.methods
            .initialize(
                root,
                charterparty.fine,
                charterparty.max_moisture_level.hash,
                charterparty.laytime.hash
            )
            .send({ from: account.address, gas });

        return contract;
    }

    async function deployBillOfLading(billOfLading, charterpartyAddress) {
        var hashes = jp.query(billOfLading, "$..hash");
        var merkleTree = merkle(hashes);
        var root = merkleTree.getHexRoot();

        var contract = await get(methods[1]);
        await contract.methods
            .init(abiList.oracle.address, charterpartyAddress)
            .send({ from: account.address, gas });

        await contract.methods
            .initialize(
                root,
                billOfLading.date.hash,
                billOfLading.cargo.weight.hash,
                billOfLading.cargo.moisture_level.hash
            )
            .send({ from: account.address, gas });

        //save proof to db
        await post("/proofs", { merkleroot: root, leafs: hashes });

        return contract;
    }

    async function deployProofOfDelivery(proofOfDelivery, billOfLading) {
        var hashes = jp.query(proofOfDelivery, "$..hash");
        var merkleTree = merkle(hashes);
        var root = merkleTree.getHexRoot();

        var contract = await get(methods[2]);
        await contract.methods
            .init(
                abiList.oracle.address,
                billOfLading.contract_address,
                root,
                proofOfDelivery.cargo.weight.hash,
                proofOfDelivery.cargo.moisture_level.hash,
                proofOfDelivery.time_delivery.hash
            )
            .send({ from: account.address, gas });

        //save proof to db
        await post("/proofs", { merkleroot: root, leafs: hashes });

        return contract;
    }

    async function get(method) {
        var tx = await factory.methods[method[0]]().send({
            from: account.address,
            gas,
        });
        var addr = tx.events[method[2]].returnValues._address;
        return new web3.eth.Contract(method[1], addr);
    }

    return {
        deployCharterparty,
        deployBillOfLading,
        deployProofOfDelivery,
    };
}

function db(web3) {
    function createBillOfLading(name, BL) {
        var date = Date.now();

        var obj = {
            name,
            contract_address: "null",
            charterparty: BL.charterparty._id,
            vessel_id: {
                value: BL.vesselId,
                hash: hash(BL.vesselId),
            },
            consignee: BL.consignee._id,
            notify_party: {
                id: BL.notifyParty._id,
                value: BL.notifyParty.contact,
                hash: hash(BL.notifyParty.contact),
            },
            cargo: {
                description: {
                    value: BL.cargo.description,
                    hash: hash(BL.cargo.description),
                },
                moisture_level: {
                    value: BL.cargo.moisture_level,
                    hash: hash(BL.cargo.moisture_level),
                },
                nutrition_levels: {
                    details: {
                        calories: BL.cargo.nutrition.calories,
                        protein: BL.cargo.nutrition.protein,
                        carbs: BL.cargo.nutrition.carbs,
                        sugar: BL.cargo.nutrition.sugar,
                        fiber: BL.cargo.nutrition.fiber,
                        fat: BL.cargo.nutrition.fat,
                    },
                    value: "null",
                    hash: "null",
                },
                weight: {
                    value: BL.cargo.weight,
                    hash: hash(BL.cargo.weight),
                },
            },
            place: {
                value: BL.place,
                hash: hash(BL.place),
            },
            date: {
                value: date,
                hash: hash(date),
            },
            signer: {
                id: BL.agent._id,
                signature: "null",
                on_behalf_of: "charterer",
            },
            issued: false,
            deposited: false,
        };

        //aggregates nutrition-levels
        var summary = "";
        var keys = Object.keys(obj.cargo.nutrition_levels.details);
        for (var k in keys) {
            summary +=
                keys[k] +
                ":" +
                obj.cargo.nutrition_levels.details[keys[k]] +
                ",";
        }
        obj.cargo.nutrition_levels.value = summary;
        obj.cargo.nutrition_levels.hash = hash(summary);
        return obj;
    }

    function createProofOfDelivery(name, POD) {
        const obj = {
            name,
            contract_address: "null",
            billOfLading: POD.billOfLading._id,
            consignee: POD.consignee,
            shipowner: POD.shipowner,
            signature: "null",
            time_delivery: {
                value: POD.time_delivery,
                hash: hash(POD.time_delivery),
            },
            cargo: {
                weight: {
                    value: POD.cargo.weight,
                    hash: hash(POD.cargo.weight),
                },
                moisture_level: {
                    value: POD.cargo.moisture_level,
                    hash: hash(POD.cargo.moisture_level),
                },
                condition: {
                    value: POD.cargo.condition,
                    hash: hash(POD.cargo.condition),
                },
            },
        };

        return obj;
    }

    return {
        createBillOfLading,
        createProofOfDelivery,
    };
}

/**
 * Verifies the stored hashes against the merkleroot
 */
export function verify(merkleroot, obj) {
    var hashes = jp.query(obj, "$..hash");
    var merkleTree = merkle(hashes);
    var root = merkleTree.getHexRoot();
    return root == merkleroot;
}

/**
 * Hashes the stored values and verifies them against the merkleroot
 */
export function verifyRaw(merkleroot, obj) {
    var hashes = jp.query(obj, "$..value").map((e) => hash(e));
    var merkleTree = merkle(hashes);
    var root = merkleTree.getHexRoot();
    return root == merkleroot;
}

function merkle(elements) {
    return new MerkleTree(elements, keccak256, {
        hashLeaves: false,
        sortPairs: true,
    });
}

function hash(value) {
    return web3.utils.soliditySha3(value);
}

export async function put(path, update) {
    return await fetch(`${broker}${path}`, {
        method: "put",
        mode: "cors",
        body: JSON.stringify(update),
        headers: {
            "Content-Type": "application/json",
            "DID-JWT": getCookie("jwt"),
        },
    });
}

export async function post(path, obj) {
    return await fetch(`${broker}${path}`, {
        method: "post",
        mode: "cors",
        body: JSON.stringify(obj),
        headers: {
            "Content-Type": "application/json",
            "DID-JWT": getCookie("jwt"),
        },
    });
}

export async function get(path) {
    return await fetch(`${broker}${path}`, {
        method: "get",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
            "DID-JWT": getCookie("jwt"),
        },
    });
}
