import React from "react";
import Accordion from "react-bootstrap/Accordion";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import DetailPOD from "./detail_pod";

const ProofOfDelivery = ({ item, index, makeToast, onUpdate }) => {
    return (
        <div>
            <Accordion>
                <Card>
                    <Card.Header>
                        <Accordion.Toggle
                            as={Button}
                            variant="link"
                            eventKey="0"
                        >
                            Proof of Delivery #{index}
                        </Accordion.Toggle>
                        {item.checked ? (
                            <Badge
                                className="ml-1"
                                style={{ float: "inline-end" }}
                                variant="success"
                            >
                                checked
                            </Badge>
                        ) : (
                            <Badge
                                className="ml-1"
                                style={{ float: "inline-end" }}
                                variant="secondary"
                            >
                                unchecked
                            </Badge>
                        )}

                        {item.signature !== "null" ? (
                            <Badge
                                className="ml-1"
                                style={{ float: "inline-end" }}
                                variant="success"
                            >
                                signed
                            </Badge>
                        ) : (
                            <Badge
                                className="ml-1"
                                style={{ float: "inline-end" }}
                                variant="secondary"
                            >
                                unsigned
                            </Badge>
                        )}
                    </Card.Header>
                    <Accordion.Collapse eventKey="0">
                        <Card.Body>
                            <DetailPOD
                                item={item}
                                makeToast={makeToast}
                                onUpdate={onUpdate}
                            />
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
            </Accordion>
        </div>
    );
};

export default ProofOfDelivery;
