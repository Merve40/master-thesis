// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

import "./ENS.sol";

contract Registrar {

    ENS ens;
    bytes32 rootNode;

    constructor (address ensAddr, bytes32 node) public {
        ens = ENS(ensAddr);
        rootNode = node;
    }

    function register(bytes32 subnode, address owner) public {
        bytes32 node = keccak256(abi.encodePacked(rootNode, subnode));
        address currentOwner = ens.owner(node);
        if(currentOwner != address(0) && currentOwner != msg.sender){
            revert();
        }
        ens.setSubnodeOwner(rootNode, subnode, owner);
    }
}
