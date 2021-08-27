import React, { useState, useEffect, createContext } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Web3 from "web3";
import Header from "./components/header";
import { get } from "./util";
import ListDeliveries from "./deliveries/list_deliveries";

export const AbiListContext = createContext();
export const Web3Context = createContext();

function App() {
    const web3 = new Web3(
        new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
    );

    const [abiList, setAbiList] = useState([]);
    const [deliveries, setDeliveries] = useState([]);

    useEffect(() => {
        //ABI-list
        get(`/abiList`)
            .then((response) => response.json())
            .then((data) => setAbiList(data));

        //get deliveries
        get(`/deliveries`)
            .then((response) => response.json())
            .then((data) => setDeliveries(data));
    }, []);

    function onUpdate(item) {
        setDeliveries(deliveries.map((i) => (i._id == item._id ? item : i)));
    }

    return (
        <div className="App">
            <Web3Context.Provider value={web3}>
                <AbiListContext.Provider value={abiList}>
                    <Router>
                        <Header />
                        <Switch>
                            <Route
                                path="/"
                                render={(props) => (
                                    <ListDeliveries
                                        list={deliveries}
                                        onUpdate={onUpdate}
                                    />
                                )}
                            />
                        </Switch>
                    </Router>
                </AbiListContext.Provider>
            </Web3Context.Provider>
        </div>
    );
}

export default App;
