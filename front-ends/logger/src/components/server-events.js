import React, { useEffect, useState } from "react";
import { Table, Button, Badge, Card, Avatar } from "tabler-react";
import { BiChevronRight, BiChevronDown } from "react-icons/bi";
import { useSelector, useDispatch } from "react-redux";

const ServerEvents = ({ events, setModal, setOpen }) => {
    const dispatch = useDispatch();

    const colors = {
        idm: "red",
        charterer: "blue",
        shipowner: "green",
        customer: "yellow",
    };

    return (
        <Table>
            <Table.Header>
                <Table.ColHeader>Event</Table.ColHeader>
                <Table.ColHeader>Server</Table.ColHeader>
                <Table.ColHeader>Time</Table.ColHeader>
            </Table.Header>
            <Table.Body>
                {events.map((e, idx) => (
                    <>
                        <Table.Row key={idx}>
                            <Table.Col>
                                <a
                                    href="#"
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        setModal({
                                            title: e.name,
                                            body: e.content,
                                            modalId: "logModal",
                                        });
                                        setOpen(true);
                                    }}
                                >
                                    {e.name}
                                </a>
                            </Table.Col>
                            <Table.Col>
                                <div
                                    className="mr-1"
                                    style={{
                                        width: "10px",
                                        height: "10px",
                                        borderRadius: "50%",
                                        backgroundColor: colors[e.server],
                                        display: "inline-block",
                                    }}
                                ></div>
                                {e.server}
                            </Table.Col>
                            <Table.Col>
                                {new Date(e.time).toLocaleString()}
                            </Table.Col>
                        </Table.Row>
                    </>
                ))}
            </Table.Body>
        </Table>
    );
};

export default ServerEvents;
