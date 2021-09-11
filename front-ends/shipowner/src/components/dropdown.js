import React, { forwardRef, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";

const MyDropdown = ({ currentItem, list, action }) => {
    const [current, setCurrent] = useState(currentItem);

    const CustomToggle = forwardRef(({ children, onClick }, ref) => (
        <a
            href=""
            ref={ref}
            onClick={(e) => {
                e.preventDefault();
                onClick(e);
            }}
        >
            {children}
            &#x25bc;
        </a>
    ));

    // forwardRef again here!
    // Dropdown needs access to the DOM of the Menu to measure it
    const CustomMenu = forwardRef(
        (
            { children, style, show, className, "aria-labelledby": labeledBy },
            ref
        ) => {
            return (
                <div
                    id="custom-menu"
                    ref={ref}
                    className={className}
                    style={{
                        ...style,
                    }}
                    aria-labelledby={labeledBy}
                >
                    <ul className="list-unstyled">
                        {React.Children.toArray(children).map((c) => (
                            <div
                                onClick={(e) => {
                                    setCurrent(e.target.text);
                                    action(e.target.text);
                                }}
                            >
                                {c}
                            </div>
                        ))}
                    </ul>
                </div>
            );
        }
    );

    return (
        <Dropdown>
            <Dropdown.Toggle as={CustomToggle} id="dropdown-custom-components">
                {current}
            </Dropdown.Toggle>

            <Dropdown.Menu className="dropdown-menu-right" as={CustomMenu}>
                {list.map((i, idx) => (
                    <Dropdown.Item key={idx} eventKey={idx}>
                        {i}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default MyDropdown;
