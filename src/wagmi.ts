import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { http, createConfig } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Base Sepolia",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
});

const activeChain =
  (import.meta.env.VITE_NETWORK || "localhost").toLowerCase() === "basesepolia"
    ? baseSepolia
    : hardhat;

export const config = createConfig({
  chains: [hardhat],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}