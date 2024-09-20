// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RockNFT is ERC721, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    uint256 public immutable maxSupply;
    address public immutable allowedContract;

    constructor(
        address initialOwner,
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _maxSupply
    ) ERC721(_tokenName, _tokenSymbol) Ownable(initialOwner) {
        maxSupply = _maxSupply;
        allowedContract = msg.sender;
    }

    function safeMint(address to) public returns (uint256) {
        require(msg.sender == allowedContract, "Not the allowed contract");
        require(totalSupply() < maxSupply, "Maximum supply minted");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
