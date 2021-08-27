import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import ListCredentials from "../components/credentials/show_credentials";
import VerifyCredential from "../components/credentials/verify_credential";
import ListBL from "../components/billsOfLading/list_bl";
import Profile from "../components/profile";
import { get } from "../util";

const Main = ({ makeToast, sse }) => {
    const [billsOfLading, setBillsOfLading] = useState([]);

    useEffect(() => {
        loadBillsOfLading();
    }, []);

    async function loadBillsOfLading() {
        var response = await get(`/billsOfLading`);
        var data = await response.json();
        setBillsOfLading(data);
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
                    <ListBL
                        collection={billsOfLading}
                        makeToast={makeToast}
                        onUpdate={onUpdateBills}
                        sse={sse}
                        reload={loadBillsOfLading}
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
                        sse={sse}
                        reload={loadBillsOfLading}
                    />
                )}
            />

            <Route
                path={"/profile"}
                render={(props) => <Profile user={props.location.state} />}
            />

            <Route
                path="/credentials"
                render={(props) => <ListCredentials />}
            />

            <Route
                path="/credential/:jwt"
                render={(props) => (
                    <VerifyCredential jwt={props.match.params.jwt} />
                )}
            />
        </>
    );
};

export default Main;
