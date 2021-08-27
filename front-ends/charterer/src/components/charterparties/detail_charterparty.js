import React, { useState, useContext, useEffect } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import { getCookie, Deployer, verifyRaw, put } from "../../util";
import {
    AccountContext,
    UserContext,
    AbiListContext,
    Web3Context,
} from "../../App";

export default function DetailCharterparty({ element, onUpdate, makeToast }) {
    const user = useContext(UserContext);
    const abiList = useContext(AbiListContext);
    const account = useContext(AccountContext);
    const web3 = useContext(Web3Context);

    const [loading, setLoading] = useState(false);
    const [deployer, setDeployer] = useState(null);
    const gas = 400000;
    const item = element;
    var contract;

    useEffect(() => {
        Deployer(account, abiList).then((object) => {
            setDeployer(object);
        });
    }, []);

    async function onClickValidate() {
        setLoading(true);

        var contract = new web3.eth.Contract(
            abiList.charterparty.abi,
            item.contract_address
        );

        // get merkleroot
        const root = await contract.methods.merkleroot();
        const verified = verifyRaw(root, item);
        makeToast("Charterparty", `Verified merkleroot`);
        setLoading(false);
    }

    async function onClickDeploy() {
        setLoading(true);

        var response = await deployer.deployCharterparty(item);

        onUpdate({
            ...item,
        });
        makeToast("Charterparty", `Deployed charterparty`);
        setLoading(false);
    }

    async function onClickSign() {
        var hash = web3.utils.soliditySha3({
            t: "bytes",
            v: item.contract_address,
        });
        var signature = account.sign(hash).signature;

        console.log("onSign()", item.contract_address);

        // call contract
        var contract = new web3.eth.Contract(
            abiList.charterparty.abi,
            item.contract_address
        );

        await contract.methods
            .submitSignature(signature)
            .send({ from: account.address, gas });

        // update db
        item.charterer.signature = signature;
        var update = { "charterer.signature": signature };
        var response = await put(`/charterparty/${item._id}`, update);

        if (response.status !== 500) {
            // update UI
            onUpdate({
                ...item,
                charterer: {
                    ...signature,
                },
            });
            makeToast("Charterparty", `Submitted signature`);
        } else {
            makeToast("Charterparty", `Operation failed`);
        }
    }

    function initButton() {
        if (user.role !== "charterer") {
            return null;
        }
        if (item.contract_address === "null") {
            return (
                <Button variant="outline-dark" onClick={onClickDeploy}>
                    {loading ? (
                        <Spinner
                            className="mr-2"
                            animation="border"
                            size="sm"
                        />
                    ) : null}
                    Deploy contract
                </Button>
            );
        } else if (item.charterer.signature === "null") {
            return (
                <Button variant="outline-dark" onClick={onClickSign}>
                    {loading ? (
                        <Spinner
                            className="mr-2"
                            animation="border"
                            size="sm"
                        />
                    ) : null}
                    Sign contract
                </Button>
            );
        } else return null;
    }

    return (
        <div>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Contract address:</td>
                        <td
                            style={
                                item.contract_address === "null"
                                    ? { color: "gray" }
                                    : { color: "" }
                            }
                        >
                            {item.contract_address}
                        </td>
                    </tr>
                    <tr>
                        <td>Shipowner:</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: "/profile",
                                    state: item.shipowner.id,
                                }}
                            >
                                {item.shipowner.id.name}
                            </Link>
                        </td>
                    </tr>
                    <tr>
                        <td>Loading port:</td>
                        <td style={{ color: "gray" }}>
                            {item.loading_port.value}
                        </td>
                    </tr>
                    <tr>
                        <td>Discharging port:</td>
                        <td style={{ color: "gray" }}>
                            {item.discharging_port.value}
                        </td>
                    </tr>
                    <tr>
                        <td>Agent at loading port:</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: "/profile",
                                    state: item.loading_port.agent,
                                }}
                            >
                                {item.loading_port.agent.name}
                            </Link>
                        </td>
                    </tr>
                    <tr>
                        <td>Agent at discharging port:</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: "/profile",
                                    state: item.discharging_port.agent,
                                }}
                            >
                                {item.discharging_port.agent.name}
                            </Link>
                        </td>
                    </tr>
                    <tr>
                        <td>Freight rate:</td>
                        <td style={{ color: "gray" }}>
                            {item.freight_rate.value}
                        </td>
                    </tr>
                    <tr>
                        <td>Max. moisture level:</td>
                        <td style={{ color: "gray" }}>
                            {item.max_moisture_level.value}
                        </td>
                    </tr>
                    <tr>
                        <td>Max. deadweight of ship:</td>
                        <td style={{ color: "gray" }}>
                            {item.max_deadweight.value}
                        </td>
                    </tr>
                    <tr>
                        <td>Max. volume capacity of ship:</td>
                        <td style={{ color: "gray" }}>
                            {item.max_volume_cap.value}
                        </td>
                    </tr>
                    <tr>
                        <td></td>
                        <td>
                            <div style={{ float: "right" }}>{initButton()}</div>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
}
