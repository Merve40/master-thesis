import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import ListCharterparty from "../components/charterparties/list_charterparty";
import Profile from "../components/profile";
import { getCookie, get } from "../util";

const Main = ({ web3, user, makeToast, sse }) => {
    const [collection, setCollection] = useState([]);
    const [registry, setRegistry] = useState([]);

    useEffect(() => {
        get("/registry")
            .then((response) => response.json())
            .then((data) => {
                setRegistry(data);
            });

        loadCharterparties();
    }, []);

    function loadCharterparties() {
        get(`/charterparties/${getCookie("address")}`)
            .then((resp) => resp.json())
            .then((list) => {
                setCollection(list);
            });
    }

    function onUpdate(item) {
        setCollection(
            collection.map((element) =>
                element._id === item._id ? item : element
            )
        );
    }

    return (
        <>
            <Route
                path={`/`}
                exact
                render={() => (
                    <ListCharterparty
                        collection={collection}
                        web3={web3}
                        onUpdate={onUpdate}
                        makeToast={makeToast}
                        sse={sse}
                        reload={loadCharterparties}
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
