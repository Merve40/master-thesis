import React from "react";
import { Table, Button } from "tabler-react";

const ContractsTable = ({ events }) => {
    return (
        <Table>
            <Table.Header>
                <Table.ColHeader>Contract</Table.ColHeader>
                <Table.ColHeader>Address</Table.ColHeader>
                <Table.ColHeader>Creator</Table.ColHeader>
                <Table.ColHeader>Time</Table.ColHeader>
            </Table.Header>
            <Table.Body>
                {events.map((e, idx) => (
                    <Table.Row key={idx}>
                        <Table.Col>{e.name}</Table.Col>
                        <Table.Col>{e.address}</Table.Col>
                        <Table.Col>{e.creator}</Table.Col>
                        <Table.Col>
                            {new Date(e.timestamp).toLocaleString()}
                        </Table.Col>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
};

export default ContractsTable;
