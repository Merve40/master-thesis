// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Lib.sol";
import "./Oracle.sol";

contract ProofOfDelivery is Initializable {
    using Lib for address;

    bytes32 max_moisture_level;
    bytes32 laytime;
    bytes32 time_loaded;
    bytes32 loaded_quantity;

    bytes32 public time_delivery;
    bytes32 public cargo_quantity;
    bytes32 public cargo_moisture_level;

    bytes32 public merkleroot;
    bytes signature;

    Oracle oracle;
    address public billOfLading;
    address charterparty;

    address public owner;

    bool private hasChecked = false;

    modifier isOwner {
        require(msg.sender == owner, "You are not the owner");
        _;
    }

    function init(
        address orcl,
        address _bol,
        bytes32 _merkleroot,
        bytes32 _cargo_quantity,
        bytes32 _cargo_moisture_level,
        bytes32 _time_delivery
    ) public initializer() {
        address addr = _bol.callAddress("consignee_addr()");
        require(
            msg.sender == addr,
            "You are not authorized to issue a PoD for this B/L"
        );

        oracle = Oracle(orcl);
        billOfLading = _bol;
        owner = addr;

        billOfLading.callVoid("requestFunds()");
        charterparty = billOfLading.callAddress("charterparty()");

        time_loaded = billOfLading.callBytes32("time_loaded()");
        loaded_quantity = billOfLading.callBytes32("cargo_quantity()");
        laytime = charterparty.callBytes32("laytime()");
        max_moisture_level = charterparty.callBytes32("max_moisture_level()");
        time_delivery = _time_delivery;
        cargo_quantity = _cargo_quantity;
        cargo_moisture_level = _cargo_moisture_level;

        address charterer = charterparty.callAddress("charterer()");
        merkleroot = _merkleroot;
        oracle.merkleroot(merkleroot, charterer);

        oracle.createdProofOfDelivery(billOfLading, charterer);

        bytes32[10] memory checks;
        checks[0] = cargo_moisture_level;
        checks[1] = max_moisture_level;
        checks[2] = laytime;
        checks[3] = time_loaded;
        checks[4] = time_delivery;
        checks[5] = loaded_quantity;
        checks[6] = cargo_quantity;

        oracle.makeBatchQueryRequest(checks, this.checkMultiple);
    }

    function submitSignature(bytes memory _signature) public isOwner {
        require(hasChecked, "Checks have not been performed yet!");
        //BillOfLading2 bol = BillOfLading2(billOfLading);
        address shipowner = charterparty.callAddress("shipowner()");
        if (address(msg.sender).verify(address(this), _signature)) {
            signature = _signature;
            oracle.signatureEvent("proofOfDelivery", msg.sender, signature);
            payable(msg.sender).transfer(
                //bol.charterparty().shipowner().paymentFee()
                shipowner.callUint256("paymentFee()")
            );

            //transfer deposit back to shipowner
            uint256 balance = address(this).balance;
            if (balance > 0) {
                //bol.charterparty().shipowner().transferFunds{value: balance}();
                shipowner.callPayableVoid("transferFunds()", balance);
            }
        } else {
            revert("Invalid Signature");
        }
    }

    function checkMultiple(
        int256[] calldata mapInt,
        bytes32[] calldata mapBytes32
    ) external {
        if (mapInt.length != 7) {
            revert("invalid parameters");
        }

        bytes32[7] memory checks =
            [
                cargo_moisture_level,
                max_moisture_level,
                laytime,
                time_loaded,
                time_delivery,
                loaded_quantity,
                cargo_quantity
            ];

        int256 maxMoistureLevel = 0;
        int256 actualMoistureLevel = 0;
        int256 laytime = 0;
        int256 timeLoaded = 0;
        int256 timeDelivered = 0;
        int256 expectedQuantity = 0;
        int256 actualQuantity = 0;

        for (uint256 i = 0; i < mapInt.length; i++) {
            int256 value = mapInt[i];
            bytes32 hash = keccak256(abi.encodePacked(value));

            if (hash == checks[0]) {
                actualMoistureLevel = value;
            } else if (hash == checks[1]) {
                maxMoistureLevel = value;
            } else if (hash == checks[2]) {
                laytime = value;
            } else if (hash == checks[3]) {
                timeLoaded = value;
            } else if (hash == checks[4]) {
                timeDelivered = value;
            } else if (hash == checks[5]) {
                expectedQuantity = value;
            } else if (hash == checks[6]) {
                actualQuantity = value;
            } else {
                revert("Given parameters do not match.");
            }
        }

        address charterer = charterparty.callAddress("charterer()");
        uint256 fineFee = charterparty.callUint256("fineFee()");

        if (cargo_moisture_level != max_moisture_level) {
            //checkMoistureLevel(maxMoistureLevel, actualMoistureLevel);
            if (actualMoistureLevel > maxMoistureLevel) {
                charterer.callPayableVoid("transferFunds()", fineFee);
                oracle.warn("MaxMoistureLevelExceeded");
            }
        }

        if (cargo_quantity != loaded_quantity) {
            //checkQuantity(expectedQuantity, actualQuantity);
            if (actualQuantity < expectedQuantity) {
                charterer.callPayableVoid("transferFunds()", fineFee);
                oracle.warn("QuantityMissing");
            }
        }

        //checkDelay(timeLoaded, timeDelivered, laytime);
        if ((timeDelivered - timeLoaded) > laytime) {
            charterer.callPayableVoid("transferFunds()", fineFee);
            oracle.warn("MaxDelayExceeded");
        }
        hasChecked = true;
    }

    function deposit() public payable {
        oracle.deposited(msg.value);
    }
}
