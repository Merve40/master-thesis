import React from "react";
import { Avatar, Grid } from "tabler-react";

// step: finished (boolean), name
const Stepper = ({ steps }) => {
    function step(idx, s) {
        return (
            <>
                <Grid.Col>
                    <div style={{ textAlign: "center" }}>
                        <Avatar
                            color={s.finished ? "green" : "gray"}
                            style={{
                                color: s.finished ? "black" : "gray",
                                fontWeight: "normal",
                            }}
                        >
                            {idx + 1}
                        </Avatar>
                        <br />
                        {s.name}
                    </div>
                </Grid.Col>
                {idx < steps.length - 1 ? (
                    <Grid.Col>
                        <div
                            style={{
                                height: "1px",
                                backgroundColor: s.finished
                                    ? "black"
                                    : "lightgray",
                                marginTop: "15px",
                            }}
                        ></div>
                    </Grid.Col>
                ) : null}
            </>
        );
    }

    return (
        <Grid.Row gutters="0">{steps.map((s, idx) => step(idx, s))}</Grid.Row>
    );
};

export default Stepper;
