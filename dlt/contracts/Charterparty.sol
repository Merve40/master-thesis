// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Oracle.sol";
import "./Delegatable.sol";
import "./Lib.sol";

contract Charterparty is Initializable {
    using Lib for address;

    Delegatable public shipowner;
    Delegatable public charterer;

    address public agent_loading_port;
    address public agent_discharging_port;

    bytes public signature_shipowner;
    bytes public signature_charterer;

    uint256 public fineFee;
    bytes32 public laytime;
    bytes32 public max_moisture_level;

    bytes32 public merkleroot;

    Oracle oracle;

    modifier isOwner(Delegatable _charterer, Delegatable _shipowner) {
        require(
            msg.sender == _charterer.owner() ||
                msg.sender == _shipowner.owner() ||
                _charterer.isDelegate(msg.sender) ||
                _shipowner.isDelegate(msg.sender),
            "You are not authorized to create a Charterparty."
        );
        _;
    }

    function init(
        address orcl,
        Delegatable _charterer,
        Delegatable _shipowner,
        address agent_loading,
        address agent_discharging
    ) public initializer() isOwner(_charterer, _shipowner) {
        oracle = Oracle(address(orcl));
        charterer = _charterer;
        shipowner = _shipowner;
        agent_loading_port = agent_loading;
        agent_discharging_port = agent_discharging;

        // notify other party
        if (
            msg.sender == charterer.owner() || charterer.isDelegate(msg.sender)
        ) {
            oracle.notifyParty(
                address(this),
                shipowner.owner(),
                address(charterer)
            );
        } else {
            oracle.notifyParty(
                address(this),
                charterer.owner(),
                address(shipowner)
            );
        }
    }

    /**
     * Expects hashed and abi-encoded inputs (using soliditySha3).
     */
    function initialize(
        bytes32 _merkleroot,
        uint256 _fine,
        bytes32 max_moist_level,
        bytes32 _laytime
    ) public isOwner(charterer, shipowner) {
        require(merkleroot == 0, "Contract has already been initialized");

        fineFee = _fine;
        laytime = _laytime;
        max_moisture_level = max_moist_level;
        merkleroot = _merkleroot;
        oracle.merkleroot(merkleroot, msg.sender);
    }

    function submitSignature(bytes memory signature) public {
        require(
            msg.sender == charterer.owner() || msg.sender == shipowner.owner(),
            "You are not authorized to sign"
        );

        if (
            msg.sender == shipowner.owner() && signature_shipowner.length == 0
        ) {
            if (address(msg.sender).verify(address(this), signature)) {
                signature_shipowner = signature;
                oracle.signatureEvent("charterparty", msg.sender, signature);
            } else {
                revert("Invalid signature");
            }
        } else if (signature_charterer.length == 0) {
            if (address(msg.sender).verify(address(this), signature)) {
                signature_charterer = signature;
                oracle.signatureEvent("charterparty", msg.sender, signature);
            } else {
                revert("Invalid signature");
            }
        } else {
            revert("Contract has already been signed.");
        }
    }
}
