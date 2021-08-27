import React, { useState, useEffect } from "react";
import Jumbotron from "react-bootstrap/Jumbotron";
import Container from "react-bootstrap/Container";
import ReactJson from "react-json-view";
import { verify } from "./credentials";

const VerifyCredential = ({ jwt }) => {
    const [credential, setCredential] = useState(null);

    useEffect(() => {
        verify(jwt).then((verifiedCred) => {
            setCredential(verifiedCred);
        });
    }, []);

    function collapse({ name, src, type }) {
        var uncollapsed = [
            "Credential",
            "verifiableCredential",
            "credentialSubject",
            "issuer",
            "type",
            "proof",
        ];
        if (uncollapsed.includes(name)) {
            return false;
        } else {
            return true;
        }
    }

    return (
        <Container>
            {credential !== null ? (
                <Jumbotron className="mt-5">
                    <h1>Verifiable Credential</h1>
                    <ReactJson
                        src={credential}
                        collapsed={3}
                        shouldCollapse={collapse}
                        name="Credential"
                        collapseStringsAfterLength={70}
                        indentWidth={4}
                    />
                </Jumbotron>
            ) : null}
        </Container>
    );
};

export default VerifyCredential;
