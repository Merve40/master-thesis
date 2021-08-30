import React, { useState, useContext, useEffect } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { Link, useHistory } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import { verifyRaw, put } from "../../util";
import { Web3Context, AbiListContext, AccountContext } from "../../App";

const DetailPOD = ({ item, makeToast, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [fine, setFine] = useState("?");

    const web3 = useContext(Web3Context);
    const abiList = useContext(AbiListContext);
    const account = useContext(AccountContext);

    useEffect(async () => {
        var contract = new web3.eth.Contract(
            abiList.proofOfDelivery.abi,
            item.contract_address
        );

        var listener = (event) => {
            var f = event.returnValues.fine;
            setFine(f);
        };

        //1 - check past events
        var logs = await contract.getPastEvents("allEvents", { fromBlock: 0 });
        console.log("logs", logs);
        if (logs.length == 1) {
            var f = logs[0].returnValues.fine;
            setFine(f);
            item.checked = true;
            onUpdate({ ...item });
        } else {
            //2 - listen for event
            contract.events.BatchQueryCompleted().on("data", listener);
            item.checked = true;
            onUpdate({ ...item });
        }

        return () => {
            contract.events.BatchQueryCompleted().off("data", listener);
        };
    }, [fine]);

    function generateSignature(contractAddress) {
        const hash = web3.utils.soliditySha3({
            v: contractAddress,
            t: "address",
        });
        return account.sign(hash).signature;
    }

    async function sign() {
        setLoading(true);
        var contract = new web3.eth.Contract(
            abiList.proofOfDelivery.abi,
            item.contract_address
        );
        var sig = generateSignature(item.contract_address);

        var tx = await contract.methods
            .submitSignature(sig)
            .send({ from: account.address, gas: 8000000 });

        item.signature = sig;
        item.checked = true;

        onUpdate({ ...item });

        //update proofOfDelivery list
        await put(`/proofOfDelivery/${item._id}`, {
            signature: sig,
            checked: true,
        });

        //update order status
        put(`/order/billOfLading/${item.billOfLading._id}`, {
            status: "closed",
        });
        setLoading(false);
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
                    <tr>
                        <td>Fine</td>
                        <td>{fine}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td>
                            <div style={{ float: "right" }}>
                                {item.checked && item.signature == "null" ? (
                                    <Button
                                        variant="outline-dark"
                                        onClick={sign}
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
                                ) : null}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export default DetailPOD;
