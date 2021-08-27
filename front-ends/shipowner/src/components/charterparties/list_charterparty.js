import React, { useEffect } from "react";
import Charterparty from "./item_charterparty";
import Container from "react-bootstrap/Container";

const ListCharterparty = ({ collection, onUpdate, reload, sse, makeToast }) => {
    useEffect(() => {
        sse.addEventListener(
            "deploy_charterparty",
            async (event) => await onDeployCharterparty(JSON.parse(event.data))
        );
        sse.addEventListener(
            "sign_charterparty",
            async (event) => await onSignCharterparty(JSON.parse(event.data))
        );
    }, []);

    async function onSignCharterparty(data) {
        makeToast("Charterparty", "Signed contract");
        await reload();
    }

    async function onDeployCharterparty(data) {
        makeToast("Charterparty", "Deployed contract");
        await reload();
    }

    return (
        <Container className="mt-5">
            <p className="h5">Charterparties for bulk loading of grain:</p>
            {collection.map((_, index) => (
                <Charterparty
                    key={index}
                    item={collection[index]}
                    index={index}
                    onUpdate={onUpdate}
                    makeToast={makeToast}
                />
            ))}
        </Container>
    );
};

export default ListCharterparty;
