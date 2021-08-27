import React, { useEffect } from "react";
import Charterparty from "./item_charterparty";
import Container from "react-bootstrap/Container";

const ListCharterparty = ({ collection, onUpdate, makeToast, sse, reload }) => {
    useEffect(() => {
        if (sse != null) {
            sse.addEventListener("sign_charterparty", (event) =>
                onSign(JSON.parse(event.data))
            );
        }
    }, []);

    function onSign(data) {
        makeToast("Charterparty", "Signed contract!");
        reload();
    }

    return (
        <Container className="mt-5">
            <p className="h5">Charterparties for bulk loading of grain:</p>
            {collection.length > 0 ? (
                collection.map((_, index) => (
                    <Charterparty
                        key={index}
                        item={collection[index]}
                        index={index}
                        onUpdate={onUpdate}
                        makeToast={makeToast}
                    />
                ))
            ) : (
                <div className="mt-3" style={{ color: "gray" }}>
                    There are currently no charterparties
                </div>
            )}
        </Container>
    );
};

export default ListCharterparty;
