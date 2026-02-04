export type PolymarketCategory =
  | "All Markets"
  | "Crypto"
  | "Politics"
  | "Sports"
  | "Entertainment"
  | "Other";

export interface PolymarketStats {
  availableArmies: number;
  activeBets: number;
  betsWon: number;
  totalStaked: number;
}

export interface PolymarketMarket {
  id: string;
  category: Exclude<PolymarketCategory, "All Markets">;
  title: string;
  description: string;
  timeLeft: string;
  yesPercent: number;
  noPercent: number;
  volumeArmies: number;
}

export const polymarketStats: PolymarketStats = {
  availableArmies: 150,
  activeBets: 0,
  betsWon: 0,
  totalStaked: 0,
};

export const polymarketCategories: PolymarketCategory[] = [
  "All Markets",
  "Crypto",
  "Politics",
  "Sports",
  "Entertainment",
  "Other",
];

export const polymarketMarkets: PolymarketMarket[] = [
  {
    id: "btc-150k-2026",
    category: "Crypto",
    title: "Will Bitcoin reach $150,000 by end of 2026?",
    description:
      "Market resolves YES if Bitcoin (BTC) trades at or above $150,000 on any major exchange.",
    timeLeft: "331d left",
    yesPercent: 67,
    noPercent: 33,
    volumeArmies: 15420,
  },
  {
    id: "eth-pos-q3-2026",
    category: "Crypto",
    title: "Will Ethereum complete the full merge to PoS by Q3 2026?",
    description:
      "Resolves YES if Ethereum successfully completes all planned network upgrades by Q3 2026.",
    timeLeft: "239d left",
    yesPercent: 82,
    noPercent: 18,
    volumeArmies: 9475,
  },
  {
    id: "nft-top10-2026",
    category: "Crypto",
    title: "Will a new NFT project reach top 10 by market cap this year?",
    description:
      "Market resolves YES if any NFT project launched after Jan 1, 2026 reaches top 10 by market cap.",
    timeLeft: "331d left",
    yesPercent: 45,
    noPercent: 55,
    volumeArmies: 6020,
  },
  {
    id: "election-approval-60",
    category: "Politics",
    title: "Will the approval rating exceed 60% this quarter?",
    description:
      "Resolves YES if the official polling average reaches 60% or higher at any point in the quarter.",
    timeLeft: "71d left",
    yesPercent: 41,
    noPercent: 59,
    volumeArmies: 3210,
  },
  {
    id: "worldcup-upset",
    category: "Sports",
    title: "Will a non-top-10 team win the 2026 World Cup?",
    description:
      "Resolves YES if the champion is ranked outside the top 10 in the official FIFA rankings.",
    timeLeft: "421d left",
    yesPercent: 28,
    noPercent: 72,
    volumeArmies: 8350,
  },
  {
    id: "boxoffice-1b",
    category: "Entertainment",
    title: "Will any 2026 release cross $1B box office?",
    description:
      "Resolves YES if a 2026 global theatrical release grosses $1B+ before Dec 31, 2026.",
    timeLeft: "190d left",
    yesPercent: 64,
    noPercent: 36,
    volumeArmies: 4125,
  },
  {
    id: "ai-token-top5",
    category: "Crypto",
    title: "Will an AI token enter the top 5 by market cap this year?",
    description:
      "Resolves YES if any AI-related token enters the top 5 by market cap in 2026.",
    timeLeft: "301d left",
    yesPercent: 52,
    noPercent: 48,
    volumeArmies: 5580,
  },
  {
    id: "esports-prize-50m",
    category: "Sports",
    title: "Will an esports event exceed $50M in total prize pool?",
    description:
      "Resolves YES if any single esports tournament announces a total prize pool above $50M.",
    timeLeft: "118d left",
    yesPercent: 35,
    noPercent: 65,
    volumeArmies: 2310,
  },
  {
    id: "streaming-subs-500m",
    category: "Entertainment",
    title: "Will a streaming service surpass 500M subscribers?",
    description:
      "Resolves YES if any streaming platform reports 500M+ paying subscribers by year end.",
    timeLeft: "272d left",
    yesPercent: 22,
    noPercent: 78,
    volumeArmies: 1890,
  },
  {
    id: "other-space-launch",
    category: "Other",
    title: "Will a private company land on the Moon in 2026?",
    description:
      "Resolves YES if a privately funded mission achieves a successful lunar landing in 2026.",
    timeLeft: "334d left",
    yesPercent: 49,
    noPercent: 51,
    volumeArmies: 3775,
  },
];
