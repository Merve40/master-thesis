import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Container from "react-bootstrap/Container";
import VesselList from "../components/vessels";
import ListBL from "../components/billsOfLading/list_bl";
import IssueCredentials from "../components/credentials/issueCredentials";
import Profile from "../components/profile";
import { get } from "../util";

const Main = ({ makeToast, sse }) => {
    const [billsOfLading, setBillsOfLading] = useState([]);

    function loadBills(_vessel) {
        get(`/recentBillsOfLading/${_vessel}`)
            .then((response) => response.json())
            .then((data) => {
                setBillsOfLading(data);
            });
    }

    return (
        <>
            <Route
                path={`/`}
                exact
                render={() => <VesselList loadBills={loadBills} />}
            />

            <Route
                path="/billsOfLading"
                render={(props) => (
                    <ListBL
                        collection={billsOfLading}
                        makeToast={makeToast}
                        sse={sse}
                        vessel={props.location.state}
                        reload={() => null}
                    />
                )}
            />

            <Route
                path={"/profile"}
                render={(props) => <Profile user={props.location.state} />}
            />

            <Route
                path="/issueCredentials/:vesselId"
                render={(props) => (
                    <IssueCredentials
                        vesselId={props.match.params.vesselId}
                        makeToast={makeToast}
                    />
                )}
            />
        </>
    );
};

export default Main;
