import React, { useState, useContext } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { Link, useHistory } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import { verifyRaw } from "../../util";
import { Web3Context, AbiListContext } from "../../App";

const DetailPOD = ({ item, makeToast }) => {
    const [loading, setLoading] = useState(false);
    const web3 = useContext(Web3Context);
    const abiList = useContext(AbiListContext);

    async function onClickValidate() {
        setLoading(true);
        var contract = new web3.eth.Contract(
            abiList.proofOfDelivery.abi,
            item.contract_address
        );
        var root = await contract.methods.merkleroot();
        var verified = verifyRaw(root, item);
        setLoading(false);

        var result = verified ? "Contract is valid" : "Contract is not valid";
        makeToast("Proof of Delivery", result);
    }

    return (
        <div>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Name</td>
                        <td style={{ color: "gray" }}>{item.name}</td>
                    </tr>
                    <tr>
                        <td>Contract address:</td>
                        <td>{item.contract_address}</td>
                    </tr>
                    <tr>
                        <td>Bill of Lading</td>
                        <td>{item.billOfLading.contract_address}</td>
                    </tr>

                    <tr>
                        <td>Vessel ID</td>
                        <td style={{ color: "gray" }}>
                            #{item.billOfLading.vessel_id.value}
                        </td>
                    </tr>

                    <tr>
                        <td>Shipowner</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: "/profile",
                                    state: item.shipowner,
                                }}
                            >
                                {item.shipowner.name}
                            </Link>
                        </td>
                    </tr>
                    <tr>
                        <td>Time of Delivery</td>
                        <td style={{ color: "gray" }}>
                            {new Date(
                                parseInt(item.time_delivery.value)
                            ).toLocaleString()}
                        </td>
                    </tr>
                    <tr>
                        <td>Cargo Weight</td>
                        <td>{item.cargo.weight.value} tons</td>
                    </tr>
                    <tr>
                        <td>Moisture Level</td>
                        <td>{item.cargo.moisture_level.value} %</td>
                    </tr>
                    <tr>
                        <td>Cargo Condition</td>
                        <td>{item.cargo.condition.value}</td>
                    </tr>
                    <tr>
                        <td className="col-4">Signature</td>
                        <td className="col-8">
                            <div
                                style={{
                                    wordWrap: "break-word",
                                    wordBreak: "break-all",
                                    textAlign: "justify",
                                }}
                            >
                                {item.signature}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export default DetailPOD;
