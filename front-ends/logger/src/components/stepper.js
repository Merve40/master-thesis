import React from "react";
import { Avatar, Grid } from "tabler-react";

// step: finished (boolean), name
const Stepper = ({ steps }) => {
    function step(idx, s) {
        return (
            <>
                <Grid.Col>
                    <div
                        style={{
                            textAlign: "center",
                        }}
                    >
                        <Avatar
                            color={
                                s.current
                                    ? "blue"
                                    : s.finished
                                    ? "green"
                                    : "gray"
                            }
                            style={{
                                color: s.current
                                    ? "DodgerBlue"
                                    : s.finished
                                    ? "black"
                                    : "gray",
                                fontWeight: "normal",
                                borderStyle: "solid",
                                borderWidth: s.current ? "1.5px" : "0px",
                                borderColor: "DodgerBlue",
                            }}
                        >
                            {idx + 1}
                        </Avatar>
                        {s.error ? (
                            <div
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                title="Errors"
                            >
                                <div
                                    class="badge badge-pill bg-red"
                                    style={{
                                        zIndex: 5000,
                                        position: "absolute",
                                        left: "4em",
                                        top: 0,
                                    }}
                                >
                                    {s.numError}
                                </div>
                            </div>
                        ) : null}
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
