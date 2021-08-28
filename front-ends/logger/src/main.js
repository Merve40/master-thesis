import React, { useEffect, useState, useCallback } from "react";
import { Container, Page, Button } from "tabler-react";
import { useSelector, useDispatch } from "react-redux";

import { add } from "./storage/contracts-slice";
import { addEvent } from "./storage/events-slice";
import { finish } from "./storage/steps-slice";
import { addServerEvent, toggle } from "./storage/server-events-slice";

import ContractsTable from "./components/contracts-table";
import AsCard from "./components/cardify";
import Modal from "./components/modal";
import Stepper from "./components/stepper";
import EventsTable from "./components/events-table";
import ServerEvents from "./components/server-events";

const MainPage = ({ web3, abiList }) => {
    const dispatch = useDispatch();

    const [open, setOpen] = useState(false);

    const [modal, setModal] = useState({
        title: "",
        body: "",
    });

    var contracts = useSelector((state) => state.contracts.array);
    var events = useSelector((state) => state.events.array);
    var steps = useSelector((state) => state.steps.array);
    var serverEvents = useSelector((state) => state.serverEvents.array);

    const oracleEvents = [];

    useEffect(() => {
        var oracle = new web3.eth.Contract(
            abiList.oracle.abi,
            abiList.oracle.address
        );

        initDeployEvents(oracle);
        initContractEvents(oracle);

        var idmSource = new EventSource(`http://localhost:8080/logs`);
        idmSource.addEventListener("message", idmEvent);

        var chartererSource = new EventSource(`http://localhost:6060/logs`);
        chartererSource.addEventListener("message", chartererEvent);

        var shipownerSource = new EventSource(`http://localhost:7070/logs`);
        shipownerSource.addEventListener("message", shipownerEvent);

        var customerSource = new EventSource(`http://localhost:3434/logs`);
        customerSource.addEventListener("message", customerEvent);

        return () => {
            oracleEvents.forEach((e) => {
                e.removeListener("data");
            });

            idmSource.removeEventListener("message", idmEvent);
            idmSource.close();

            chartererSource.removeEventListener("message", chartererEvent);
            chartererSource.close();

            shipownerSource.removeEventListener("message", shipownerEvent);
            shipownerSource.close();

            customerSource.removeEventListener("message", customerEvent);
            customerSource.close();
        };
    }, [contracts]);

    function initContractEvents(oracle) {
        if (steps[6].finished) {
            step2(oracle);
        } else if (steps[2].finished) {
            step1(oracle);
        } else if (steps[0].finished) {
            step0(oracle);
        }
    }

    function step0(oracle) {
        var charterparties = contracts
            .filter((c) => c.name === "Charterparty")
            .map((c) => c.address);

        oracle.events
            .Merkleroot({
                fromBlock: 0,
                filter: { srcContract: charterparties },
            })
            .on("data", (ev) => {
                dispatch(
                    addEvent({
                        name: "Merkleroot",
                        contract: "Charterparty",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });

        var signed = false;
        oracle.events
            .SignedContract({
                fromBlock: 0,
                filter: { _contract: charterparties },
            })
            .on("data", (ev) => {
                console.log("signed?", signed);
                if (!signed) {
                    signed = true;
                } else {
                    dispatch(finish(1));
                }

                dispatch(
                    addEvent({
                        name: "SignedContract",
                        contract: "Charterparty",
                        address: ev.returnValues._contract,
                        timestamp: Date.now(),
                    })
                );
            });
    }

    function step1(oracle) {
        var billsOfLading = contracts
            .filter((c) => c.name === "BillOfLading")
            .map((c) => c.address);

        oracle.events
            .Merkleroot({
                fromBlock: 0,
                filter: { srcContract: billsOfLading },
            })
            .once("data", (ev) => {
                dispatch(
                    addEvent({
                        name: "Merkleroot",
                        contract: "BillOfLading",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });

        oracle.events
            .Deposited({
                fromBlock: "latest",
                filter: { srcContract: billsOfLading },
            })
            .once("data", (ev) => {
                dispatch(finish(4));

                dispatch(
                    addEvent({
                        name: "Deposited",
                        contract: "BillOfLading",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });

        oracle.events
            .SignedContract({
                fromBlock: "latest",
                filter: { _contract: billsOfLading },
            })
            .once("data", (ev) => {
                dispatch(finish(5));
                dispatch(
                    addEvent({
                        name: "SignedContract",
                        contract: "BillOfLading",
                        address: ev.returnValues._contract,
                        timestamp: Date.now(),
                    })
                );
            });

        var bl = new web3.eth.Contract(
            abiList.billOfLading.abi,
            billsOfLading[0]
        );

        bl.events.onCredentialSubmitted({ fromBlock: 0 }).once("data", (ev) => {
            dispatch(finish(3));
            dispatch(
                addEvent({
                    name: "onCredentialSubmitted",
                    contract: "BillOfLading",
                    address: bl.options.address,
                    timestamp: Date.now(),
                })
            );
        });
    }

    function step2(oracle) {
        var proofsOfDelivery = contracts
            .filter((c) => c.name === "ProofOfDelivery")
            .map((c) => c.address);

        oracle.events
            .Merkleroot({
                fromBlock: 0,
                filter: {
                    srcContract: proofsOfDelivery,
                },
            })
            .once("data", (ev) => {
                dispatch(
                    addEvent({
                        name: "Merkleroot",
                        contract: "ProofOfDelivery",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });

        oracle.events
            .Deposited({
                fromBlock: 0,
                filter: { srcContract: proofsOfDelivery },
            })
            .once("data", (ev) => {
                dispatch(
                    addEvent({
                        name: "Deposited",
                        contract: "ProofOfDelivery",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });

        oracle.events
            .SignedContract({
                fromBlock: 0,
                filter: { _contract: proofsOfDelivery },
            })
            .once("data", (ev) => {
                dispatch(
                    addEvent({
                        name: "SignedContract",
                        contract: "ProofOfDelivery",
                        address: ev.returnValues._contract,
                        timestamp: Date.now(),
                    })
                );
            });

        oracle.events
            .BatchQuery({
                fromBlock: 0,
                filter: { srcContract: proofsOfDelivery },
            })
            .once("data", (ev) => {
                dispatch(
                    addEvent({
                        name: "BatchQuery",
                        contract: "ProofOfDelivery",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });

        oracle.events
            .Warn({
                fromBlock: 0,
                filter: { srcContract: proofsOfDelivery },
            })
            .on("data", (ev) => {
                console.log("triggered WARN event");
                dispatch(
                    addEvent({
                        name: "Warn",
                        contract: "ProofOfDelivery",
                        address: ev.returnValues.srcContract,
                        timestamp: Date.now(),
                    })
                );
            });
    }

    function initDeployEvents(oracle) {
        var e1 = oracle.events.CreatedCharterparty({ fromBlock: "latest" });
        oracleEvents.push(e1);

        e1.once("data", (e) => {
            dispatch(finish(0));
            dispatch(
                add({
                    name: "Charterparty",
                    address: e.returnValues.charterparty,
                    creator: "did:ethr:" + e.returnValues.creator,
                    timestamp: Date.now(),
                })
            );
        });

        var e2 = oracle.events.CreatedBillOfLading({ fromBlock: "latest" });
        oracleEvents.push(e2);
        e2.once("data", (e) => {
            dispatch(finish(2));
            dispatch(
                add({
                    name: "BillOfLading",
                    address: e.returnValues.billOfLading,
                    creator: "did:ethr:" + e.returnValues.creator,
                    timestamp: Date.now(),
                })
            );
        });

        var e3 = oracle.events.CreatedProofOfDelivery({ fromBlock: "latest" });
        oracleEvents.push(e3);
        e3.once("data", (e) => {
            dispatch(finish(6));
            dispatch(
                add({
                    name: "ProofOfDelivery",
                    address: e.returnValues.proofOfDelivery,
                    creator: "did:ethr:" + e.returnValues.creator,
                    timestamp: Date.now(),
                })
            );
        });
    }

    function idmEvent(e) {
        console.log(e.data);
        var data = JSON.parse(e.data);
        console.log(data);
        var event = {
            name: data.name,
            server: "idm",
            time: Date.now(),
            unfolded: false,
        };
        event.content = createContent(data.body);
        dispatch(addServerEvent(event));
    }

    function chartererEvent(e) {
        var data = JSON.parse(e.data);
        console.log(data);
        var event = {
            name: data.name,
            server: "charterer",
            time: Date.now(),
            unfolded: false,
        };
        event.content = createContent(data.body);
        dispatch(addServerEvent(event));
    }

    function shipownerEvent(e) {
        var data = JSON.parse(e.data);
        console.log(data);
        var event = {
            name: data.name,
            server: "shipowner",
            time: Date.now(),
            unfolded: false,
        };
        event.content = createContent(data.body);
        dispatch(addServerEvent(event));
    }

    function customerEvent(e) {
        var data = JSON.parse(e.data);
        console.log(data);
        var event = {
            name: data.name,
            server: "customer",
            time: Date.now(),
            unfolded: false,
        };
        event.content = createContent(data.body);
        dispatch(addServerEvent(event));
        dispatch(finish(7));
    }

    function createContent(content) {
        return (
            <pre
                style={{
                    height: "auto",
                    overflow: "auto",
                    maxHeight: "200px",
                    wordBreak: "break-word",
                    wordWrap: "normal",
                    whiteSpace: "pre-wrap",
                    display: "flex",
                }}
            >
                {content}
            </pre>
        );
    }

    return (
        <div style={{ marginTop: "3em" }}>
            <Page>
                <Page.Main>
                    <AsCard
                        title="Order Progress"
                        node={<Stepper steps={steps} />}
                    />

                    <AsCard
                        title="Deployed Contracts"
                        node={<ContractsTable events={contracts} />}
                    />

                    <AsCard
                        title="Contract Events"
                        node={<EventsTable events={events} />}
                    />

                    <AsCard
                        title="Server Logs"
                        node={
                            <ServerEvents
                                events={serverEvents}
                                setModal={setModal}
                                setOpen={setOpen}
                            />
                        }
                    />

                    <Modal
                        title={modal.title}
                        body={modal.body}
                        open={open}
                        setOpen={setOpen}
                    />
                </Page.Main>
            </Page>
        </div>
    );
};

export default MainPage;
