import React, { useState, useEffect, createContext } from "react";
import Header from "./components/header";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Web3 from "web3";
import { getCookie, get } from "./util";
import AgentMain from "./roles/agent";
import ChartererMain from "./roles/charterer";
import TraderMain from "./roles/trader";
import CustomToast from "./components/toast";

export const AccountContext = createContext();
export const Web3Context = createContext();
export const UserContext = createContext();
export const AbiListContext = createContext();

function App() {
    const web3 = new Web3(
        new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
    );

    const [abiList, setAbiList] = useState([]);
    const [registry, setRegistry] = useState([]);
    const [user, setUser] = useState({ role: "port agent" });
    const [show, setShow] = useState(false);
    const [toast, setToast] = useState({ title: "", body: "" });
    const [sse, setSse] = useState(null);

    const broker = process.env.REACT_APP_BROKER;
    const [account, setAccount] = useState(
        web3.eth.accounts.privateKeyToAccount(getCookie("privateKey"))
    );

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
                        (u) => u.role === "charterer" || u.role === "port agent"
                    )
                );
            });
    }, []);

    function makeToast(title, body) {
        setToast({ title, body });
        setShow(true);
    }

    function getMain() {
        if (user.role === "charterer") {
            return (
                <ChartererMain
                    web3={web3}
                    user={user}
                    makeToast={makeToast}
                    sse={sse}
                />
            );
        } else if (user.role === "port agent") {
            return <AgentMain makeToast={makeToast} sse={sse} />;
        } else if (user.role === "trader") {
            return <TraderMain />;
        }
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
                                    <Switch>{getMain()}</Switch>
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
