import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { http, createConfig } from "wagmi";
import { hardhat } from "wagmi/chains";

export const config = createConfig({
  chains: [hardhat],
  connectors: [miniAppConnector()],
  transports: {
    [hardhat.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
