import React from "react";
import Container from "react-bootstrap/Container";
import Delivery from "./item_deliveries";

const ListDeliveries = ({ list, onUpdate }) => {
    return (
        <Container className="mt-5">
            <p className="h5">Deliveries:</p>
            {list.length > 0 ? (
                list.map((_, i) => (
                    <Delivery
                        key={i}
                        item={list[i]}
                        index={i}
                        onUpdate={onUpdate}
                    />
                ))
            ) : (
                <div className="mt-3" style={{ color: "gray" }}>
                    There are currently no deliveries
                </div>
            )}
        </Container>
    );
};

export default ListDeliveries;
