// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./Clone.sol";
import "./EthereumDIDRegistry.sol";
import "./ensregistry/ENS.sol";
import "./ensregistry/Resolver.sol";
import "./Delegatable.sol";

contract DelegatableFactory {
    event CreatedDelegatable(address indexed creator, address _address);

    ENS ens;
    EthereumDIDRegistry didReg;

    Resolver master;
    Delegatable master2;
    mapping(address => address) delegatables;

    //Delegatable[] delegatables;

    constructor(ENS _ens, EthereumDIDRegistry _didReg) public {
        ens = _ens;
        didReg = _didReg;
        master = new Resolver();
        master2 = new Delegatable();
    }

    function createResolver(address owner) internal returns (Resolver) {
        Resolver resolver =
            Resolver(payable(Clone.createClone(address(master))));
        resolver.init(owner);
        return resolver;
    }

    function createDelegatable() public {
        if (delegatables[msg.sender] == address(0)) {
            Delegatable del = Delegatable(Clone.createClone(address(master2)));
            Resolver res = createResolver(address(del));
            del.init(didReg, ens, res, msg.sender);
            emit CreatedDelegatable(msg.sender, address(del));
        } else {
            emit CreatedDelegatable(msg.sender, delegatables[msg.sender]);
        }
    }
}
