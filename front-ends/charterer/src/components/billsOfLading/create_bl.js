import React, { useState, useEffect, useContext } from "react";
import { Link, useHistory } from "react-router-dom";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner";
import { getCookie, Deployer, get, put } from "../../util";
import {
    AccountContext,
    Web3Context,
    UserContext,
    AbiListContext,
} from "../../App";

const CreateBL = ({ item, update, makeToast }) => {
    const [consignee, setConsignee] = useState({ owner: "" });
    const [deployer, setDeployer] = useState(null);
    const [loading, setLoading] = useState(false);

    var abiList = useContext(AbiListContext);
    var account = useContext(AccountContext);
    var web3 = useContext(Web3Context);
    var user = useContext(UserContext);
    var history = useHistory();

    useEffect(() => {
        Deployer(account, abiList).then((d) => setDeployer(d));

        get(`/consignee/${item.charterparty.contract_address}`)
            .then((response) => response.json())
            .then((data) => setConsignee(data));
    }, []);

    async function onClickSubmit() {
        setLoading(true);
        var vesselId = document.querySelector("#vesselId").value.trim();
        var cargoWeight = document.querySelector("#cargoWeight").value.trim();
        var moistureLevel = document
            .querySelector("#moistureLevel")
            .value.trim();
        var location = document.querySelector("#location").value.trim();

        if (
            vesselId.length > 0 &&
            cargoWeight.length > 0 &&
            moistureLevel.length > 0
        ) {
            var BL = {
                cargo: item.cargo,
            };
            BL.charterparty = item.charterparty;
            BL.vesselId = vesselId;
            BL.notifyParty = item.buyer;
            BL.agent = user;
            BL.consignee = consignee;

            BL.cargo.moisture_level = parseInt(moistureLevel);
            BL.cargo.weight = parseInt(cargoWeight);
            BL.place = location;

            var newBL = await deployer.deployBillOfLading(
                BL,
                item.charterparty.contract_address
            );
            //update order: set BL id
            var data = {
                billOfLading: newBL._id,
            };
            put(`/order/${item._id}`, data);

            makeToast("Bill of Lading", "Deployed contract");
            update();
            history.push("/billsOfLading");
        }
        setLoading(false);
    }

    return (
        <Container className="mt-5">
            <Link to="/"> Go back</Link>
            <div
                className="h3 mt-2 p-3 bg-light"
                style={{ borderRadius: "5px" }}
            >
                Create Bill of Lading
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
                        Charterparty
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={item.charterparty.contract_address}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Vessel Id *
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control id="vesselId" type="text" />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Port *
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control id="location" type="text" />
                    </Col>
                </Form.Group>

                <Form.Group as={Row} controlId="exampleForm.SelectCustom">
                    <Form.Label column sm="2">
                        Consignee
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={consignee.name}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Buyer
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={item.buyer.name}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Cargo Description
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={item.cargo.description}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Cargo Weight *
                    </Form.Label>
                    <Col sm="10">
                        <InputGroup hasValidation>
                            <Form.Control
                                id="cargoWeight"
                                type="number"
                                required
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
                        Moisture Level *
                    </Form.Label>
                    <Col sm="10">
                        <InputGroup hasValidation>
                            <Form.Control
                                id="moistureLevel"
                                type="number"
                                required
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
            </Form>

            <p className="h5 mt-4">Nutrition </p>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Calories</td>
                        <td style={{ color: "#6c757d" }}>
                            {item.cargo.nutrition.calories}
                        </td>
                    </tr>
                    <tr>
                        <td>Protein</td>
                        <td style={{ color: "#6c757d" }}>
                            {item.cargo.nutrition.protein}
                        </td>
                    </tr>
                    <tr>
                        <td>Carbs</td>
                        <td style={{ color: "#6c757d" }}>
                            {item.cargo.nutrition.carbs}
                        </td>
                    </tr>
                    <tr>
                        <td>Sugar</td>
                        <td style={{ color: "#6c757d" }}>
                            {item.cargo.nutrition.calories}
                        </td>
                    </tr>
                    <tr>
                        <td>Fiber</td>
                        <td style={{ color: "#6c757d" }}>
                            {item.cargo.nutrition.fiber}
                        </td>
                    </tr>
                    <tr>
                        <td>Fat</td>
                        <td style={{ color: "#6c757d" }}>
                            {item.cargo.nutrition.fat}
                        </td>
                    </tr>
                </tbody>
            </Table>
        </Container>
    );
};

export default CreateBL;
