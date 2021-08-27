import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { getCookie, get } from "../util";
import CreateBL from "../components/billsOfLading/create_bl";
import ListBL from "../components/billsOfLading/list_bl";
import ListOrder from "../components/orders/list_order";
import Profile from "../components/profile";
import ListPOD from "../components/proofOfDeliveries/list_pod";
import CreatePOD from "../components/proofOfDeliveries/create_pod";
import Credential from "../components/credentials/verify_credential";

const Main = ({ makeToast, sse }) => {
    const [orders, setOrders] = useState([]);
    const [billsOfLading, setBillsOfLading] = useState([]);
    const [proofOfDeliveries, setProofOfDeliveries] = useState([]);

    useEffect(() => {
        get(`/orders/${getCookie("address")}`)
            .then((response) => response.json())
            .then((data) => {
                setOrders(data);
            });

        loadBillsOfLading();

        loadProofOfDeliveries();
    }, []);

    function loadProofOfDeliveries() {
        get(`/proofOfDeliveries/${getCookie("address")}`)
            .then((response) => response.json())
            .then((data) => {
                setProofOfDeliveries(data);
            });
    }

    function loadBillsOfLading() {
        get(`/billsOfLading/${getCookie("address")}`)
            .then((response) => response.json())
            .then((data) => {
                setBillsOfLading(data);
            });
    }

    function onUpdateOrders(item) {
        setOrders(
            orders.map((element) => (element._id === item._id ? item : element))
        );
    }

    function onUpdateBillsOfLading(item) {
        setBillsOfLading(
            billsOfLading.map((i) => (i._id == item._id ? item : i))
        );
    }

    return (
        <>
            <Route
                path={`/`}
                exact
                render={() => (
                    <ListOrder orders={orders} makeToast={makeToast} />
                )}
            />

            <Route
                path={`/credential/:jwt`}
                exact
                render={(props) => <Credential jwt={props.match.params.jwt} />}
            />

            <Route
                path="/createBL"
                render={(props) => (
                    <CreateBL
                        item={props.location.state}
                        update={loadBillsOfLading}
                        makeToast={makeToast}
                    />
                )}
            />

            <Route
                path="/billsOfLading"
                render={(props) => (
                    <ListBL
                        collection={billsOfLading}
                        makeToast={makeToast}
                        onUpdate={onUpdateBillsOfLading}
                        reload={loadBillsOfLading}
                        sse={sse}
                    />
                )}
            />

            <Route
                path={"/profile"}
                render={(props) => {
                    return <Profile user={props.location.state} />;
                }}
            />

            <Route
                path="/proofOfDeliveries"
                render={(props) => (
                    <ListPOD
                        collection={proofOfDeliveries}
                        makeToast={makeToast}
                    />
                )}
            />

            <Route
                path="/createPOD"
                render={(props) => (
                    <CreatePOD
                        item={props.location.state}
                        onAdd={loadProofOfDeliveries}
                        onUpdate={onUpdateOrders}
                        makeToast={makeToast}
                    />
                )}
            />
        </>
    );
};

export default Main;
