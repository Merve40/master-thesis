import React, { useState, useContext } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { withRouter } from "react-router";
import { Link, useHistory } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import { getCookie, verifyRaw, get, put } from "../../util";
import Modal from "./modal_confirm_pay";
import {
    UserContext,
    Web3Context,
    AbiListContext,
    AccountContext,
} from "../../App";

function DetailBL({ history, element, makeToast, onUpdate }) {
    const user = useContext(UserContext);
    const account = useContext(AccountContext);
    const abiList = useContext(AbiListContext);
    const web3 = useContext(Web3Context);

    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const gas = 4000000;
    const item = element;

    async function submit(jwt) {
        setShow(false);
        var contract = new web3.eth.Contract(
            abiList.billOfLading.abi,
            item.contract_address
        );

        await contract.methods
            .submitCredential(jwt)
            .send({ from: account.address, gas });

        var response = await get(`/registry/shipowner`);
        var data = await response.json();
        var delegatableShipowner = new web3.eth.Contract(
            abiList.delegatable.abi,
            data[0].delegatable
        );
        await delegatableShipowner.methods
            .payContractFee(item.contract_address)
            .send({ from: account.address, gas });

        var update = { deposited: true };
        response = await put(`/billOfLading/${item._id}`, update);

        if (response.status !== 500) {
            // update UI
            onUpdate({
                ...item,
                deposited: true,
            });
            makeToast("Bill of Lading", `Deposited fee`);
        } else {
            makeToast("Bill of Lading", `Failed to deposit`);
        }
    }

    return (
        <div>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Name</td>
                        <td style={{ color: "gray" }}>{item.name}</td>
                    </tr>
                    <tr>
                        <td>Contract address:</td>
                        <td>{item.contract_address}</td>
                    </tr>
                    <tr>
                        <td>Charterparty:</td>
                        <td>{item.charterparty.contract_address}</td>
                    </tr>

                    <tr>
                        <td>Vessel ID</td>
                        <td style={{ color: "gray" }}>
                            {item.vessel_id.value}
                        </td>
                    </tr>
                    <tr>
                        <td>Consignee</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: `/profile`,
                                    state: item.consignee,
                                }}
                            >
                                {item.consignee.name}
                            </Link>
                        </td>
                    </tr>
                    <tr>
                        <td>Notify Party</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: `/profile`,
                                    state: item.notify_party,
                                }}
                            >
                                {item.notify_party.name}
                            </Link>
                        </td>
                    </tr>

                    <tr>
                        <td>Cargo Description</td>
                        <td>{item.cargo.description.value}</td>
                    </tr>
                    <tr>
                        <td>Cargo Weight</td>
                        <td>{item.cargo.weight.value}</td>
                    </tr>
                    <tr>
                        <td>Moisture Level</td>
                        <td>{item.cargo.moisture_level.value}</td>
                    </tr>
                    <tr>
                        <td>Nutrition Levels</td>
                        <td>{item.cargo.nutrition_levels.value}</td>
                    </tr>

                    <tr>
                        <td></td>
                        <td>
                            <div style={{ float: "right" }}>
                                {user.role == "master" && !item.deposited ? (
                                    <Button
                                        className="mr-3"
                                        variant="outline-dark"
                                        onClick={() => setShow(true)}
                                    >
                                        {loading ? (
                                            <Spinner
                                                className="mr-2"
                                                animation="border"
                                                size="sm"
                                            />
                                        ) : null}
                                        Confirm & Deposit
                                    </Button>
                                ) : null}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </Table>
            <Modal show={show} setShow={setShow} submit={submit} bl={item} />
        </div>
    );
}

export default withRouter(DetailBL);
