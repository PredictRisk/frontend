import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";

import worldSvg from "../assets/world.svg?raw";
import worldBordersCsv from "../assets/world-borders.csv?raw";
import territoryNftAbi from "../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json";
import riskGameAbi from "../artifacts/contracts/RiskGame.sol/RiskGame.json";
import erc20Abi from "../artifacts/contracts/ArmyToken.sol/ArmyToken.json";
import { SVG_TERRITORY_COUNT } from "../data/mapV2";
import { ARMY_TOKEN_ADDRESS, RISK_GAME_ADDRESS, TERRITORY_NFT_ADDRESS } from "../hooks/useContract";

type CsvParseResult = {
  countries: { code: string; name: string; neighbors: string[] }[];
  neighborsByCode: Map<string, Set<string>>;
  svgCodes: Set<string>;
};

function extractSvgCodes(svg: string) {
  const codes = new Set<string>();
  const regex = /id="([A-Z]{2})"/g;
  let match;
  while ((match = regex.exec(svg)) !== null) {
    codes.add(match[1]);
  }
  return codes;
}

function parseWorldBordersCsv(csv: string, allowedCodes: Set<string>): CsvParseResult {
  const lines = csv.trim().split(/\r?\n/);
  const neighborsByCode = new Map<string, Set<string>>();
  const namesByCode = new Map<string, string>();

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/);
    if (!match) continue;
    const [, code, name, borderCode, borderName] = match;
    if (code && allowedCodes.has(code)) namesByCode.set(code, name);
    if (borderCode && allowedCodes.has(borderCode)) namesByCode.set(borderCode, borderName);
    if (!borderCode) continue;
    if (!allowedCodes.has(code) || !allowedCodes.has(borderCode)) continue;

    if (!neighborsByCode.has(code)) neighborsByCode.set(code, new Set<string>());
    if (!neighborsByCode.has(borderCode)) neighborsByCode.set(borderCode, new Set<string>());
    neighborsByCode.get(code)?.add(borderCode);
    neighborsByCode.get(borderCode)?.add(code);
  }

  const countries = Array.from(namesByCode.entries())
    .map(([code, name]) => ({
      code,
      name,
      neighbors: Array.from(neighborsByCode.get(code) ?? new Set<string>()),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { countries, neighborsByCode, svgCodes: allowedCodes };
}

export default function PlayerProfile() {
  const params = useParams();
  const profileAddress = params.address?.toLowerCase() ?? "";
  const [bets, setBets] = useState<LocalBet[]>([]);

  const { countries, neighborsByCode } = useMemo(
    () => parseWorldBordersCsv(worldBordersCsv, extractSvgCodes(worldSvg)),
    [],
  );

  const territoryIds = useMemo(
    () => Array.from({ length: SVG_TERRITORY_COUNT }, (_, index) => index),
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

  const { data: walletBalanceRaw } = useReadContract({
    address: ARMY_TOKEN_ADDRESS,
    abi: erc20Abi.abi,
    functionName: "balanceOf",
    args: profileAddress ? [profileAddress as `0x${string}`] : undefined,
    query: { enabled: !!profileAddress },
  });

  const territories = useMemo(() => {
    if (!profileAddress) return [];
    return mintedIds
      .map((id, index) => {
        const ownerEntry = ownerResults?.[index];
        if (ownerEntry?.status !== "success") return null;
        const owner = (ownerEntry.result as string).toLowerCase();
        if (owner !== profileAddress) return null;
        const armiesEntry = armiesResults?.[index];
        const armiesRaw =
          armiesEntry?.status === "success" && typeof armiesEntry.result === "bigint"
            ? armiesEntry.result
            : 0n;
        const base = countries[id];
        const neighborCount = base ? neighborsByCode.get(base.code)?.size ?? 0 : 0;
        return {
          id,
          name: base?.name ?? `Territory ${id}`,
          armies: formatEther(armiesRaw),
          neighbors: neighborCount,
        };
      })
      .filter(Boolean) as Array<{ id: number; name: string; armies: string; neighbors: number }>;
  }, [profileAddress, mintedIds, ownerResults, armiesResults, countries, neighborsByCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBets(loadLocalBets());
  }, []);

  const playerBets = useMemo(
    () => bets.filter((bet) => bet.player?.toLowerCase() === profileAddress),
    [bets, profileAddress],
  );
  const activeBets = playerBets.filter((bet) => bet.status !== "closed");
  const pastBets = playerBets.filter((bet) => bet.status === "closed");

  const totalTerritories = territories.length;
  const totalArmiesInTerritories = territories.reduce(
    (sum, territory) => sum + Number.parseFloat(territory.armies || "0"),
    0,
  );
  const walletBalance = typeof walletBalanceRaw === "bigint" ? walletBalanceRaw : 0n;
  const totalArmies = totalArmiesInTerritories + Number.parseFloat(formatEther(walletBalance));

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px 48px",
        color: "#e2e8f0",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: "28px" }}>Player Profile</h1>
      <div style={{ marginTop: "8px", color: "#94a3b8", fontSize: "13px" }}>
        {profileAddress}
      </div>

      <div
        style={{
          marginTop: "22px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard label="Total Armies" value={totalArmies.toFixed(0)} />
        <StatCard label="Territories" value={totalTerritories.toString()} />
        <StatCard label="Active Bets" value={activeBets.length.toString()} />
        <StatCard label="Past Bets" value={pastBets.length.toString()} />
      </div>

      <h2 style={{ marginTop: "26px", fontSize: "20px" }}>Territories</h2>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "18px",
        }}
      >
        {territories.length === 0 && (
          <div style={{ color: "#94a3b8" }}>No territories for this player.</div>
        )}
        {territories.map((territory) => (
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
            <div style={{ fontSize: "18px", fontWeight: 700 }}>{territory.name}</div>
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#cbd5f5" }}>
              Armies:{" "}
              <strong style={{ color: "#fff" }}>
                {Number.parseFloat(territory.armies).toFixed(0)}
              </strong>
            </div>
            <div style={{ marginTop: "8px", fontSize: "13px", color: "#cbd5f5" }}>
              Borders: <span style={{ color: "#94a3b8" }}>{territory.neighbors}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: "26px", fontSize: "20px" }}>Active Bets</h2>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        {activeBets.length === 0 && (
          <div style={{ color: "#94a3b8" }}>No active bets.</div>
        )}
        {activeBets.map((bet) => (
          <BetCard key={bet.id} bet={bet} />
        ))}
      </div>

      <h2 style={{ marginTop: "26px", fontSize: "20px" }}>Past Bets</h2>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        {pastBets.length === 0 && <div style={{ color: "#94a3b8" }}>No past bets.</div>}
        {pastBets.map((bet) => (
          <BetCard key={bet.id} bet={bet} />
        ))}
      </div>
    </div>
  );
}

type LocalBet = {
  id: string;
  player?: `0x${string}`;
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

function loadLocalBets(): LocalBet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("shelly.bets");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalBet[];
  } catch {
    return [];
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "14px",
        background: "rgba(12, 20, 40, 0.7)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#cbd5f5" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 700, marginTop: "6px" }}>{value}</div>
    </div>
  );
}

function BetCard({ bet }: { bet: LocalBet }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(12, 20, 40, 0.7)",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700 }}>{bet.marketTitle}</div>
      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>
        Outcome: {bet.outcomeLabel}
      </div>
      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
        Amount: {bet.amount} ARMY
      </div>
      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
        Status: {bet.status === "closed" ? "Closed" : "Open"}
      </div>
    </div>
  );
}
