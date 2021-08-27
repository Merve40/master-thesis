import React, { useState, useEffect, useContext } from "react";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import { get } from "../../util";
import { UserContext } from "../../App";

const CredentialsCheckbox = ({ set, bl }) => {
    const [credentials, setCredentials] = useState([]);
    const user = useContext(UserContext);

    useEffect(() => {
        get(`/credentials/${user._id}?billOfLading=${bl.contract_address}`)
            .then((response) => response.json())
            .then((data) => {
                setCredentials(data);
            });
    }, []);

    return (
        <>
            {credentials.length == 0 ? (
                <div className="mt-3" style={{ color: "gray" }}>
                    There are currently no credentials
                </div>
            ) : (
                <Form>
                    {credentials.map((_, index) => (
                        <Alert key={index} variant="secondary">
                            <Form.Check
                                type="radio"
                                id={index}
                                name="radio"
                                label={`Issued by ${
                                    credentials[index].issuer.name
                                } on
                    ${new Date(credentials[index].date * 1000).toLocaleString(
                        "de-DE"
                    )}`}
                                onChange={() => set(credentials[index])}
                            />
                        </Alert>
                    ))}
                </Form>
            )}
        </>
    );
};

export default CredentialsCheckbox;
