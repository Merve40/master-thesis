import { useEffect, useState } from "react";
import { Container, Page } from "tabler-react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Web3 from "web3";
import { Provider } from "react-redux";
import Modal from "react-modal";

import store from "./storage/store";
import Header from "./components/header";
import MainPage from "./main";

Modal.setAppElement("#root");

function App() {
    const [abi, setAbi] = useState(null);

    const web3 = new Web3(
        new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
    );

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BROKER}/abiList`, {
            method: "get",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => setAbi(data));
    }, []);

    return (
        abi && (
            <div className="App">
                <Provider store={store}>
                    <Container>
                        <Router>
                            <Header />
                            <Switch>
                                <Route
                                    exact
                                    path="/"
                                    render={() => (
                                        <MainPage abiList={abi} web3={web3} />
                                    )}
                                />
                            </Switch>
                        </Router>
                    </Container>
                </Provider>
            </div>
        )
    );
}

export default App;
