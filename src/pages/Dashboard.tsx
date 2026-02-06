import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { formatEther, keccak256, toBytes } from "viem";

import {
  BET_ESCROW_ADDRESS,
  RISK_GAME_ADDRESS,
  TERRITORY_NFT_ADDRESS,
  useArmyBalance,
} from "../hooks/useContract";
import { SVG_TERRITORY_COUNT } from "../data/mapV2";
import territoryNftAbi from "../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json";
import riskGameAbi from "../artifacts/contracts/RiskGame.sol/RiskGame.json";

const LOCAL_BETS_KEY = "shelly.bets";
const TERRITORIES = [
  { id: 0, name: "Northern Highlands", neighbors: [1, 3, 4] },
  { id: 1, name: "Eastern Plains", neighbors: [0, 2, 4] },
  { id: 2, name: "Southern Marshes", neighbors: [1, 4, 5] },
  { id: 3, name: "Western Mountains", neighbors: [0, 4, 6] },
  { id: 4, name: "Central Valley", neighbors: [0, 1, 2, 3, 5, 6, 7] },
  { id: 5, name: "Coastal Shores", neighbors: [2, 4, 7, 8] },
  { id: 6, name: "Frozen Tundra", neighbors: [3, 4, 7, 9] },
  { id: 7, name: "Sunreach", neighbors: [4, 5, 6, 8, 9] },
  { id: 8, name: "Jungle Depths", neighbors: [5, 7, 9] },
  { id: 9, name: "Volcanic Ridge", neighbors: [6, 7, 8] },
];
const MAX_TERRITORY_SCAN = SVG_TERRITORY_COUNT;
const betEscrowAbi = [
  {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "marketKey", type: "bytes32" }],
    outputs: [
      { name: "resolved", type: "bool" },
      { name: "canceled", type: "bool" },
      { name: "outcome", type: "uint8" },
      { name: "totalPool", type: "uint256" },
      { name: "winningPool", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "market", type: "string" }],
    outputs: [],
  },
] as const;

