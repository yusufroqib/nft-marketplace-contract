// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RockNFT.sol";

error AddressZeroDetected();
error MaxSupplyReached();
error NFTNotCreatedYet();
error AllowanceTooLow();
error NotOwner();
error InvalidPrice();
error ItemNotListed();
error ItemAlreadyListed();
error NotApprovedForMarketplace();
error PriceMismatch();

contract RockNFTMarketplace {
    using SafeERC20 for IERC20;

    address public immutable platformToken;
    address public immutable owner;
    uint256 private _itemIds;

    struct NFTInfo {
        uint256 price;
        address owner;
        bool isCreated;
    }

    struct UserOwnedNFT {
        address nftContract;
        uint256[] tokenIds;
    }

    struct MarketItem {
        uint256 itemId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool sold;
    }

    RockNFT[] public allNFTs;
    mapping(address nftContract => NFTInfo) public nftToInfo;
    mapping(address nftContract => MarketItem[]) public nftContractToMarketItems;
    mapping(uint256 itemId => MarketItem) private idToMarketItem;
    mapping(address nftContract => mapping(uint256 tokenId => bool))
        private listedNFTs;

    event NFTCreated(
        address indexed creator,
        RockNFT indexed nftContract,
        uint256 maxSupply
    );
    event NFTMinted(
        address indexed mintedBy,
        RockNFT indexed nftContract,
        uint256 tokenId
    );
    event NFTListed(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );
    event ListingCanceled(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId
    );
    event ListingUpdated(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 newPrice
    );

    constructor(address _platformToken) {
        owner = msg.sender;
        platformToken = _platformToken;
    }

    function createNFT(
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _maxSupply,
        uint256 _price
    ) external {
        if (msg.sender == address(0)) {
            revert AddressZeroDetected();
        }
        RockNFT newNFT = new RockNFT(
            msg.sender,
            _tokenName,
            _tokenSymbol,
            _maxSupply
        );

        allNFTs.push(newNFT);
        nftToInfo[address(newNFT)].price = _price;
        nftToInfo[address(newNFT)].isCreated = true;
        nftToInfo[address(newNFT)].owner = msg.sender;

        emit NFTCreated(msg.sender, newNFT, _maxSupply);
    }

    function mintNFT(RockNFT _nftContract) external {
        if (msg.sender == address(0)) {
            revert AddressZeroDetected();
        }
        if (_nftContract.totalSupply() == _nftContract.maxSupply()) {
            revert MaxSupplyReached();
        }
        if (nftToInfo[address(_nftContract)].isCreated == false) {
            revert NFTNotCreatedYet();
        }
        NFTInfo memory foundNFT = nftToInfo[address(_nftContract)];
        uint256 foundNFTPrice = foundNFT.price;

        if (
            IERC20(platformToken).allowance(msg.sender, address(this)) <
            foundNFTPrice
        ) {
            revert AllowanceTooLow();
        }

        IERC20(platformToken).safeTransferFrom(
            msg.sender,
            foundNFT.owner,
            foundNFTPrice
        );
        uint256 tokenId = _nftContract.safeMint(msg.sender);
        emit NFTMinted(msg.sender, _nftContract, tokenId);
    }

    function listNFT(
        RockNFT _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) external {
        if (_price == 0) revert InvalidPrice();
        if (nftToInfo[address(_nftContract)].isCreated == false) {
            revert NFTNotCreatedYet();
        }
        if (_nftContract.ownerOf(_tokenId) != msg.sender) revert NotOwner();
        if (!_nftContract.isApprovedForAll(msg.sender, address(this)))
            revert NotApprovedForMarketplace();
        if (listedNFTs[address(_nftContract)][_tokenId])
            revert ItemAlreadyListed();

        _itemIds++;
        MarketItem memory newItem = MarketItem(
            _itemIds,
            address(_nftContract),
            _tokenId,
            msg.sender,
            _price,
            false
        );

        idToMarketItem[_itemIds] = newItem;
        nftContractToMarketItems[address(_nftContract)].push(newItem);
        listedNFTs[address(_nftContract)][_tokenId] = true;

        emit NFTListed(
            _itemIds,
            address(_nftContract),
            _tokenId,
            msg.sender,
            _price
        );
    }

    function buyNFT(uint256 _itemId) external {
        MarketItem storage item = idToMarketItem[_itemId];
        if (!item.sold && item.seller != address(0)) {
            if (RockNFT(item.nftContract).ownerOf(item.tokenId) != item.seller)
                revert NotOwner();
            if (
                IERC20(platformToken).allowance(msg.sender, address(this)) <
                item.price
            ) revert AllowanceTooLow();

            IERC20(platformToken).safeTransferFrom(
                msg.sender,
                item.seller,
                item.price
            );
            RockNFT(item.nftContract).safeTransferFrom(
                item.seller,
                msg.sender,
                item.tokenId
            );
            item.sold = true;
            listedNFTs[item.nftContract][item.tokenId] = false;

            emit NFTSold(
                _itemId,
                item.nftContract,
                item.tokenId,
                item.seller,
                msg.sender,
                item.price
            );
        } else {
            revert ItemNotListed();
        }
    }

    function cancelListing(uint256 _itemId) external {
        MarketItem storage item = idToMarketItem[_itemId];
        if (item.seller != msg.sender) revert NotOwner();
        if (item.sold) revert ItemNotListed();

        delete idToMarketItem[_itemId];
        listedNFTs[item.nftContract][item.tokenId] = false;

        emit ListingCanceled(_itemId, item.nftContract, item.tokenId);
    }

    function updateListing(uint256 _itemId, uint256 _newPrice) external {
        if (_newPrice == 0) revert InvalidPrice();
        MarketItem storage item = idToMarketItem[_itemId];
        if (item.seller != msg.sender) revert NotOwner();
        if (item.sold) revert ItemNotListed();

        item.price = _newPrice;

        emit ListingUpdated(_itemId, item.nftContract, item.tokenId, _newPrice);
    }

    function getAllOwnedNFTs(
        address _user
    ) external view returns (UserOwnedNFT[] memory) {
        uint totalNFTContracts = allNFTs.length;
        uint totalNFTCount = 0;

        // Count how many NFTs the user owns across all contracts
        for (uint256 i = 0; i < totalNFTContracts; i++) {
            totalNFTCount += allNFTs[i].balanceOf(_user);
        }

        // Initialize an array of structs to store the owned NFTs and their contract addresses
        UserOwnedNFT[] memory ownedNFTs = new UserOwnedNFT[](totalNFTContracts);
        uint currentIndex = 0;

        // Loop through all contracts and get the NFTs owned by the user
        for (uint256 i = 0; i < totalNFTContracts; i++) {
            uint256 balance = allNFTs[i].balanceOf(_user);

            if (balance > 0) {
                uint256[] memory tokenIds = new uint256[](balance);

                for (uint256 j = 0; j < balance; j++) {
                    tokenIds[j] = allNFTs[i].tokenOfOwnerByIndex(_user, j);
                }

                // Store the contract address and its associated token IDs in the result
                ownedNFTs[currentIndex] = UserOwnedNFT({
                    nftContract: address(allNFTs[i]),
                    tokenIds: tokenIds
                });

                currentIndex++;
            }
        }

        return ownedNFTs;
    }
}
