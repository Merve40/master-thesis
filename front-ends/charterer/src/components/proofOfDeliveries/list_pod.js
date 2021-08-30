import React from "react";
import ProofOfDelivery from "./item_pod";
import Container from "react-bootstrap/Container";

const ListPOD = ({ collection, makeToast, onUpdate }) => {
    return (
        <Container className="mt-5">
            <p className="h5">Proof of Deliveries:</p>
            {collection.length > 0 ? (
                collection.map((_, index) => (
                    <ProofOfDelivery
                        key={index}
                        item={collection[index]}
                        index={index}
                        makeToast={makeToast}
                        onUpdate={onUpdate}
                    />
                ))
            ) : (
                <div className="mt-3" style={{ color: "gray" }}>
                    There are currently no Proof of Deliveries
                </div>
            )}
        </Container>
    );
};

export default ListPOD;
