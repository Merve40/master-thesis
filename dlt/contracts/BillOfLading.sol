// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Lib.sol";
import "./Oracle.sol";

contract BillOfLading is Initializable {
    using Lib for address;

    event onCredentialSubmitted(string jwt);

    address public consignee_addr;
    address public agent_loading_port;

    bytes32 public time_loaded;
    bytes32 public cargo_quantity;
    bytes32 public cargo_moisture_level;

    bytes public signature_agent;

    Oracle oracle;
    address public charterparty;

    bool public deposited = false;
    bytes32 public merkleroot;

    address owner;

    modifier isOwner {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    function init(address orcl, address _charterparty) public initializer() {
        require(
            msg.sender == _charterparty.callAddress("agent_loading_port()"),
            "You are not authorized"
        );

        oracle = Oracle(orcl);
        charterparty = _charterparty;
        consignee_addr = charterparty.callAddress("agent_discharging_port()");
        agent_loading_port = charterparty.callAddress("agent_loading_port()");
        owner = agent_loading_port;
    }

    function initialize(
        bytes32 _merkleroot,
        bytes32 _time_loaded,
        bytes32 _cargo_quantity,
        bytes32 _cargo_moisture_level
    ) public isOwner {
        require(merkleroot == 0, "Contract has already been initialized");

        time_loaded = _time_loaded;
        cargo_quantity = _cargo_quantity;
        cargo_moisture_level = _cargo_moisture_level;

        address charterer = charterparty.callAddress("charterer()");
        merkleroot = _merkleroot;
        oracle.merkleroot(merkleroot, charterer);

        oracle.createdBillOfLading(charterparty, charterer);
    }

    function submitCredential(string memory jwt) public {
        emit onCredentialSubmitted(jwt);
    }

    function submitSignature(bytes memory signature) public isOwner {
        require(deposited, "Aborted: deposit is missing.");
        if (address(msg.sender).verify(address(this), signature)) {
            signature_agent = signature;
            oracle.signatureEvent("billOfLading", msg.sender, signature);

            address shipowner = charterparty.callAddress("shipowner()");
            uint256 paymentFee = shipowner.callUint256("paymentFee()");
            payable(msg.sender).transfer(paymentFee);
        } else {
            revert("Invalid signature");
        }
    }

    /**
     * Checks whether the measured moisture level exceeds
     * the agreed upon maximum moisture level.
     */
    function checkMoistureLevel(
        int256[] calldata mapInt,
        bytes32[] calldata mapBytes32
    ) external {
        if (mapInt.length != 2) {
            revert("invalid parameters");
        }

        int256 maxMoistureLevel = 0;
        int256 actualMoistureLevel = 0;

        for (uint256 i = 0; i < mapInt.length; i++) {
            int256 value = mapInt[i];
            bytes32 hash = keccak256(abi.encodePacked(value));

            if (hash == cargo_moisture_level) {
                actualMoistureLevel = value;
            } else if (
                hash == charterparty.callBytes32("max_moisture_level()")
            ) {
                maxMoistureLevel = value;
            } else {
                revert("Given parameters do not match");
            }
        }

        if (actualMoistureLevel > maxMoistureLevel) {
            oracle.warn("MaxMoistureLevelExceeded");
        }
    }

    function deposit() public payable {
        // payments of agents
        address shipowner = charterparty.callAddress("shipowner()");
        uint256 paymentFee = shipowner.callUint256("paymentFee()");
        uint256 agentFees = paymentFee * 2;
        // total deposit of three fees
        uint256 fines = 3 * charterparty.callUint256("fineFee()");
        uint256 total = fines + agentFees;

        if (msg.value < total) {
            revert("Contract does not have sufficient balance");
        }

        deposited = true;
        oracle.deposited(msg.value);
    }

    function requestFunds() external {
        address proofOfDelivery = msg.sender;
        require(
            consignee_addr == proofOfDelivery.callAddress("owner()"),
            "You are not authorized"
        );
        require(
            signature_agent.length != 0,
            "Bill of Lading was not signed yet"
        );
        address(msg.sender).callPayableVoid("deposit()", address(this).balance);
    }
}
