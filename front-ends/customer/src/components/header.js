import React, { useState, useContext, useEffect } from "react";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import { withRouter } from "react-router";
import { BiUser } from "react-icons/bi";

const Header = ({ history }) => {
    return (
        <Navbar className="sticky-top" bg="light" variant="light">
            <Container>
                <Navbar.Brand
                    href="/"
                    onClick={(e) => {
                        e.preventDefault();
                        history.push("/");
                    }}
                >
                    Customer Company
                </Navbar.Brand>
                <Nav className="mr-auto">
                    <Nav.Link
                        href="/"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/");
                        }}
                    >
                        Deliveries
                    </Nav.Link>
                </Nav>
                <Navbar.Toggle />
                <Navbar.Collapse className="justify-content-end">
                    <Navbar.Text>
                        Customer
                        <BiUser className="ml-3" size="1.4em" />
                    </Navbar.Text>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default withRouter(Header);
