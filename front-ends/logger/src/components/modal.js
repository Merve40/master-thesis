import React, { useState } from "react";
import { Button, Card } from "tabler-react";
import Modal from "react-modal";
import { GrClose } from "react-icons/gr";

import AsCard from "./cardify";

const customStyles = {
    content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-50%",
        padding: "0",
        transform: "translate(-50%, -50%)",
        maxWidth: "80%",
    },
};

const MyModal = ({ title, body, open, setOpen }) => {
    return (
        <Modal
            isOpen={open}
            onRequestClose={() => setOpen(false)}
            style={customStyles}
            contentLabel="Example Modal"
            parentSelector={() => document.querySelector("#root")}
        >
            <div className="p-5">
                <h4 className="d-inline">{title}</h4>
                <a
                    href=""
                    style={{
                        float: "right",
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        setOpen(false);
                    }}
                >
                    <GrClose size="0.8em" color="lightgray" />
                </a>
            </div>
            <div
                style={{
                    height: "1px",
                    backgroundColor: "lightgray",
                }}
            ></div>
            <div className="p-0">
                <pre
                    style={{
                        padding: "0",
                        height: "auto",
                        overflow: "auto",
                        maxHeight: "500px",
                        wordBreak: "break-word",
                        wordWrap: "normal",
                        whiteSpace: "pre-wrap",
                        display: "flex",
                    }}
                >
                    {body}
                </pre>
            </div>
        </Modal>
    );
};

export default MyModal;
