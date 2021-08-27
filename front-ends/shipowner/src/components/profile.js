import React from "react";
import { FaBuilding } from "react-icons/fa";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Table from "react-bootstrap/Table";
import Card from "react-bootstrap/Card";

const Profile = ({ user }) => {
    return (
        <Container className="mt-5">
            <p className="h5">User Profile:</p>
            <Alert variant="secondary">
                <Row className="m-3">
                    <Col sm={2}>
                        <Card
                            className="d-flex align-items-center"
                            style={{ width: "7em" }}
                        >
                            <Card.Body>
                                <FaBuilding size="4em" />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col sm={10}>
                        <Table responsive>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>User:</strong>
                                    </td>
                                    <td>{user.name}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Blockchain address:</strong>
                                    </td>
                                    <td>{user.address}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Role:</strong>
                                    </td>
                                    <td>{user.role}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </Col>
                </Row>
            </Alert>
        </Container>
    );
};

export default Profile;
