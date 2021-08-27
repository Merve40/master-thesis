import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { get, getCookie } from "../util";
import ListBL from "../components/billsOfLading/list_bl";
import ListCharterparty from "../components/charterparties/list_charterparty";
import Profile from "../components/profile";

const Main = ({ makeToast, sse }) => {
    const [charterparties, setCharterparties] = useState([]);
    const [billsOfLading, setBillsOfLading] = useState([]);

    useEffect(() => {
        loadCharterparties();
        loadBillsOfLading();
    }, []);

    async function loadCharterparties() {
        var response = await get(`/charterparties/${getCookie("address")}`);
        var data = await response.json();
        setCharterparties(data);
    }

    async function loadBillsOfLading() {
        var response = await get(`/billsOfLading`);
        var data = await response.json();
        setBillsOfLading(data);
    }

    function onUpdateCharterparties(item) {
        setCharterparties(
            charterparties.map((element) =>
                element._id === item._id ? item : element
            )
        );
    }

    function onUpdateBills(item) {
        setBillsOfLading(
            billsOfLading.map((element) =>
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
                        collection={charterparties}
                        onUpdate={onUpdateCharterparties}
                        makeToast={makeToast}
                        reload={loadCharterparties}
                        sse={sse}
                    />
                )}
            />

            <Route
                path="/billsOfLading"
                render={(props) => (
                    <ListBL
                        collection={billsOfLading}
                        makeToast={makeToast}
                        onUpdate={onUpdateBills}
                        reload={loadBillsOfLading}
                        sse={sse}
                    />
                )}
            />

            <Route
                path={"/profile"}
                render={(props) => <Profile user={props.location.state} />}
            />
        </>
    );
};

export default Main;
