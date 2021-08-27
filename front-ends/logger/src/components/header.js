import React, { useState } from "react";
import { Nav } from "tabler-react";
import { withRouter } from "react-router";
import { FaEthereum } from "react-icons/fa";

const Header = ({ history }) => {
    return (
        <Nav>
            <Nav.Item useExact="false" active icon="globe" value="Overview" />
        </Nav>
    );
};

export default withRouter(Header);
