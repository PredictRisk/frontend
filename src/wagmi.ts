import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

const localhost1337 = defineChain({
  id: 1337,
  name: "Localhost",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Localhost",
      url: "http://127.0.0.1:8545",
    },
  },
  testnet: true,
});

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
    : localhost1337;

export const config = createConfig({
  chains: [activeChain],
  connectors: [injected(), miniAppConnector()],
  transports: {
    [activeChain.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
