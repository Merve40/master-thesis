// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

contract ENS {
    struct Record {
        address owner;
        address resolver;
        uint64 ttl;
    }

    mapping(bytes32 => Record) records;

    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);

    modifier only_owner(bytes32 node) {
        require(records[node].owner == msg.sender, "You are not authorized");
        _;
    }

    modifier has_node(bytes32 node) {
        require(records[node].owner != address(0), "You are not authorized");
        _;
    }

    constructor() public {
        records[0x0].owner = msg.sender;
    }

    function owner(bytes32 node) public view returns (address) {
        return records[node].owner;
    }

    function resolver(bytes32 node) public view returns (address) {
        return records[node].resolver;
    }

    function ttl(bytes32 node) public view returns (uint64) {
        return records[node].ttl;
    }

    function setOwner(bytes32 node, address owner) public only_owner(node) {
        emit Transfer(node, owner);
        records[node].owner = owner;
    }

    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address owner
    ) public only_owner(node) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        emit NewOwner(node, label, owner);
        records[subnode].owner = owner;
    }

    function setResolver(bytes32 node, address resolver)
        public
        only_owner(node)
    {
        emit NewResolver(node, resolver);
        records[node].resolver = resolver;
    }

    function setTTL(bytes32 node, uint64 ttl) public only_owner(node) {
        emit NewTTL(node, ttl);
        records[node].ttl = ttl;
    }
}
