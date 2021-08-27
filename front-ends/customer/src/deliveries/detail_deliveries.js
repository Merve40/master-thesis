import React, { useContext, useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import Modal from "../components/modal";
import { AbiListContext, Web3Context } from "../App";
import { getProof, verify } from "../util";

const DetailDelivery = ({ item, onUpdate }) => {
    const web3 = useContext(Web3Context);
    const abiList = useContext(AbiListContext);

    const [show, setShow] = useState(false);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const [steps, setSteps] = useState([
        {
            name: "Query merkleroot of BillOfLading and ProofOfDelivery",
            payload: "",
            finished: false,
        },
        {
            name: "Resolve DID-document for BillOfLading & get oracle servce-endpoint",
            finished: false,
        },
        {
            name: "GET /proofs/:merkleroot",
            finished: false,
        },
        {
            name: "Verify merkletree of BillOfLading",
            finished: false,
        },
        {
            name: "Resolve DID-document for ProofOfDelivery & get oracle servce-endpoint",
            finished: false,
        },
        {
            name: "GET /proofs/:merkleroot",
            finished: false,
        },
        {
            name: "Verify merkletree of ProofOfDelivery",
            finished: false,
        },
    ]);

    var currentStep = 0;

    useEffect(() => {}, [show, loading]);

    async function verifyData() {
        setLoading(true);
        setShow(true);

        var oracle = new web3.eth.Contract(
            abiList.oracle.abi,
            abiList.oracle.address
        );

        //get merkleroots
        var events = await oracle.getPastEvents("Merkleroot", {
            filter: {
                srcContract: [item.billOfLading, item.proofOfDelivery],
            },
            fromBlock: 0,
        });

        var payload = `BillOfLading (creator:${events[0].returnValues.setter}, merkleroot:${events[0].returnValues.merkleroot})\n`;
        payload += `ProofOfDelivery (creator:${events[1].returnValues.setter}, merkleroot:${events[1].returnValues.merkleroot})`;
        nextStep({ payload });

        //get proofs from oracles
        var setter1 = events[0].returnValues.setter;
        var merkleroot1 = events[0].returnValues.merkleroot;
        var proof = await getProof(setter1, abiList, merkleroot1, nextStep);

        var result = verify(merkleroot1, proof.leafs, [
            item.description,
            item.loading_port,
            item.loading_time,
        ]);
        nextStep();

        var setter2 = events[1].returnValues.setter;
        var merkleroot2 = events[1].returnValues.merkleroot;
        proof = await getProof(setter2, abiList, merkleroot2, nextStep);

        var result2 = verify(merkleroot2, proof.leafs, [
            item.moisture_level,
            item.weight,
            item.discharging_time,
        ]);
        nextStep();

        if (result && result2) {
            item.verified = true;
            onUpdate({ ...item });

            var update = { verified: true };
            await fetch(
                `${process.env.REACT_APP_SERVER}/deliveries/${item._id}`,
                {
                    method: "put",
                    mode: "cors",
                    body: JSON.stringify(update),
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        } else {
            setError(true);
        }
        setLoading(false);
    }

    function nextStep(obj = {}) {
        if (currentStep >= steps.length) {
            currentStep = 0;
            return;
        }
        var step = steps[currentStep];
        if ("name" in obj) {
            step.name = obj.name;
        }
        if ("payload" in obj) {
            step.payload = obj.payload;
        }
        step.finished = true;

        setSteps(steps.map((s, i) => (i == currentStep ? step : s)));
        currentStep++;
    }

    return (
        <div>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Bill of Lading:</td>
                        <td>{item.billOfLading}</td>
                    </tr>
                    <tr>
                        <td>Proof of Delivery:</td>
                        <td>{item.proofOfDelivery}</td>
                    </tr>

                    <tr>
                        <td>Departure:</td>
                        <td
                            style={{
                                color: "gray",
                                fontSize: "20px",
                            }}
                        >
                            <pre>
                                {new Date(
                                    parseInt(item.loading_time)
                                ).toLocaleString()}
                            </pre>
                        </td>
                    </tr>

                    <tr>
                        <td>Arrival:</td>
                        <td
                            style={{
                                color: "gray",
                                fontSize: "20px",
                            }}
                        >
                            <pre>
                                {new Date(
                                    parseInt(item.discharging_time)
                                ).toLocaleString()}
                            </pre>
                        </td>
                    </tr>

                    <tr>
                        <td>Weight:</td>
                        <td style={{ color: "gray" }}>{item.weight} tons</td>
                    </tr>

                    <tr>
                        <td>Description:</td>
                        <td style={{ color: "gray" }}>{item.description}</td>
                    </tr>
                    <tr>
                        <td>Moisture Level:</td>
                        <td style={{ color: "gray" }}>
                            {item.moisture_level} %
                        </td>
                    </tr>
                    <tr>
                        <td>Nutrition Levels:</td>
                        <td style={{ color: "gray" }}>
                            {item.nutrition_levels}
                        </td>
                    </tr>
                    {!item.verified ? (
                        <tr>
                            <td></td>
                            <td>
                                <Row>
                                    <Col>
                                        {error ? (
                                            <div
                                                style={{
                                                    float: "right",
                                                }}
                                            >
                                                <Alert
                                                    className="p-1"
                                                    variant="danger"
                                                >
                                                    Verification failed!
                                                </Alert>
                                            </div>
                                        ) : null}
                                    </Col>
                                    <Col>
                                        <div
                                            style={{
                                                float: "right",
                                            }}
                                        >
                                            <Button
                                                variant="outline-dark"
                                                onClick={verifyData}
                                            >
                                                Verify
                                            </Button>
                                        </div>
                                    </Col>
                                </Row>
                            </td>
                        </tr>
                    ) : null}
                </tbody>
            </Table>
            <Modal
                show={show}
                setShow={setShow}
                loading={loading}
                steps={steps}
            />
        </div>
    );
};

export default DetailDelivery;
