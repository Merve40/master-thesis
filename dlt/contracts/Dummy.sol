// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

/**
 * Used as a fix for out of sync error
 */
contract Dummy {
    event DummyEvent();

    function dummy() public {
        emit DummyEvent();
    }
}
