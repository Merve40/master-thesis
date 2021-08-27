import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import DetailCredential from "./detail_credential";
import { get } from "../../util";
import { Web3Context, AccountContext, UserContext } from "../../App";

const ShowCredentials = () => {
    const [credentials, setCredentials] = useState([]);
    const user = useContext(UserContext);
    const account = useContext(AccountContext);

    useEffect(() => {
        get(`/credentials/${user._id}`)
            .then((response) => response.json())
            .then((data) => {
                setCredentials(data);
            });
    }, []);

    return (
        <Container className="mt-5">
            <div
                className="h3 mt-2 p-3 bg-light"
                style={{ borderRadius: "5px" }}
            >
                Credentials:
            </div>
            {credentials.length > 0 ? (
                credentials.map((_, index) => (
                    <Accordion>
                        <Card>
                            <Card.Header>
                                <Accordion.Toggle
                                    as={Button}
                                    variant="link"
                                    eventKey="0"
                                >
                                    Credential #{index}
                                </Accordion.Toggle>
                            </Card.Header>
                            <Accordion.Collapse eventKey="0">
                                <Card.Body>
                                    <DetailCredential
                                        credential={credentials[index]}
                                    />
                                </Card.Body>
                            </Accordion.Collapse>
                        </Card>
                    </Accordion>
                ))
            ) : (
                <div className="mt-3" style={{ color: "gray" }}>
                    There are currently no Credentials
                </div>
            )}
        </Container>
    );
};

export default ShowCredentials;
