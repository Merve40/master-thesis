import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { GrClose } from "react-icons/gr";

import Stepper from "./stepper";

const ModalVerify = ({ show, setShow, loading, steps }) => {
    useEffect(() => {}, [loading]);
    return (
        <Modal
            scrollable
            fullscreen
            show={show}
            onHide={() => setShow(false)}
            size="xl"
        >
            <Modal.Header>
                <Modal.Title>
                    {loading ? (
                        <Spinner
                            animation="grow"
                            variant="secondary"
                            size="sm"
                            style={{
                                marginRight: "10px",
                            }}
                        />
                    ) : null}
                    Verify Delivery
                </Modal.Title>
                <a
                    href=""
                    onClick={(e) => {
                        e.preventDefault();
                        setShow(false);
                    }}
                >
                    <GrClose size="0.7em" />
                </a>
            </Modal.Header>
            <Modal.Body>
                <Stepper steps={steps} />
            </Modal.Body>
        </Modal>
    );
};

export default ModalVerify;
