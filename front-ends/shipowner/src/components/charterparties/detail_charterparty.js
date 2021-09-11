import React, { useState, useContext } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import { put, verifyRaw } from "../../util";
import { AccountContext, Web3Context, AbiListContext } from "../../App";

export default function DetailCharterparty({ makeToast, element, onUpdate }) {
    const account = useContext(AccountContext);
    const abiList = useContext(AbiListContext);
    const web3 = useContext(Web3Context);

    const [loading, setLoading] = useState(false);
    const gas = 4000000;
    const item = element;

    async function onClickSign() {
        var contract = new web3.eth.Contract(
            abiList.charterparty.abi,
            item.contract_address
        );

        var hash = web3.utils.soliditySha3(contract.options.address);
        var signature = account.sign(hash).signature;
        await contract.methods
            .submitSignature(signature)
            .send({ from: account.address, gas });

        item.shipowner.signature = signature;
        await put(`/charterparty/${item._id}`, {
            "shipowner.signature": signature,
        });

        onUpdate({
            ...item,
        });
        makeToast("Charterparty", `Signed contract`);
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
                                    pathname: `/profile`,
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
                                    pathname: `/profile`,
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
                                    pathname: `/profile`,
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
                            {item.contract_address != "null" &&
                            item.shipowner.signature == "null" ? (
                                <div style={{ float: "right" }}>
                                    <Button
                                        variant="outline-dark"
                                        onClick={onClickSign}
                                    >
                                        {loading ? (
                                            <Spinner
                                                className="mr-2"
                                                animation="border"
                                                size="sm"
                                            />
                                        ) : null}
                                        Sign contract
                                    </Button>
                                </div>
                            ) : null}
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
}
