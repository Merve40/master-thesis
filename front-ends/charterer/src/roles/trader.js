import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { getCookie, get } from "../util";
import ListOrder from "../components/orders/list_order";
import ListCharterparty from "../components/charterparties/list_charterparty";
import Profile from "../components/profile";

const Main = () => {
    const [collection, setCollection] = useState([]);
    const [charterparties, setCharterparties] = useState([]);

    useEffect(() => {
        get("/orders")
            .then((response) => response.json())
            .then((data) => {
                setCollection(data);
            });

        get("/charterparties")
            .then((response) => response.json())
            .then((data) => setCharterparties(data));
    }, []);

    return (
        <>
            <Route
                path={`/`}
                exact
                render={() => (
                    <ListOrder orders={collection} makeToast={null} />
                )}
            />

            <Route
                path={`/charterparties`}
                exact
                render={() => (
                    <ListCharterparty
                        collection={charterparties}
                        makeToast={null}
                    />
                )}
            />

            <Route
                path={"/profile"}
                render={(props) => {
                    return <Profile user={props.location.state} />;
                }}
            />
        </>
    );
};

export default Main;
