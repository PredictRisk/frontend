import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { keccak256, toBytes } from "viem";

import { BET_ESCROW_ADDRESS, useArmyBalance } from "../hooks/useContract";

const LOCAL_BETS_KEY = "shelly.bets";
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
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { balance } = useArmyBalance(address);
  const [bets, setBets] = useState<LocalBet[]>([]);
  const [marketSnapshots, setMarketSnapshots] = useState<Record<string, MarketSnapshot>>({});

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
          />
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
}: {
  bet: LocalBet;
  snapshot?: MarketSnapshot;
  onRemove: () => void;
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
  const currentPrice = snapshot?.priceCents ?? null;
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
        Current:{" "}
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
    return Array.isArray(parsed) ? (parsed as LocalBet[]) : [];
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
