import React from "react";
import { withRouter } from "react-router";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";

import { verify } from "./credentials";

const DetailCredential = ({ history, credential }) => {
    return (
        <div>
            <Table responsive>
                <tbody>
                    <tr>
                        <td>Issuer</td>
                        <td style={{ color: "gray" }}>
                            {credential.issuer.name}
                        </td>
                    </tr>
                    <tr>
                        <td>Subject</td>
                        <td style={{ color: "gray" }}>
                            {credential.subject.name}
                        </td>
                    </tr>
                    <tr>
                        <td>Issue Date</td>
                        <td style={{ color: "gray" }}>
                            {new Date(credential.date * 1000).toLocaleString()}
                        </td>
                    </tr>
                    <tr>
                        <td className="col-4">Credential Token</td>
                        <td className="col-8" style={{ color: "gray" }}>
                            <div
                                style={{
                                    wordWrap: "break-word",
                                    wordBreak: "break-all",
                                    textAlign: "justify",
                                }}
                            >
                                {credential.jwt}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td></td>
                        <td>
                            <Button
                                style={{ float: "right" }}
                                variant="primary"
                                onClick={() =>
                                    history.push(
                                        `/credential/${credential.jwt}`
                                    )
                                }
                            >
                                Verify
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export default withRouter(DetailCredential);
