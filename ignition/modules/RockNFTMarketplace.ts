import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const tokenAddress = "0x93532eB8DA4B43BC9E88b1f11eDbc295607ab693";
const LotteryModule = buildModule("LotteryModule", (m) => {
	const lottery = m.contract("Lottery", []);

	return { lottery };
});

export default LotteryModule;

// Deployed Lottery: 0x81Fe5D271440Ad653253317c3BCFCA1Dd39E98Bc
