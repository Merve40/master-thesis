import React, { useState, useContext, useEffect } from "react";
import { withRouter } from "react-router";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";
import Spinner from "react-bootstrap/Spinner";
import { getCookie, Deployer, put } from "../../util";
import {
    Web3Context,
    AccountContext,
    UserContext,
    AbiListContext,
} from "../../App";

const CreatePOD = ({ history, item, makeToast, onAdd, onUpdate }) => {
    const abiList = useContext(AbiListContext);
    const web3 = useContext(Web3Context);
    const account = useContext(AccountContext);
    const user = useContext(UserContext);

    const [deployer, setDeployer] = useState(null);
    const [loading, setLoading] = useState(false);

    const [isTimeInvalid, setIsTimeInvalid] = useState(false);
    const [isDateInvalid, setIsDateInvalid] = useState(false);
    const [isLocationInvalid, setIsLocationInvalid] = useState(false);
    const [isWeightInvalid, setIsWeightInvalid] = useState(false);
    const [isMoistureInvalid, setIsMoistureInvalid] = useState(false);
    const [isConditionInvalid, setIsConditionInvalid] = useState(false);

    useEffect(() => {
        Deployer(account, abiList).then((dep) => setDeployer(dep));
    }, []);

    async function onClickSubmit() {
        setLoading(true);
        const time = document.querySelector("#time");
        const date = document.querySelector("#date");
        const weight = document.querySelector("#weight");
        const moisture_level = document.querySelector("#moisture_level");
        const condition = document.querySelector("#condition");
        const location = document.querySelector("#location");

        const values = [
            { o: time, setState: setIsTimeInvalid },
            { o: date, setState: setIsDateInvalid },
            { o: weight, setState: setIsWeightInvalid },
            { o: location, setState: setIsLocationInvalid },
            { o: moisture_level, setState: setIsMoistureInvalid },
            { o: condition, setState: setIsConditionInvalid },
        ];

        if (!checkValues(values)) {
            setLoading(false);
            return;
        }

        const obj = {
            billOfLading: item,
            consignee: user._id,
            shipowner: item.charterparty.shipowner.id,
            time_delivery: Date.parse(`${date.value} ${time.value}`),
            port: location.value,
            cargo: {
                weight: weight.value.trim(),
                condition: condition.value.trim(),
                moisture_level: moisture_level.value.trim(),
            },
            signature: "null",
        };

        try {
            var proofOfDelivery = await deployer.deployProofOfDelivery(obj);
            var signature = generateSignature(proofOfDelivery.contract_address);
            // update state of BL
            item.issued = true;
            await put(`/billOfLading/${item._id}`, { issued: true });
            onUpdate({ ...item });
            //update proofOfDelivery list
            await put(`/proofOfDelivery/${proofOfDelivery._id}`, { signature });
            onAdd();

            //update order status
            put(`/order/billOfLading/${item._id}`, { status: "closed" });

            history.push("/proofOfDeliveries");
        } catch (error) {
            console.error(error);
            makeToast("PoD Signature", "Could not sign PoD");
        }
        setLoading(false);
    }

    function checkValues(values) {
        var isComplete = true;

        for (var i in values) {
            const item = values[i];
            if (item.o.value.trim().length === 0) {
                item.setState(true);
                isComplete = false;
            } else {
                item.setState(false);
            }
        }

        return isComplete;
    }

    function generateSignature(contractAddress) {
        const hash = web3.utils.soliditySha3({
            v: contractAddress,
            t: "address",
        });
        return account.sign(hash).signature;
    }

    return (
        <Container className="mt-5">
            <div
                className="h3 mt-2 p-3 bg-light"
                style={{ borderRadius: "5px" }}
            >
                Create Proof of Delivery
                <div style={{ float: "right" }}>
                    <Button
                        variant="primary"
                        type="submit"
                        onClick={onClickSubmit}
                    >
                        {loading ? (
                            <Spinner
                                className="mr-2"
                                animation="border"
                                size="sm"
                            />
                        ) : null}
                        Submit
                    </Button>
                </div>
            </div>

            <Form className="mt-3">
                <Form.Group as={Row} controlId="formPlaintextEmail">
                    <Form.Label column sm="2">
                        Bill of Lading
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={item.contract_address}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Vessel Id
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={item.vessel_id.value}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Shipowner
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={item.charterparty.shipowner.id}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row} hasValidation>
                    <Form.Label column sm="2">
                        Time of delivery *
                    </Form.Label>
                    <Col sm="5">
                        <Form.Control
                            id="time"
                            type="time"
                            required
                            isInvalid={isTimeInvalid}
                        />
                        <Form.Control.Feedback type="invalid">
                            Please enter a time
                        </Form.Control.Feedback>
                    </Col>
                    <Col sm="5">
                        <Form.Control
                            id="date"
                            type="date"
                            required
                            isInvalid={isDateInvalid}
                        />
                        <Form.Control.Feedback type="invalid">
                            Please enter a date
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Port *
                    </Form.Label>
                    <Col sm="10">
                        <InputGroup hasValidation>
                            <Form.Control
                                id="location"
                                type="text"
                                required
                                isInvalid={isLocationInvalid}
                            />
                            <Form.Control.Feedback type="invalid">
                                Please enter a port
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Cargo weight *
                    </Form.Label>
                    <Col sm="10">
                        <InputGroup hasValidation>
                            <Form.Control
                                id="weight"
                                type="number"
                                required
                                isInvalid={isWeightInvalid}
                            />
                            <InputGroup.Append>
                                <InputGroup.Text>tons</InputGroup.Text>
                            </InputGroup.Append>
                            <Form.Control.Feedback type="invalid">
                                Please enter a number
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Measured Moisture Level *
                    </Form.Label>
                    <Col sm="10">
                        <InputGroup className="" hasValidation>
                            <Form.Control
                                id="moisture_level"
                                type="number"
                                min="0"
                                max="20"
                                required
                                isInvalid={isMoistureInvalid}
                            />
                            <InputGroup.Append>
                                <InputGroup.Text>%</InputGroup.Text>
                            </InputGroup.Append>
                            <Form.Control.Feedback type="invalid">
                                Please enter a number
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Col>
                </Form.Group>

                <Form.Group as={Row} hasValidation>
                    <Form.Label column sm="2">
                        Cargo condition *
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            id="condition"
                            as="select"
                            required
                            isInvalid={isConditionInvalid}
                        >
                            <option></option>
                            <option>OK</option>
                            <option>Not OK</option>
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">
                            Please select a condition
                        </Form.Control.Feedback>
                    </Col>
                </Form.Group>
            </Form>
        </Container>
    );
};

export default withRouter(CreatePOD);
