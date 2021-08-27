import React from "react";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import DetailCharterparty from "./detail_charterparty";
import Badge from "react-bootstrap/Badge";

const Charterparty = ({ item, index, onUpdate, makeToast }) => {
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
                            Charterparty #{index}
                        </Accordion.Toggle>
                        {item.shipowner.signature !== "null" &&
                        item.charterer.signature !== "null" ? (
                            <Badge
                                className="ml-1"
                                style={{ float: "inline-end" }}
                                variant="secondary"
                            >
                                Signed
                            </Badge>
                        ) : null}
                        <Badge
                            style={{ float: "inline-end" }}
                            variant={
                                item.contract_address !== "null"
                                    ? "success"
                                    : "danger"
                            }
                        >
                            {item.contract_address !== "null"
                                ? "Deployed"
                                : "Not deployed"}
                        </Badge>
                    </Card.Header>
                    <Accordion.Collapse eventKey="0">
                        <Card.Body>
                            <DetailCharterparty
                                element={item}
                                onUpdate={onUpdate}
                                makeToast={makeToast}
                            />
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
            </Accordion>
        </div>
    );
};

export default Charterparty;
