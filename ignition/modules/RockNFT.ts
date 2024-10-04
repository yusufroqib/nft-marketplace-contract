import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const initialOwner = "0x6c8fcDeb117a1d40Cd2c2eB6ECDa58793FD636b1";
const RockNFTModule = buildModule("RockNFTModule", (m) => {
	const rockNFT = m.contract("RockNFT", [initialOwner, "TestNFT", "TNFT", 100]);

	return { rockNFT };
});

export default RockNFTModule;

// Deployed RockNFT: 0x81Fe5D271440Ad653253317c3BCFCA1Dd39E98Bc
