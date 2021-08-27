// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Oracle {
    event SignedContract(
        address indexed _contract,
        string contractName,
        address indexed signer,
        bytes signature
    );
    event CreatedCharterparty(
        address charterparty,
        address indexed notifyParty,
        address creator
    );
    event CreatedBillOfLading(
        address indexed charterparty,
        address billOfLading,
        address creator
    );
    event CreatedProofOfDelivery(
        address indexed billOfLading,
        address proofOfDelivery,
        address creator
    );
    event Merkleroot(
        address indexed srcContract,
        address setter,
        bytes32 merkleroot
    );
    event Warn(address indexed srcContract, string warning);
    event BatchQuery(
        address indexed srcContract,
        uint256 handle,
        bytes32[10] values
    );
    event Deposited(address indexed srcContract, uint256 amount);

    mapping(uint256 => function(int256[] memory, bytes32[] memory)
        external) callbacks;

    function makeBatchQueryRequest(
        bytes32[10] calldata values,
        function(int256[] memory, bytes32[] memory) external callback
    ) external {
        uint256 handle = block.timestamp;
        callbacks[handle] = callback;
        emit BatchQuery(msg.sender, handle, values);
    }

    function submitBatchQuery(
        uint256 handle,
        int256[] memory mapInt,
        bytes32[] memory mapBytes32
    ) public {
        callbacks[handle](mapInt, mapBytes32);
    }

    function warn(string calldata warning) external {
        emit Warn(msg.sender, warning);
    }

    function merkleroot(bytes32 root, address setter) external {
        emit Merkleroot(msg.sender, setter, root);
    }

    function notifyParty(
        address charterparty,
        address notify,
        address creator
    ) external {
        emit CreatedCharterparty(charterparty, notify, creator);
    }

    function createdBillOfLading(address charterparty, address creator)
        external
    {
        emit CreatedBillOfLading(charterparty, msg.sender, creator);
    }

    function createdProofOfDelivery(address billOfLading, address creator)
        external
    {
        emit CreatedProofOfDelivery(billOfLading, msg.sender, creator);
    }

    function signatureEvent(
        string calldata contractName,
        address signer,
        bytes calldata signature
    ) external {
        emit SignedContract(msg.sender, contractName, signer, signature);
    }

    function deposited(uint256 amount) external {
        emit Deposited(msg.sender, amount);
    }
}
