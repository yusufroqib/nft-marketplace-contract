import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
	solidity: "0.8.24",
	networks: {
		// for testnet
		"lisk-sepolia": {
			url: vars.get("LISK_RPC_URL"),
			accounts: [vars.get("ACCOUNT_PRIVATE_KEY"), vars.get("SECOND_PRIVATE_KEY"), vars.get("THIRD_PRIVATE_KEY")  ],
			gasPrice: 1000000000,
		},
		"arbitrum-sepolia": {
			url: vars.get("ARBITRUM_SEPOLIA_RPC_URL"), // Update this with the correct RPC URL for Arbitrum Sepolia
			accounts: [vars.get("ACCOUNT_PRIVATE_KEY")],
			gasPrice: 1000000000,
		},
	},
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report-matic.txt",
    noColors: true,
    coinmarketcap: vars.get("COINMARKETCAP_API_KEY"),
    token: "MATIC"
  },
	etherscan: {
		// Use "123" as a placeholder, because Blockscout doesn't need a real API key, and Hardhat will complain if this property isn't set.
		apiKey: {
			"lisk-sepolia": "123",
			"arbitrum-sepolia": vars.get("ARBISCAN_API_KEY") as string,
		},
		customChains: [
			{
				network: "lisk-sepolia",
				chainId: 4202,
				urls: {
					apiURL: "https://sepolia-blockscout.lisk.com/api",
					browserURL: "https://sepolia-blockscout.lisk.com/",
				},
			},
			{
				network: "arbitrum-sepolia",
				chainId: 421614, // Chain ID for Arbitrum Sepolia
				urls: {
					apiURL: "https://api-sepolia.arbiscan.io/api",
					browserURL: "https://sepolia.arbiscan.io/",
				},
			},
		],
	},
	sourcify: {
		enabled: false,
	},
};

export default config;
