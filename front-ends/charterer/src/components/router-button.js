import React from "react";
import Button from "react-bootstrap/Button";
import { withRouter } from "react-router-dom";

const RouterButton = withRouter(({ history, path, buttonText, state }) => (
    <Button
        variant="outline-dark"
        type="submit"
        onClick={(e) => history.push({ pathname: path, state })}
    >
        {buttonText}
    </Button>
));

export default RouterButton;
