// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract Resolver is Initializable {
    event AddrChanged(bytes32 indexed node, address a);

    address owner;
    mapping(bytes32 => address) addresses;

    modifier only_owner() {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function init(address _owner) public initializer() {
        owner = _owner;
    }

    function addr(bytes32 node) public view returns (address) {
        return addresses[node];
    }

    function setAddr(bytes32 node, address addr) public only_owner {
        addresses[node] = addr;
        emit AddrChanged(node, addr);
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == 0x3b3b57de || interfaceID == 0x01ffc9a7;
    }

    fallback() external payable {
        revert("Not implemented");
    }
}
