import React, { useState, useEffect, useContext } from "react";
import { withRouter } from "react-router";
import BillOfLading from "./item_bl";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import { UserContext } from "../../App";

const ListBL = ({
    history,
    vessel,
    makeToast,
    collection,
    sse,
    reload,
    onUpdate,
}) => {
    const user = useContext(UserContext);

    useEffect(() => {
        sse.addEventListener(
            "new_billOfLading",
            async (event) => await onCreateBillOfLading(JSON.parse(event.data))
        );

        sse.addEventListener(
            "sign_billOfLading",
            async (event) => await onSignBillOfLading(JSON.parse(event.data))
        );
    }, []);

    async function onCreateBillOfLading(data) {
        makeToast("BillOfLading", "Deployed new contract");
        await reload();
    }

    async function onSignBillOfLading(data) {
        makeToast("BillOfLading", "Signed contract");
        await reload();
    }

    return (
        <Container className="mt-5">
            {user.role == "port agent" ? (
                <div
                    className="h3 mt-2 p-3 bg-light"
                    style={{ borderRadius: "5px" }}
                >
                    Recent Bills of Lading for Vessel {vessel}:
                    <div style={{ float: "right" }}>
                        <Button
                            variant="primary"
                            type="submit"
                            onClick={() =>
                                history.push(`/issueCredentials/${vessel}`)
                            }
                        >
                            Issue credential
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    className="h3 mt-2 p-3 bg-light"
                    style={{ borderRadius: "5px" }}
                >
                    Bills of Lading:
                </div>
            )}

            {collection.length > 0 ? (
                collection.map((_, index) => (
                    <BillOfLading
                        key={index}
                        item={collection[index]}
                        index={index}
                        makeToast={makeToast}
                        onUpdate={onUpdate}
                    />
                ))
            ) : (
                <div className="mt-3" style={{ color: "gray" }}>
                    There are currently no Bills of Lading
                </div>
            )}
        </Container>
    );
};

export default withRouter(ListBL);
