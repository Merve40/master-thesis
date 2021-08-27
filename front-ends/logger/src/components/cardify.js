import React from "react";
import { Button, Card } from "tabler-react";

const AsCard = ({ title, node }) => {
    return (
        <Card title={title} isCollapsible isFullscreenable>
            <Card.Body>
                <div
                    style={{
                        maxHeight: "250px",
                        overflow: "auto",
                    }}
                >
                    {node}
                </div>
            </Card.Body>
        </Card>
    );
};

export default AsCard;
