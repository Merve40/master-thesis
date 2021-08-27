import React from "react";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import DetailBL from "./detail_bl";
import Badge from "react-bootstrap/Badge";

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
