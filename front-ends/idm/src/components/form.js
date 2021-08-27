import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import DidJwt from "did-jwt";
import { authenticate, setCookie } from "./client";

const IDMForm = ({ web3 }) => {
    const [loading, setLoading] = useState(false);
    const [danger, showDanger] = useState(false);
    const [error, setError] = useState(null);

    const [privateKey, setPrivateKey] = useState(null);
    const [ens, setEns] = useState(null);

    async function onClick() {
        setLoading(true);

        // check inputs
        if (privateKey.trim() === "" || ens.trim() === "") {
            return;
        }
        var _privateKey = privateKey;
        if (!privateKey.startsWith("0x")) {
            _privateKey = "0x" + privateKey;
        }

        var _ens = ens + ".eth";
        const [isAuthenticated, result] = await authenticate(
            web3,
            _privateKey,
            _ens
        );

        setLoading(false);

        if (!isAuthenticated) {
            console.error(result);
            setError(result);
            showDanger(true);
            return;
        }

        // set cookies
        var decoded = DidJwt.decodeJWT(result.jwt);
        setCookie("address", result.address, decoded.payload.exp * 1000);
        setCookie("privateKey", privateKey, decoded.payload.exp * 1000);
        setCookie("jwt", result.jwt, decoded.payload.exp * 1000);

        // navigate to broker
        window.location.replace(result.brokerUrl);
    }

    return (
        <Container className="mt-5">
            <p className="h4">Please identify yourself:</p>
            <Form className="mt-4">
                <Form.Group>
                    <Form.Label>Private Key:</Form.Label>
                    <Form.Control
                        id="input_privkey"
                        type="text"
                        placeholder="Enter your private key"
                        onChange={(e) => setPrivateKey(e.target.value)}
                    />
                </Form.Group>

                <Form.Group>
                    <Form.Label>Broker Domain:</Form.Label>
                    <InputGroup className="mb-3">
                        <Form.Control
                            id="input_ens"
                            placeholder="ethereum name service (ens)"
                            onChange={(e) => setEns(e.target.value)}
                        />
                        <InputGroup.Append>
                            <InputGroup.Text>.eth</InputGroup.Text>
                        </InputGroup.Append>
                    </InputGroup>
                </Form.Group>

                <Row className="mt-5">
                    <Col sm={3}>
                        <Button variant="primary" onClick={onClick}>
                            {loading ? (
                                <Spinner
                                    className="mr-2"
                                    animation="border"
                                    size="sm"
                                />
                            ) : null}
                            Login
                        </Button>
                    </Col>
                    <Col sm={9}>
                        {danger ? (
                            <Alert className="ml-4" variant="danger">
                                {error}
                            </Alert>
                        ) : null}
                    </Col>
                </Row>
            </Form>
        </Container>
    );
};

export default IDMForm;
