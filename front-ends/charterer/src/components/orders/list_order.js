import React, {useContext} from 'react'
import Container from 'react-bootstrap/Container'
import ItemOrder from './item_order'

const ListOrder = ({ orders }) => {
   
    return (
        <Container className="mt-5">
            <p className="h5">Orders:</p>
            {
                orders.length > 0 ?
                orders.map((_, index) => (
                    <ItemOrder key={index} item={orders[index]} index={index} />
                ))
                : (<div className="mt-3" style={{color: 'gray'}}>There are currently no orders</div>)
            }
        </Container>
    )
}

export default ListOrder
