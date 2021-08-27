import React from "react";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import DetailBL from "./detail_bl";

const BillOfLading = ({ item, index, makeToast, onUpdate }) => {
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
                            Bill of Lading #{index}
                        </Accordion.Toggle>
                        {item.signer.signature !== "null" ? (
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

                        <Badge
                            style={{ float: "inline-end" }}
                            variant={item.deposited ? "success" : "secondary"}
                        >
                            {item.deposited
                                ? "deposit paid"
                                : "deposit pending"}
                        </Badge>
                    </Card.Header>
                    <Accordion.Collapse eventKey="0">
                        <Card.Body>
                            <DetailBL
                                element={item}
                                index={index}
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

export default BillOfLading;
