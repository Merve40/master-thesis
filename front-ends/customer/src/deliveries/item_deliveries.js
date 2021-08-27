import React from "react";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

import DetailDelivery from "./detail_deliveries";

const Delivery = ({ index, item, onUpdate }) => {
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
                            Delivery #{index}
                        </Accordion.Toggle>
                        <Badge
                            className={
                                item.verified ? "bg-success" : "bg-secondary"
                            }
                            style={{
                                float: "inline-end",
                            }}
                        >
                            {item.verified ? "verified" : "not verified"}
                        </Badge>
                    </Card.Header>
                    <Accordion.Collapse eventKey="0">
                        <Card.Body>
                            <DetailDelivery
                                item={item}
                                index={index}
                                onUpdate={onUpdate}
                            />
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
            </Accordion>
        </div>
    );
};

export default Delivery;
