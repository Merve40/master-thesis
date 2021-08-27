import React, { useContext } from "react";
import Table from "react-bootstrap/Table";
import { Link } from "react-router-dom";
import { withRouter } from "react-router";
import RouterButton from "../../components/router-button";
import { UserContext } from "../../App";

const DetailOrder = ({ item, index }) => {
    const user = useContext(UserContext);

    return (
        <div>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Charterparty</td>
                        <td>{item.charterparty.contract_address}</td>
                    </tr>
                    <tr>
                        <td>Date</td>
                        <td>{new Date(parseInt(item.date)).toDateString()}</td>
                    </tr>
                    <tr>
                        <td>Buyer</td>
                        <td>
                            <Link
                                to={{
                                    pathname: "/profile",
                                    state: item.buyer,
                                }}
                            >
                                {item.buyer.name}
                            </Link>
                        </td>
                    </tr>
                    <tr>
                        <td>Cargo Description</td>
                        <td>{item.cargo.description}</td>
                    </tr>
                    <tr>
                        <td>Moisture Level</td>
                        <td>{item.cargo.moisture_level}</td>
                    </tr>
                    <tr>
                        <td>Cargo Weight</td>
                        <td>{item.cargo.weight}</td>
                    </tr>
                    <tr>
                        <td>Nutrition</td>
                        <td>
                            <Table responsive>
                                <tbody>
                                    <tr>
                                        <td style={{ color: "#6c757d" }}>
                                            Calories
                                        </td>
                                        <td>{item.cargo.nutrition.calories}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: "#6c757d" }}>
                                            Protein
                                        </td>
                                        <td>{item.cargo.nutrition.protein}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: "#6c757d" }}>
                                            Carbs
                                        </td>
                                        <td>{item.cargo.nutrition.carbs}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: "#6c757d" }}>
                                            Sugar
                                        </td>
                                        <td>{item.cargo.nutrition.calories}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: "#6c757d" }}>
                                            Fiber
                                        </td>
                                        <td>{item.cargo.nutrition.fiber}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: "#6c757d" }}>
                                            Fat
                                        </td>
                                        <td>{item.cargo.nutrition.fat}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </td>
                    </tr>
                    <tr>
                        <td></td>
                        <td>
                            {user._id ===
                                item.charterparty.loading_port.agent &&
                            item.status === "open" &&
                            item.charterparty.charterer.signature != "null" &&
                            item.charterparty.shipowner.signature != "null" ? (
                                <div style={{ float: "right" }}>
                                    <RouterButton
                                        path={`/createBL`}
                                        buttonText={"Create B/L"}
                                        state={item}
                                    />
                                </div>
                            ) : null}
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export default withRouter(DetailOrder);
