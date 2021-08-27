import React, { useEffect } from "react";
import BillOfLading from "./item_bl";
import Container from "react-bootstrap/Container";

const ListBL = ({ collection, makeToast, onUpdate, sse, reload }) => {
    useEffect(() => {
        if (sse != null) {
            sse.addEventListener("deposit_billOfLading", async (event) =>
                onDeposit(JSON.parse(event.data))
            );
        }
    }, []);

    function onDeposit(data) {
        makeToast("BillOfLading", "Paid deposit!");
        reload();
    }

    return (
        <Container className="mt-5">
            <p className="h5">Bills of Lading:</p>
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

export default ListBL;
