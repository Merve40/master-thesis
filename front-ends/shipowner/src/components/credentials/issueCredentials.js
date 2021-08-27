import React, { useState, useContext, useEffect } from "react";
import { withRouter } from "react-router";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import Spinner from "react-bootstrap/Spinner";
import { getCookie, get, post } from "../../util";
import { issue, verify } from "./credentials";
import { Web3Context, AccountContext, UserContext } from "../../App";

const IssueCredentials = ({ history, makeToast, vesselId }) => {
    const web3 = useContext(Web3Context);
    const account = useContext(AccountContext);
    const user = useContext(UserContext);

    const [loading, setLoading] = useState(false);
    const [isConditionInvalid, setIsConditionInvalid] = useState(false);
    const [isSubjectInvalid, setIsSubjectInvalid] = useState(false);
    const [condition, setCondition] = useState(null);
    const [subject, setSubject] = useState(null);

    const [masters, setMasters] = useState([]);
    const [carrier, setCarrier] = useState(null);
    const [placeholder, setPlaceholder] = useState("did:ethr:development:");

    useEffect(() => {
        get(`/masters`)
            .then((response) => response.json())
            .then((data) => setMasters(data));

        get(`/carrier`)
            .then((response) => response.json())
            .then((data) => {
                setCarrier(data);
                setPlaceholder(`did:ethr:development:${data.delegatable}`);
            });
    }, []);

    async function onClickSubmit() {
        setLoading(true);
        const credentialType = "VesselInspectionCredential";
        const payload = {
            vesselId,
            carrier: carrier.delegatable,
            vesselCondition: condition,
        };

        if (checkValues()) {
            const date = Math.round(Date.now() / 1000);
            const cred = await issue(
                account,
                subject,
                date,
                credentialType,
                payload
            );
            //save the credentials
            const newCred = {
                issuer: account.address,
                subject,
                date,
                jwt: cred,
            };
            post(`/credentials`, newCred);
            makeToast("Credential", "Issued credential to master");
            history.push("/");
        }
        setLoading(false);
    }

    function checkValues() {
        var isComplete = true;
        if (condition === null || condition.trim().length === 0) {
            setIsConditionInvalid(true);
            isComplete = false;
        } else {
            setIsConditionInvalid(false);
        }
        if (subject === null || subject.trim().length === 0) {
            setIsSubjectInvalid(true);
            isComplete = false;
        } else {
            setIsSubjectInvalid(false);
        }

        return isComplete;
    }

    return (
        <Container className="mt-5">
            <div
                className="h3 mt-2 p-3 bg-light"
                style={{ borderRadius: "5px" }}
            >
                Issue Vessel Inspection Credential
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
                <Form.Group as={Row} hasValidation>
                    <Form.Label column sm="2">
                        Subject
                    </Form.Label>
                    <Col sm="10">
                        <InputGroup>
                            <InputGroup.Text id="basic-addon1">
                                did:ethr:development:
                            </InputGroup.Text>
                            <Form.Control
                                id="vessel"
                                as="select"
                                required
                                aria-describedby="basic-addon1"
                                isInvalid={isSubjectInvalid}
                                onChange={(e) => setSubject(e.target.value)}
                            >
                                <option></option>
                                {masters.length > 0
                                    ? masters.map((_, index) => (
                                          <option>
                                              {masters[index].address}
                                          </option>
                                      ))
                                    : null}
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">
                                Please select a subject
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Credential Type
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder="VesselInspectionCredential"
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Vessel ID
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={vesselId}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column sm="2">
                        Carrier
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            type="text"
                            readOnly
                            placeholder={placeholder}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row} hasValidation>
                    <Form.Label column sm="2">
                        Vessel Condition *
                    </Form.Label>
                    <Col sm="10">
                        <Form.Control
                            id="condition"
                            as="select"
                            required
                            isInvalid={isConditionInvalid}
                            onChange={(e) => setCondition(e.target.value)}
                        >
                            <option></option>
                            <option>Clean</option>
                            <option>Not clean</option>
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

export default withRouter(IssueCredentials);