type LocalBet = {
  id: string;
  marketUrl: string;
  marketTitle: string;
  outcomeIndex: number;
  outcomeLabel: string;
  entryPriceCents: number;
  amount: string;
  createdAt: number;
  status?: "open" | "closed";
  closedAt?: number;
  closedPriceCents?: number;
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { balance } = useArmyBalance(address);
  const [bets, setBets] = useState<LocalBet[]>([]);
  const [marketSnapshots, setMarketSnapshots] = useState<Record<string, MarketSnapshot>>({});

  const territoryIds = useMemo(
    () => Array.from({ length: MAX_TERRITORY_SCAN }, (_, index) => index),
    [],
  );
  const { data: existsResults } = useReadContracts({
    allowFailure: true,
    contracts: territoryIds.map((id) => ({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi,
      functionName: "exists",
      args: [BigInt(id)],
    })),
  });

  const mintedIds = useMemo(() => {
    if (!existsResults) return [];
    return territoryIds.filter((_, index) => existsResults[index]?.result === true);
  }, [territoryIds, existsResults]);

  const { data: ownerResults } = useReadContracts({
    allowFailure: true,
    contracts: mintedIds.map((id) => ({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi,
      functionName: "ownerOf",
      args: [BigInt(id)],
    })),
    query: { enabled: mintedIds.length > 0 },
  });
  const { data: armiesResults } = useReadContracts({
    allowFailure: true,
    contracts: mintedIds.map((id) => ({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: "territoryArmies",
      args: [BigInt(id)],
    })),
    query: { enabled: mintedIds.length > 0 },
  });

  const ownedTerritories = useMemo(() => {
    if (!address) return [];
    return mintedIds
      .map((id, index) => {
        const ownerEntry = ownerResults?.[index];
        if (ownerEntry?.status !== "success") return null;
        const owner = ownerEntry.result as `0x${string}`;
        if (owner.toLowerCase() !== address.toLowerCase()) return null;
        const armiesEntry = armiesResults?.[index];
        const armiesRaw =
          armiesEntry?.status === "success" && typeof armiesEntry.result === "bigint"
            ? armiesEntry.result
            : 0n;
        const base = TERRITORIES.find((t) => t.id === id);
        return {
          id,
          name: base?.name ?? `Territory ${id}`,
          neighbors: base?.neighbors ?? [],
          armies: formatEther(armiesRaw),
          owner,
        };
      })
      .filter(Boolean) as Array<{
      id: number;
      name: string;
      neighbors: number[];
      armies: string;
      owner: `0x${string}`;
    }>;
  }, [address, territoryIds, ownerResults, armiesResults]);

  useEffect(() => {
    setBets(loadLocalBets());
  }, []);

  useEffect(() => {
    if (bets.length === 0) return;
    let isMounted = true;
    const fetchSnapshots = async () => {
      const entries = await Promise.all(
        bets.map(async (bet) => {
          const snapshot = await fetchMarketSnapshot(bet.marketUrl, bet.outcomeIndex).catch(
            () => null,
          );
          return [bet.id, snapshot] as const;
        }),
      );
      if (!isMounted) return;
      const next = entries.reduce<Record<string, MarketSnapshot>>((acc, [id, snapshot]) => {
        if (snapshot) acc[id] = snapshot;
        return acc;
      }, {});
      setMarketSnapshots(next);
    };
    fetchSnapshots();
    return () => {
      isMounted = false;
    };
  }, [bets]);

  const removeBet = (id: string) => {
    const next = bets.filter((bet) => bet.id !== id);
    setBets(next);
    saveLocalBets(next);
  };

  const closeBet = async (bet: LocalBet) => {
    if (bet.status === "closed") return;
    const existingSnapshot = marketSnapshots[bet.id];
    let priceCents = existingSnapshot?.priceCents;
    if (priceCents === undefined) {
      const snapshot = await fetchMarketSnapshot(bet.marketUrl, bet.outcomeIndex).catch(
        () => null,
      );
      priceCents = snapshot?.priceCents;
    }
    const next = bets.map((item) =>
      item.id === bet.id
        ? {
            ...item,
            status: "closed",
            closedAt: Date.now(),
            closedPriceCents: priceCents,
          }
        : item,
    );
    setBets(next);
    saveLocalBets(next);
  };

  if (!isConnected) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#d4af37",
          fontFamily: '"Cinzel", serif',
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "42px", letterSpacing: "6px", marginBottom: "12px" }}>
            CONNECT WALLET
          </h1>
          <p style={{ color: "#94a3b8" }}>Please connect MetaMask to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px 48px",
        color: "#e2e8f0",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: "28px" }}>Player Dashboard</h1>

      <div
        style={{
          marginTop: "22px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total Armies"
          value={isConnected ? Number.parseFloat(balance).toFixed(0) : "0"}
          accent="linear-gradient(135deg, #0f2659, #1f4ea2)"
        />
        <StatCard
          label="Active Bets"
          value={bets.length.toString()}
          accent="linear-gradient(135deg, #2a123a, #6a2c90)"
        />
        <StatCard
          label="Territories"
          value={ownedTerritories.length.toString()}
          accent="linear-gradient(135deg, #0f2659, #1f4ea2)"
        />
        <StatCard
          label="Next Claim"
          value="—"
          accent="linear-gradient(135deg, #0f2f1f, #1c6b42)"
        />
      </div>

      <h2 style={{ marginTop: "30px", fontSize: "20px" }}>Your Bets</h2>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "18px",
        }}
      >
        {bets.length === 0 && <div style={{ color: "#94a3b8" }}>No bets yet.</div>}
        {bets.map((bet) => (
          <BetCard
            key={bet.id}
            bet={bet}
            snapshot={marketSnapshots[bet.id]}
            onRemove={() => removeBet(bet.id)}
            onClose={() => closeBet(bet)}
          />
        ))}
      </div>

      <h2 style={{ marginTop: "30px", fontSize: "20px" }}>Your Territories</h2>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "18px",
        }}
      >
        {ownedTerritories.length === 0 && (
          <div style={{ color: "#94a3b8" }}>No territories yet.</div>
        )}
        {ownedTerritories.map((territory) => (
          <div
            key={territory.id}
            style={{
              padding: "18px",
              borderRadius: "14px",
              background: "rgba(10, 18, 40, 0.85)",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>
              NFT #{String(territory.id).padStart(3, "0")}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "6px" }}>
              {territory.name}
            </div>
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#cbd5f5" }}>
              Armies:{" "}
              <strong style={{ color: "#fff" }}>
                {Number.parseFloat(territory.armies).toFixed(0)}
              </strong>
            </div>
            <div style={{ marginTop: "8px", fontSize: "13px", color: "#cbd5f5" }}>
              Owner:{" "}
              <span style={{ color: "#94a3b8" }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div style={{ marginTop: "8px", fontSize: "13px", color: "#cbd5f5" }}>
              Borders: <span style={{ color: "#94a3b8" }}>{territory.neighbors.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "14px",
        background: accent,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#cbd5f5" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 700, marginTop: "6px" }}>{value}</div>
    </div>
  );
}

function BetCard({
  bet,
  snapshot,
  onRemove,
  onClose,
}: {
  bet: LocalBet;
  snapshot?: MarketSnapshot;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { writeContract, isPending } = useWriteContract();
  const marketKey = useMemo(() => keccak256(toBytes(bet.marketUrl)), [bet.marketUrl]);
  const { data: marketState } = useReadContract({
    address: BET_ESCROW_ADDRESS,
    abi: betEscrowAbi,
    functionName: "markets",
    args: [marketKey],
  });

  const resolved = Array.isArray(marketState) ? marketState[0] : false;
  const canceled = Array.isArray(marketState) ? marketState[1] : false;
  const resolvedLabel = canceled ? "Canceled" : resolved ? "Resolved" : "Open";

  const entryPrice = bet.entryPriceCents;
  const closed = bet.status === "closed";
  const currentPrice = closed
    ? bet.closedPriceCents ?? null
    : snapshot?.priceCents ?? null;
  const pnlPercent =
    currentPrice !== null && entryPrice > 0
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : null;
  const amountValue = Number.parseFloat(bet.amount || "0");
  const pnlAmount =
    pnlPercent !== null ? (amountValue * pnlPercent) / 100 : null;

  const claim = () => {
    writeContract({
      address: BET_ESCROW_ADDRESS,
      abi: betEscrowAbi,
      functionName: "claim",
      args: [bet.marketUrl],
    });
  };

  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "14px",
        background: "rgba(10, 18, 40, 0.85)",
        border: "1px solid rgba(59, 130, 246, 0.35)",
        boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#94a3b8" }}>{resolvedLabel}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "6px" }}>
        {bet.marketTitle}
      </div>
      <div style={{ marginTop: "8px", fontSize: "13px", color: "#cbd5f5" }}>
        Outcome: <strong style={{ color: "#fff" }}>{bet.outcomeLabel}</strong>
      </div>
      <div style={{ marginTop: "6px", fontSize: "13px", color: "#cbd5f5" }}>
        Entry: <span style={{ color: "#94a3b8" }}>{bet.entryPriceCents}¢</span>
      </div>
      <div style={{ marginTop: "6px", fontSize: "13px", color: "#cbd5f5" }}>
        {closed ? "Closed at:" : "Current:"}{" "}
        <span style={{ color: "#94a3b8" }}>
          {currentPrice !== null ? `${currentPrice}¢` : "—"}
        </span>
      </div>
      <div style={{ marginTop: "6px", fontSize: "13px", color: "#cbd5f5" }}>
        Stake: <span style={{ color: "#94a3b8" }}>{bet.amount} ARMY</span>
      </div>
      <div style={{ marginTop: "6px", fontSize: "13px", color: "#cbd5f5" }}>
        Implied PnL:{" "}
        <span style={{ color: pnlAmount && pnlAmount >= 0 ? "#22c55e" : "#f87171" }}>
          {pnlAmount !== null ? `${pnlAmount >= 0 ? "+" : ""}${pnlAmount.toFixed(2)} ARMY` : "—"}
        </span>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button
          type="button"
          onClick={claim}
          disabled={isPending || (!resolved && !canceled)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(34, 197, 94, 0.5)",
            background: "rgba(20, 83, 45, 0.7)",
            color: "#bbf7d0",
            cursor: resolved || canceled ? "pointer" : "not-allowed",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Claiming..." : "Claim"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={closed}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(168, 85, 247, 0.6)",
            background: "rgba(88, 28, 135, 0.7)",
            color: "#e9d5ff",
            cursor: closed ? "not-allowed" : "pointer",
            opacity: closed ? 0.6 : 1,
          }}
        >
          {closed ? "Closed" : "Close"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(239, 68, 68, 0.5)",
            background: "rgba(127, 29, 29, 0.7)",
            color: "#fecaca",
            cursor: "pointer",
          }}
        >
          Hide
        </button>
      </div>
    </div>
  );
}

type MarketSnapshot = {
  priceCents: number;
};

function loadLocalBets(): LocalBet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_BETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((bet) => ({
      ...bet,
      status: bet.status ?? "open",
    }));
  } catch {
    return [];
  }
}

function saveLocalBets(bets: LocalBet[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_BETS_KEY, JSON.stringify(bets));
}

function parseMarketUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split("/").filter(Boolean);
    const eventIndex = parts.indexOf("event");
    if (eventIndex >= 0 && parts.length >= eventIndex + 3) {
      return { event: parts[eventIndex + 1], market: parts[eventIndex + 2] };
    }
    if (eventIndex >= 0 && parts.length >= eventIndex + 2) {
      return { event: parts[eventIndex + 1] };
    }
    const marketIndex = parts.indexOf("market");
    if (marketIndex >= 0 && parts.length >= marketIndex + 2) {
      return { market: parts[marketIndex + 1] };
    }
    if (parts.length >= 2) {
      return { event: parts[parts.length - 2], market: parts[parts.length - 1] };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchMarketSnapshot(marketUrl: string, outcomeIndex: number) {
  const parsed = parseMarketUrl(marketUrl);
  if (!parsed?.market) return null;
  const query = new URLSearchParams({ slug: parsed.market });
  if (parsed.event) query.set("event_slug", parsed.event);
  const response = await fetch(`/api/polymarket/markets?${query.toString()}`);
  if (!response.ok) throw new Error("Market fetch failed");
  const data = await response.json();
  const marketData = Array.isArray(data) ? data[0] : data;
  if (!marketData) return null;
  const outcomes = parseOutcomeList(marketData.outcomes);
  const rawOutcomePrices = marketData.outcomePrices ?? marketData.outcome_prices ?? [];
  const outcomePrices = parseOutcomePrices(rawOutcomePrices, outcomes);
  const rawPrice = outcomePrices[outcomeIndex];
  const probability = normalizeProbability(rawPrice);
  if (probability === null) return null;
  return { priceCents: Math.round(probability * 100) };
}

function parseOutcomeList(outcomes?: string[] | string) {
  if (Array.isArray(outcomes)) return outcomes;
  if (typeof outcomes !== "string") return [];
  const trimmed = outcomes.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(",").map((value) => value.trim());
}

function parseOutcomePrices(
  rawOutcomePrices: Array<string | number> | Record<string, string | number> | string,
  outcomes: string[],
) {
  if (Array.isArray(rawOutcomePrices)) return rawOutcomePrices;
  if (typeof rawOutcomePrices === "string") {
    const trimmed = rawOutcomePrices.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return trimmed.split(",").map((value) => value.trim());
  }
  if (typeof rawOutcomePrices === "object" && rawOutcomePrices !== null) {
    return outcomes.map(
      (outcome) => rawOutcomePrices[outcome] ?? rawOutcomePrices[outcome.toLowerCase()],
    );
  }
  return [];
}

function normalizeProbability(value: string | number | undefined) {
  if (value === undefined || value === null) return null;
  const raw = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(raw)) return null;
  if (raw > 1.01 && raw <= 100) return raw / 100;
  if (raw < 0) return 0;
  return raw;
}
