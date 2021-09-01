import React, { useEffect } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

const Stepper = ({ steps = [] }) => {
    useEffect(() => {}, [steps]);

    return steps.map((s, i) => (
        <>
            <Row>
                <Col sm={3}>
                    <div
                        style={{
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                width: "30px",
                                height: "30px",
                                lineHeight: "30px",
                                borderRadius: "50%",
                                backgroundColor: s.finished
                                    ? s.success
                                        ? "limegreen"
                                        : "red"
                                    : "lightgray",
                                color: s.finished ? "honeydew" : "gray",
                                display: "inline-block",
                                textAlign: "center",
                            }}
                        >
                            {i + 1}
                        </div>
                    </div>
                </Col>
                <Col sm={9} style={{ fontSize: "12px" }}>
                    {s.name}
                </Col>
            </Row>
            {i < steps.length - 1 ? (
                <Row>
                    <Col
                        sm={3}
                        style={{
                            //backgroundColor: "green",
                            textAlign: "center",
                            padding: "0.5em",
                        }}
                    >
                        <div
                            style={{
                                width: s.finished ? "1.3px" : "1px",
                                height: "100%",
                                minHeight: "25px",
                                backgroundColor: s.finished
                                    ? "limegreen"
                                    : "gray",
                                display: "inline-block",
                                margin: "0",
                                padding: "0",
                            }}
                        ></div>
                    </Col>
                    <Col sm={9} style={{ fontSize: "11px", color: "gray" }}>
                        <pre>{s.payload}</pre>
                    </Col>
                </Row>
            ) : null}
        </>
    ));
};

export default Stepper;
