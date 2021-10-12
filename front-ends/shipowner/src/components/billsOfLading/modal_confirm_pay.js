import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ListCredentials from "../credentials/show_credentials_checkbox";

const ModalConfirm = ({ show, setShow, submit, bl }) => {
    const [credential, setCredential] = useState(null);

    return (
        <Modal show={show} onHide={() => setShow(false)}>
            <Modal.Header closeButton>
                <Modal.Title>Please assign a credential</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <ListCredentials set={setCredential} bl={bl} />
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShow(false)}>
                    Close
                </Button>
                <Button
                    disabled={credential == null}
                    variant="primary"
                    onClick={() => submit(credential.jwt)}
                >
                    Submit
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalConfirm;
