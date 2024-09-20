import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("RockNFTMarketplace", function () {
	async function deployFixture() {
		const addressZero = ethers.ZeroAddress;
		const ethAmt = ethers.parseEther("10");
		await helpers.impersonateAccount(addressZero);
		await helpers.setBalance(addressZero, ethAmt);
		const impersonatedZeroAddress = await ethers.getSigner(addressZero);
		const [owner, user1, user2]: SignerWithAddress[] =
			await ethers.getSigners();

		const MockToken = await ethers.getContractFactory("RockToken");
		const platformToken = await MockToken.deploy();

		const RockNFTMarketplace = await ethers.getContractFactory(
			"RockNFTMarketplace"
		);
		const marketplace = await RockNFTMarketplace.deploy(platformToken);

		// Transfer some tokens to users
		await platformToken.transfer(user1.address, ethers.parseEther("1000"));
		await platformToken.transfer(user2.address, ethers.parseEther("1000"));

		return {
			marketplace,
			platformToken,
			impersonatedZeroAddress,
			owner,
			user1,
			user2,
		};
	}

	describe("createNFT", function () {
		it("Should create an NFT successfully", async function () {
			const { marketplace, user1 } = await loadFixture(deployFixture);

			await expect(
				marketplace
					.connect(user1)
					.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"))
			).to.emit(marketplace, "NFTCreated");
			// .withArgs(user1.address, expect.anything(), 100);

			const allNFTs = await marketplace.allNFTs(0);
			const nftInfo = await marketplace.nftToInfo(allNFTs);

			expect(nftInfo.price).to.equal(ethers.parseEther("1"));
			expect(nftInfo.isCreated).to.be.true;
			expect(nftInfo.owner).to.equal(user1.address);
		});

		it("Should revert if zero address tries to create NFT", async function () {
			const { marketplace, impersonatedZeroAddress } = await loadFixture(
				deployFixture
			);

			await expect(
				marketplace
					.connect(impersonatedZeroAddress)
					.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"))
			).to.be.revertedWithCustomError(marketplace, "AddressZeroDetected");
		});
	});

	describe("mintNFT", function () {
		it("Should mint an NFT successfully", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));

			await expect(marketplace.connect(user2).mintNFT(nftAddress))
				.to.emit(marketplace, "NFTMinted")
				.withArgs(user2.address, nftAddress, 1);
		});

		it("Should revert if max supply reached", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 1, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			await expect(
				marketplace.connect(user2).mintNFT(nftAddress)
			).to.be.revertedWithCustomError(marketplace, "MaxSupplyReached");
		});

		it("Should revert if NFT not created yet", async function () {
			const { marketplace, user2 } = await loadFixture(deployFixture);

			await expect(
				marketplace.connect(user2).mintNFT(ethers.ZeroAddress)
			).to.be.revertedWithCustomError(marketplace, "AddressZeroDetected");
		});

		it("Should revert if allowance too low", async function () {
			const { marketplace, user1, user2 } = await loadFixture(deployFixture);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await expect(
				marketplace.connect(user2).mintNFT(nftAddress)
			).to.be.revertedWithCustomError(marketplace, "AllowanceTooLow");
		});
	});

	describe("listNFT", function () {
		it("Should list an NFT successfully", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await expect(
				marketplace
					.connect(user2)
					.listNFT(nftAddress, 1, ethers.parseEther("2"))
			)
				.to.emit(marketplace, "NFTListed")
				.withArgs(1, nftAddress, 1, user2.address, ethers.parseEther("2"));
		});

		it("Should revert if price is zero", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			await expect(
				marketplace.connect(user2).listNFT(nftAddress, 1, 0)
			).to.be.revertedWithCustomError(marketplace, "InvalidPrice");
		});

		it("Should revert if not owner", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			await expect(
				marketplace
					.connect(user1)
					.listNFT(nftAddress, 1, ethers.parseEther("2"))
			).to.be.revertedWithCustomError(marketplace, "NotOwner");
		});
	});

	describe("buyNFT", function () {
		it("Should buy an NFT successfully", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await marketplace
				.connect(user2)
				.listNFT(nftAddress, 1, ethers.parseEther("2"));

			await platformToken
				.connect(user1)
				.approve(marketplace.target, ethers.parseEther("2"));

			await expect(marketplace.connect(user1).buyNFT(1))
				.to.emit(marketplace, "NFTSold")
				.withArgs(
					1,
					nftAddress,
					1,
					user2.address,
					user1.address,
					ethers.parseEther("2")
				);
		});

		it("Should revert if item not listed", async function () {
			const { marketplace, user1 } = await loadFixture(deployFixture);

			await expect(
				marketplace.connect(user1).buyNFT(1)
			).to.be.revertedWithCustomError(marketplace, "ItemNotListed");
		});

		it("Should revert if allowance too low", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await marketplace
				.connect(user2)
				.listNFT(nftAddress, 1, ethers.parseEther("2"));

			await expect(
				marketplace.connect(user1).buyNFT(1)
			).to.be.revertedWithCustomError(marketplace, "AllowanceTooLow");
		});
	});

	describe("cancelListing", function () {
		it("Should cancel a listing successfully", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);
			console.log({ nftAddress });
			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await marketplace
				.connect(user2)
				.listNFT(nftAddress, 1, ethers.parseEther("2"));

			await expect(marketplace.connect(user2).cancelListing(1))
				.to.emit(marketplace, "ListingCanceled")
				.withArgs(1, nftAddress, 0);
		});

		it("Should revert if not owner", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await marketplace
				.connect(user2)
				.listNFT(nftAddress, 1, ethers.parseEther("2"));

			await expect(
				marketplace.connect(user1).cancelListing(1)
			).to.be.revertedWithCustomError(marketplace, "NotOwner");
		});
	});

	describe("updateListing", function () {
		it("Should update a listing successfully", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await marketplace
				.connect(user2)
				.listNFT(nftAddress, 1, ethers.parseEther("2"));

			await expect(
				marketplace.connect(user2).updateListing(1, ethers.parseEther("3"))
			)
				.to.emit(marketplace, "ListingUpdated")
				.withArgs(1, nftAddress, 1, ethers.parseEther("3"));
		});

		it("Should revert if price is zero", async function () {
			const { marketplace, platformToken, user1, user2 } = await loadFixture(
				deployFixture
			);

			await marketplace
				.connect(user1)
				.createNFT("TestNFT", "TNFT", 100, ethers.parseEther("1"));
			const nftAddress = await marketplace.allNFTs(0);

			await platformToken
				.connect(user2)
				.approve(marketplace.target, ethers.parseEther("1"));
			await marketplace.connect(user2).mintNFT(nftAddress);

			const RockNFT = await ethers.getContractFactory("RockNFT");
			const nftContract = RockNFT.attach(nftAddress);
			await nftContract
				.connect(user2)
				.setApprovalForAll(marketplace.target, true);

			await marketplace
				.connect(user2)
				.listNFT(nftAddress, 1, ethers.parseEther("2"));

			await expect(
				marketplace.connect(user2).updateListing(1, 0)
			).to.be.revertedWithCustomError(marketplace, "InvalidPrice");
		});
	});
});

//   describe("getAllOwnedNFTs", function () {
//     it("Should return all owned NFTs", async function () {
//       const { marketplace, platformToken, user1, user2 } = await loadFixture(deployFixture);

//       await
