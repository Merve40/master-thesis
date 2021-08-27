import React, { useState, useContext, useEffect } from "react";
import { withRouter } from "react-router";
import { Link, useHistory } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { getCookie, verifyRaw, put } from "../../util";
import { AccountContext, Web3Context, AbiListContext } from "../../App";

function DetailBL({ history, element, index, makeToast, onUpdate }) {
    const account = useContext(AccountContext);
    const web3 = useContext(Web3Context);
    const abiList = useContext(AbiListContext);

    const [loading, setLoading] = useState(false);
    const [credential, setCredential] = useState(null);
    const [error, setError] = useState(null);
    const gas = 4000000;
    const item = element;
    const [contract, setContract] = useState(null);

    useEffect(() => {
        var _contract = new web3.eth.Contract(
            abiList.billOfLading.abi,
            item.contract_address
        );
        setContract(_contract);

        _contract
            .getPastEvents("onCredentialSubmitted", {
                fromBlock: 0,
            })
            .then((events) => {
                if (events.length > 0) {
                    var jwt = events[0].returnValues.jwt;
                    setCredential(jwt);
                }
            });
    }, []);

    async function onClickValidate() {
        setLoading(true);
        // get merkleroot
        const root = await contract.methods.merkleroot();
        const verified = verifyRaw(root, item);
        makeToast("Bill of Lading", `Verified merkleroot`);
        setLoading(false);
    }

    async function onClickSignContract() {
        try {
            var hash = web3.utils.soliditySha3(item.contract_address);
            var signature = account.sign(hash).signature;

            await contract.methods
                .submitSignature(signature)
                .send({ from: account.address, gas });

            var update = { "signer.signature": signature };
            var response = await put(`/billOfLading/${item._id}`, update);
            if (response.status === 500) {
                throw { message: "Server error: could not insert signature" };
            }
            item.signer.signature = signature;
            onUpdate({ ...item });
            makeToast("Bill of Lading", "Signed contract");
        } catch (err) {
            console.log(err.message);
            setError(err.message);
        }
    }

    function getValidateButton() {
        if (item.deposited) {
            return (
                <Button
                    className="mr-1"
                    variant="outline-dark"
                    onClick={onClickValidate}
                >
                    {loading ? (
                        <Spinner
                            className="mr-2"
                            animation="border"
                            size="sm"
                        />
                    ) : null}
                    Validate contract
                </Button>
            );
        } else {
            return null;
        }
    }

    function initConsignee() {
        if (
            account.address.toLowerCase() === item.consignee.address &&
            !item.issued &&
            item.deposited &&
            item.signer.signature !== "null"
        ) {
            return (
                <Button
                    className="mr-1"
                    variant="outline-dark"
                    onClick={() =>
                        history.push({
                            pathname: `/createPOD`,
                            state: item,
                        })
                    }
                >
                    {loading ? (
                        <Spinner
                            className="mr-2"
                            animation="border"
                            size="sm"
                        />
                    ) : null}
                    Issue Proof of Delivery
                </Button>
            );
        }
        return null;
    }

    function initSigner() {
        if (
            account.address.toLowerCase() === item.signer.agent.address &&
            item.deposited &&
            !item.issued &&
            item.signer.signature === "null"
        ) {
            return (
                <Button variant="outline-dark" onClick={onClickSignContract}>
                    {loading ? (
                        <Spinner
                            className="mr-2"
                            animation="border"
                            size="sm"
                        />
                    ) : null}
                    Sign contract
                </Button>
            );
        }
        return null;
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
                            #{item.vessel_id.value}
                        </td>
                    </tr>

                    <tr>
                        <td>Consignee</td>
                        <td style={{ color: "gray" }}>
                            <Link
                                to={{
                                    pathname: `/profile/`,
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
                                    pathname: `/profile/`,
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
                        <td>{item.cargo.weight.value} tons</td>
                    </tr>
                    <tr>
                        <td>Moisture Level</td>
                        <td>{item.cargo.moisture_level.value} %</td>
                    </tr>
                    <tr>
                        <td>Nutrition Levels</td>
                        <td>{item.cargo.nutrition_levels.value}</td>
                    </tr>

                    <tr>
                        <td className="col-4">Credential</td>

                        {credential == null ? (
                            <td
                                className="col-8"
                                style={{
                                    color: "gray",
                                }}
                            >
                                credential was not issued
                            </td>
                        ) : (
                            <td className="col-8">
                                <Link
                                    style={{
                                        wordWrap: "break-word",
                                        wordBreak: "break-all",
                                        textAlign: "justify",
                                    }}
                                    to={{
                                        pathname: `/credential/${credential}`,
                                        state: item.notify_party,
                                    }}
                                >
                                    {credential}
                                </Link>
                            </td>
                        )}
                    </tr>

                    <tr>
                        <td></td>
                        <td>
                            <div style={{ float: "right" }}>
                                {
                                    //getValidateButton()
                                }
                                {initConsignee()}
                                {initSigner()}
                            </div>
                            <div
                                style={{
                                    maxWidth: "50%",
                                    display: "inline-block",
                                    float: "right",
                                }}
                            >
                                {error != null ? (
                                    <Alert
                                        className="p-2 mr-3"
                                        variant="danger"
                                    >
                                        {error}
                                    </Alert>
                                ) : null}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
}

export default withRouter(DetailBL);
