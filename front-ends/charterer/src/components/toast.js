import React from "react";
import Toast from "react-bootstrap/Toast";

const CustomToast = ({ show, setShow, header, body }) => {
    return (
        <Toast
            onClose={() => setShow(false)}
            show={show}
            delay={5000}
            autohide
            style={{
                position: "absolute",
                top: 5,
                right: 10,
                zIndex: 2000,
            }}
        >
            <Toast.Header>
                <strong className="mr-auto">{header}</strong>
                <small>now</small>
            </Toast.Header>
            <Toast.Body>{body}</Toast.Body>
        </Toast>
    );
};

export default CustomToast;
