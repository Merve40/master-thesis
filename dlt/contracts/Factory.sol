// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./Clone.sol";
import "./Charterparty.sol";
import "./BillOfLading.sol";
import "./ProofOfDelivery.sol";

/**
 * This factory creates clones of single deployed contracts in order to save gas.
 * Newly created clones are unclaimed until they are initialized with 'init(..)'
 *
 */
contract Factory {
    event CreatedCharterparty(
        address indexed creator,
        uint256 index,
        address _address
    );
    event CreatedBillOfLading(
        address indexed creator,
        uint256 index,
        address _address
    );
    event CreatedProofOfDelivery(
        address indexed creator,
        uint256 index,
        address _address
    );

    Charterparty private master;
    Charterparty[] charterparties;

    BillOfLading private master2;
    BillOfLading[] billsOfLading;

    ProofOfDelivery private master3;
    ProofOfDelivery[] proofOfDeliveries;

    constructor() public {
        master = new Charterparty();
        master2 = new BillOfLading();
        master3 = new ProofOfDelivery();
    }

    function createCharterparty() external {
        Charterparty charterparty =
            Charterparty(Clone.createClone(address(master)));
        charterparties.push(charterparty);
        uint256 index = charterparties.length - 1;
        emit CreatedCharterparty(msg.sender, index, address(charterparty));
    }

    function getCharterparty(uint256 index) public view returns (Charterparty) {
        return charterparties[index];
    }

    function createBillOfLading() external {
        BillOfLading billOfLading =
            BillOfLading(Clone.createClone(address(master2)));
        billsOfLading.push(billOfLading);
        uint256 index = billsOfLading.length - 1;
        emit CreatedBillOfLading(msg.sender, index, address(billOfLading));
    }

    function getBillOfLading(uint256 index) public view returns (BillOfLading) {
        return billsOfLading[index];
    }

    function createProofOfDelivery() external {
        ProofOfDelivery proofOfDelivery =
            ProofOfDelivery(Clone.createClone(address(master3)));
        proofOfDeliveries.push(proofOfDelivery);
        uint256 index = proofOfDeliveries.length - 1;
        emit CreatedProofOfDelivery(
            msg.sender,
            index,
            address(proofOfDelivery)
        );
    }

    function getProofOfDelivery(uint256 index)
        public
        view
        returns (ProofOfDelivery)
    {
        return proofOfDeliveries[index];
    }
}
