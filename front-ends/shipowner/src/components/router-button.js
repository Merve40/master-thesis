import React from 'react'
import Button from 'react-bootstrap/Button'
import {withRouter} from 'react-router-dom'

const RouterButton = withRouter(({history, path, buttonText}) => (
        <Button variant="outline-dark" type="submit" onClick={(e) =>  history.push(path)}>
            {buttonText}
        </Button>
    ))

export default RouterButton