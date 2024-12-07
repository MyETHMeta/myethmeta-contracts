// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MyETHMeta is EIP712 {
    mapping(address => string) private metaURIs;
    mapping(address => uint256) private _nonces;

    event MetaURIChanged(address indexed ethAddress, string uri);

    constructor() EIP712("MyETHMeta", "1") {}

    function getMetaURI(
        address ethAddress
    ) public view returns (string memory) {
        return metaURIs[ethAddress];
    }

    function setMetaURI(string memory uri) public {
        _setMetaURI(msg.sender, uri);
    }

    // -- EIP-712 metatransaction support --

    function getNonce(address owner) public view virtual returns (uint256) {
        return _nonces[owner];
    }

    function _useNonce(
        address owner,
        uint256 nonce
    ) internal virtual returns (uint256) {
        uint256 currentNonce = _nonces[owner];
        require(currentNonce == nonce, "Invalid nonce");
        return _nonces[owner]++;
    }

    bytes32 constant SET_META_URI_TYPEHASH =
        keccak256("SetMetaURI(address owner,string uri,uint256 nonce)");

    function setMetaURIMetaTX(
        address owner,
        string memory uri,
        uint256 nonce,
        bytes calldata signature
    ) public {
        uint256 currentNonce = _useNonce(owner, nonce);
        (address recoveredAddress, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        SET_META_URI_TYPEHASH,
                        owner,
                        keccak256(bytes(uri)),
                        currentNonce
                    )
                )
            ),
            signature
        );

        require(
            err == ECDSA.RecoverError.NoError && recoveredAddress == owner,
            "Signature error"
        );

        _setMetaURI(owner, uri);
    }

    // -- internal methods --

    function _setMetaURI(address owner, string memory uri) internal {
        metaURIs[owner] = uri;
        emit MetaURIChanged(owner, uri);
    }
}
