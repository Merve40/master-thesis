import React, { useState, useEffect } from "react";
import { withRouter } from "react-router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import InputGroup from "react-bootstrap/InputGroup";
import { getCookie, get } from "../util";

const Vessels = ({ history, loadBills }) => {
    const [vessels, setVessels] = useState([]);
    const [vessel, setVessel] = useState(null);
    const [isVesselInvalid, setIsVesselInvalid] = useState(false);

    useEffect(() => {
        get(`/vessels`)
            .then((response) => response.json())
            .then((data) => {
                setVessels(data);
            });
    }, []);

    function submit() {
        if (vessel) {
            loadBills(vessel);
            history.push({ pathname: `/billsOfLading`, state: vessel });
        } else {
            setIsVesselInvalid(true);
        }
    }

    return (
        <Container>
            <div
                className="h3 mt-2 p-3 bg-light"
                style={{ borderRadius: "5px" }}
            >
                Select a vessel
                <div style={{ float: "right" }}>
                    <Button variant="primary" type="submit" onClick={submit}>
                        Submit
                    </Button>
                </div>
            </div>
            <Form.Group as={Row} hasValidation>
                <Form.Label column sm="2">
                    Vessel Id *
                </Form.Label>
                <Col sm="10">
                    <Form.Control
                        id="vessel"
                        as="select"
                        required
                        isInvalid={isVesselInvalid}
                        onChange={(e) => setVessel(e.target.value)}
                    >
                        <option></option>
                        {vessels.length > 0
                            ? vessels.map((_, index) => (
                                  <option>{vessels[index].value}</option>
                              ))
                            : null}
                    </Form.Control>
                    <Form.Control.Feedback type="invalid">
                        Please select a vessel
                    </Form.Control.Feedback>
                </Col>
            </Form.Group>
        </Container>
    );
};

export default withRouter(Vessels);
