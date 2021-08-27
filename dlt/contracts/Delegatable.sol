// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Lib.sol";
import "./EthereumDIDRegistry.sol";
import "./ensregistry/ENS.sol";
import "./ensregistry/Resolver.sol";

contract Delegatable is Initializable {
    using Lib for address;

    event PaidContract(address indexed delegate);
    event FundReceived(address sender, uint256 amount);

    address public owner;
    Resolver public resolver;
    EthereumDIDRegistry didReg;
    ENS ens;

    uint256 public validity;
    uint256 public paymentFee = 5000;

    bytes32 constant delegateType = "sigAuth";
    bytes32 constant svcOracle = "did/svc/oracle";
    bytes32 constant svcBroker = "did/svc/broker";
    bytes32 public domain;

    mapping(address => bool) authorizedPayer;

    modifier onlyOwner {
        require(
            msg.sender == owner || msg.sender == address(this),
            "You are not the owner"
        );
        _;
    }

    function init(
        EthereumDIDRegistry reg,
        ENS _ens,
        Resolver res,
        address _owner
    ) external initializer() {
        owner = _owner;
        didReg = reg;
        ens = _ens;
        resolver = res;
        authorizedPayer[_owner] = true;
        validity = 1000 * 60 * 60 * 24 * 30; // 30 days;
    }

    function setPaymentFee(uint256 _fee) public onlyOwner {
        paymentFee = _fee;
    }

    function setDomain(bytes32 _domain) public {
        domain = _domain;
        ens.setResolver(domain, address(resolver));
    }

    function setValidity(uint256 _validity) public onlyOwner {
        validity = _validity;
    }

    function addDelegate(address delegate) public onlyOwner {
        didReg.addDelegate(address(this), delegateType, delegate, validity);
    }

    function addDelegates(address[] memory delegates) public onlyOwner {
        for (uint256 i = 0; i < delegates.length; i++) {
            address delegate = delegates[i];
            didReg.addDelegate(address(this), delegateType, delegate, validity);
        }
    }

    function addNamedDelegate(address delegate, bytes32 name) public onlyOwner {
        didReg.addDelegate(address(this), delegateType, delegate, validity);
        this.addSubdomain(name, delegate);
    }

    function addSubdomain(bytes32 subdomain, address newOwner)
        public
        onlyOwner
    {
        ens.setSubnodeOwner(domain, subdomain, newOwner);
        bytes32 newDomain = keccak256(abi.encodePacked(domain, subdomain));
        resolver.setAddr(newDomain, newOwner);
    }

    function isDelegate(address actor) public view returns (bool) {
        return didReg.validDelegate(address(this), delegateType, actor);
    }

    function addOracle(string memory oracle) public onlyOwner {
        didReg.setAttribute(
            address(this),
            svcOracle,
            abi.encodePacked(oracle),
            validity
        );
    }

    function addBroker(string memory broker) public onlyOwner {
        didReg.setAttribute(
            address(this),
            svcBroker,
            abi.encodePacked(broker),
            validity
        );
    }

    function authorizePayer(address delegate) public onlyOwner {
        require(isDelegate(delegate), "Actor is not a delegate");
        authorizedPayer[delegate] = true;
    }

    function revokeAuthorizedPayer(address delegate) public onlyOwner {
        authorizedPayer[delegate] = false;
    }

    function isAuthorizedPayer(address delegate) public view returns (bool) {
        return authorizedPayer[delegate];
    }

    function payContractFee(address billOfLading) public {
        require(
            isAuthorizedPayer(msg.sender),
            "You are not authorized to make payments"
        );
        uint256 fee = (2 * paymentFee);
        address charterparty = billOfLading.callAddress("charterparty()");
        uint256 fine = charterparty.callUint256("fineFee()");
        fee = fee + (3 * fine);
        emit PaidContract(msg.sender);
        billOfLading.callPayableVoid("deposit()", fee);
    }

    function transferFunds() public payable {
        emit FundReceived(msg.sender, msg.value);
    }
}
