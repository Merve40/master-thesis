import React from "react";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import DetailOrder from "./detail_order";
import Badge from "react-bootstrap/Badge";

const ItemOrder = ({ item, index }) => {
    return (
        <Accordion>
            <Card>
                <Card.Header>
                    <Accordion.Toggle as={Button} variant="link" eventKey="0">
                        Order #{index}
                    </Accordion.Toggle>
                    <Badge
                        className="ml-1"
                        style={{ float: "inline-end" }}
                        variant={
                            item.status === "open" ? "secondary" : "success"
                        }
                    >
                        {item.status}
                    </Badge>
                    {item.charterparty.charterer.signature == "null" ||
                    item.charterparty.shipowner.signature == "null" ? (
                        <Badge
                            className="ml-1"
                            style={{ float: "inline-end" }}
                            variant="secondary"
                        >
                            Not signed
                        </Badge>
                    ) : null}
                </Card.Header>
                <Accordion.Collapse eventKey="0">
                    <Card.Body>
                        <DetailOrder index={index} item={item} />
                    </Card.Body>
                </Accordion.Collapse>
            </Card>
        </Accordion>
    );
};

export default ItemOrder;
