// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

/*
    Library for signature verification
*/
library Lib {
    function getMessageHash(address _to) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_to));
    }

    function getEthSignedMessageHash(bytes32 _messageHash)
        private
        pure
        returns (bytes32)
    {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) private pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig)
        private
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function verify(
        address _signer,
        address _to,
        bytes memory signature
    ) external pure returns (bool) {
        bytes32 messageHash = getMessageHash(_to);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == _signer;
    }

    function verifyWithHash(
        address signer,
        bytes32 hash,
        bytes memory signature
    ) external pure returns (bool) {
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(hash);
        return recoverSigner(ethSignedMessageHash, signature) == signer;
    }

    function bytesToBytes32(bytes memory bys)
        private
        pure
        returns (bytes32 encoded)
    {
        assembly {
            encoded := mload(add(bys, 32))
        }
    }

    function callBytes32(address _contract, string memory method)
        public
        returns (bytes32)
    {
        (bool success, bytes memory data) =
            _contract.call(abi.encodeWithSignature(method));
        if (!success) {
            revert("Lib: CALL failed");
        }
        return abi.decode(data, (bytes32));
    }

    function bytesToAddress(bytes memory bys)
        public
        pure
        returns (address addr)
    {
        assembly {
            addr := mload(add(bys, 20))
        }
    }

    function callAddress(address _contract, string memory method)
        public
        returns (address)
    {
        (bool success, bytes memory data) =
            _contract.call(abi.encodeWithSignature(method));
        if (!success) {
            revert("Lib: CALL failed");
        }
        return abi.decode(data, (address));
    }

    function callVoid(address _contract, string memory method) public {
        (bool success, bytes memory data) =
            _contract.call(abi.encodeWithSignature(method));
        if (!success) {
            revert("Lib: CALL failed");
        }
    }

    function toUint256(bytes memory _bytes)
        internal
        pure
        returns (uint256 value)
    {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }

    function callUint256(address _contract, string memory method)
        public
        returns (uint256)
    {
        (bool success, bytes memory data) =
            _contract.call(abi.encodeWithSignature(method));
        if (!success) {
            revert("CALL failed");
        }
        return abi.decode(data, (uint256));
    }

    function callPayableVoid(
        address _contract,
        string memory method,
        uint256 amount
    ) public {
        (bool success, bytes memory data) =
            _contract.call{value: amount}(abi.encodeWithSignature(method));
        if (!success) {
            revert("CALL failed");
        }
    }
}
