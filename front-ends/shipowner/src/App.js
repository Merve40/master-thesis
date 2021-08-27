import React, { useState, useEffect, createContext } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Jumbotron from "react-bootstrap/Jumbotron";
import Web3 from "web3";
import CustomToast from "./components/toast";
import { getCookie, get } from "./util";
import Header from "./components/header";
import MasterMain from "./roles/master";
import AgentMain from "./roles/agent";
import ShipownerMain from "./roles/shipowner";

export const AccountContext = createContext();
export const Web3Context = createContext();
export const UserContext = createContext();
export const AbiListContext = createContext();

function App() {
    const web3 = new Web3(
        new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
    );
    const [account, setAccount] = useState(
        web3.eth.accounts.privateKeyToAccount(getCookie("privateKey"))
    );

    const [abiList, setAbiList] = useState([]);
    const [user, setUser] = useState({ role: "agent" });
    const [registry, setRegistry] = useState([]);
    const [show, setShow] = useState(false);
    const [toast, setToast] = useState({ title: "", body: "" });
    const [sse, setSse] = useState(null);

    useEffect(() => {
        get(`/user/${getCookie("address")}`)
            .then((response) => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else {
                    return response.json();
                }
            })
            .then((data) => {
                setUser(data);
                // initialize server-sent event
                var _sse = new EventSource(
                    `${process.env.REACT_APP_BROKER}/events/${
                        data._id
                    }?jwt=${getCookie("jwt")}`
                );
                setSse(_sse);
            });

        get(`/abiList`)
            .then((response) => response.json())
            .then((data) => {
                setAbiList(data);
            });

        get(`/registry`)
            .then((response) => response.json())
            .then((data) => {
                setRegistry(
                    data.filter(
                        (u) =>
                            (u.role === "shipowner" ||
                                u.role === "port agent" ||
                                u.role === "master") &&
                            u.name != "Port Agent B"
                    )
                );
            });
    }, []);

    function makeToast(title, body) {
        setToast({ title, body });
        setShow(true);
    }

    return (
        sse && (
            <div className="App">
                <AccountContext.Provider value={account}>
                    <Web3Context.Provider value={web3}>
                        <UserContext.Provider value={user}>
                            <AbiListContext.Provider value={abiList}>
                                <Router>
                                    <Header
                                        list={registry}
                                        setUser={setUser}
                                        setAccount={setAccount}
                                    />
                                    <Switch>
                                        {user.role === "master" ? (
                                            <MasterMain
                                                makeToast={makeToast}
                                                sse={sse}
                                            />
                                        ) : user.role === "port agent" ? (
                                            <AgentMain
                                                makeToast={makeToast}
                                                sse={sse}
                                            />
                                        ) : (
                                            <ShipownerMain
                                                makeToast={makeToast}
                                                sse={sse}
                                            />
                                        )}
                                    </Switch>
                                </Router>
                                <CustomToast
                                    show={show}
                                    setShow={setShow}
                                    header={toast.title}
                                    body={toast.body}
                                />
                            </AbiListContext.Provider>
                        </UserContext.Provider>
                    </Web3Context.Provider>
                </AccountContext.Provider>
            </div>
        )
    );
}

export default App;
