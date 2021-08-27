import React, { useState, useContext, useEffect } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import Button from "react-bootstrap/Button";
import { withRouter } from "react-router";
import { BiUser } from "react-icons/bi";
import { UserContext, AccountContext, Web3Context } from "../App";
import Dropdown from "./dropdown";
import { setCookie } from "../util";

const Header = ({ history, list, setUser, setAccount }) => {
    const web3 = useContext(Web3Context);
    const user = useContext(UserContext);
    const account = useContext(AccountContext);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        web3.eth.getBalance(account.address).then((b) => setBalance(b));
    }, []);

    function getNav() {
        if (user.role === "charterer") {
            return (
                <Nav className="mr-auto">
                    <Nav.Link
                        href="/"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/");
                        }}
                    >
                        C/P
                    </Nav.Link>
                </Nav>
            );
        } else if (user.role === "trader") {
            return (
                <Nav className="mr-auto">
                    <Nav.Link
                        href="/"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/");
                        }}
                    >
                        Orders
                    </Nav.Link>
                    <Nav.Link
                        href="/charterparties"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/charterparties");
                        }}
                    >
                        C/P
                    </Nav.Link>
                </Nav>
            );
        } else if (user.role === "port agent") {
            return (
                <Nav className="mr-auto">
                    <Nav.Link
                        href="/"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/");
                        }}
                    >
                        Orders
                    </Nav.Link>
                    <Nav.Link
                        href="/billsOfLading"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/billsOfLading");
                        }}
                    >
                        B/L
                    </Nav.Link>
                    <Nav.Link
                        href="/proofOfDeliveries"
                        onClick={(e) => {
                            e.preventDefault();
                            history.push("/proofOfDeliveries");
                        }}
                    >
                        PoD
                    </Nav.Link>
                </Nav>
            );
        }
    }

    return (
        <>
            <Row
                className="pr-3 pt-1 pb-0"
                style={{ backgroundColor: "#f8f9fa", color: "gray" }}
            >
                <Col>
                    <div style={{ float: "right", fontSize: "12px" }}>
                        {balance} WEI
                    </div>
                </Col>
            </Row>
            <Navbar className="sticky-top" bg="light" variant="light">
                <Navbar.Brand
                    href="/"
                    onClick={(e) => {
                        e.preventDefault();
                        history.push("/");
                    }}
                >
                    Trading Company
                </Navbar.Brand>
                {getNav()}

                <Dropdown
                    currentItem={user.name}
                    list={list.map((i) => i.name)}
                    action={(current) => {
                        var usr = list.find((u) => u.name == current);
                        setUser(usr);
                        // set cookies
                        setCookie("address", usr.address);
                        setCookie("privateKey", usr.privateKey);
                        setCookie("jwt", "test_token");
                        //set account
                        setAccount(
                            web3.eth.accounts.privateKeyToAccount(
                                usr.privateKey
                            )
                        );
                        window.location.reload(true);
                    }}
                />
                <div>
                    <BiUser className="ml-3" size="1.4em" />
                </div>
            </Navbar>
        </>
    );
};

export default withRouter(Header);
