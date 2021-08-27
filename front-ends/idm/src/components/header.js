import React from 'react'

import Row from 'react-bootstrap/Row'
import Col from "react-bootstrap/Col"

const Header = () => {
    return (
        <header>
            <Row className="p-3" style={{backgroundColor:"blue", color: "ivory"}}>
                <Col> <h1>Decentralized Identity Management </h1>  </Col>
            </Row>
        </header>
    )
}

export default Header
