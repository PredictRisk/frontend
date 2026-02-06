import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";

import riskGameAbi from "../artifacts/contracts/RiskGame.sol/RiskGame.json";
import territoryNftAbi from "../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json";
import erc20Abi from "../artifacts/contracts/ArmyToken.sol/ArmyToken.json";
import { SVG_TERRITORY_COUNT } from "../data/mapV2";
import { ARMY_TOKEN_ADDRESS, RISK_GAME_ADDRESS, TERRITORY_NFT_ADDRESS } from "../hooks/useContract";

const MAX_TERRITORY_SCAN = SVG_TERRITORY_COUNT;
const TOKEN_UNIT = 10n ** 18n;

type PlayerStat = {
  address: string;
  territories: number;
  armies: bigint;
  wallet: bigint;
  score: bigint;
};

export default function Stats() {
  const { address } = useAccount();

  const { data: totalTerritoriesData } = useReadContract({
    address: RISK_GAME_ADDRESS,
    abi: riskGameAbi.abi,
    functionName: "totalTerritories",
  });

  const totalTerritories =
    SVG_TERRITORY_COUNT ||
    (typeof totalTerritoriesData === "bigint" ? Number(totalTerritoriesData) : 0);

  const scanCount = Math.max(totalTerritories, MAX_TERRITORY_SCAN);
  const territoryIds = useMemo(
    () => Array.from({ length: scanCount }, (_, index) => index),
    [scanCount],
  );

  const { data: existsResults } = useReadContracts({
    allowFailure: true,
    contracts: territoryIds.map((id) => ({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi,
      functionName: "exists",
      args: [BigInt(id)],
    })),
    query: { enabled: scanCount > 0 },
  });

  const mintedIds = useMemo(() => {
    if (!existsResults) return [];
    return territoryIds.filter((_, index) => existsResults[index]?.result === true);
  }, [territoryIds, existsResults]);

  const { data: armiesData } = useReadContracts({
    allowFailure: true,
    contracts: mintedIds.map((id) => ({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: "territoryArmies",
      args: [BigInt(id)],
    })),
    query: { enabled: mintedIds.length > 0 },
  });

  const { data: ownerData } = useReadContracts({
    allowFailure: true,
    contracts: mintedIds.map((id) => ({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi,
      functionName: "ownerOf",
      args: [BigInt(id)],
    })),
    query: { enabled: mintedIds.length > 0 },
  });

  const { players: basePlayers, claimedCount, totalArmies } = useMemo(() => {
    const stats = new Map<string, PlayerStat>();
    let claimed = 0;
    let total = 0n;

    mintedIds.forEach((id, index) => {
      const armiesEntry = armiesData?.[index];
      const armies =
        armiesEntry?.status === "success" && typeof armiesEntry.result === "bigint"
          ? armiesEntry.result
          : 0n;

      total += armies;

      const ownerEntry = ownerData?.[index];
      if (ownerEntry?.status === "success" && typeof ownerEntry.result === "string") {
        const owner = ownerEntry.result.toLowerCase();
        claimed += 1;
        const current = stats.get(owner) ?? {
          address: owner,
          territories: 0,
          armies: 0n,
          wallet: 0n,
          score: 0n,
        };
        stats.set(owner, {
          address: owner,
          territories: current.territories + 1,
          armies: current.armies + armies,
          wallet: current.wallet,
          score: current.score,
        });
      }
    });

    return { players: Array.from(stats.values()), claimedCount: claimed, totalArmies: total };
  }, [mintedIds, armiesData, ownerData]);

  const playerAddresses = useMemo(() => basePlayers.map((player) => player.address), [basePlayers]);
  const { data: balancesData } = useReadContracts({
    allowFailure: true,
    contracts: playerAddresses.map((playerAddress) => ({
      address: ARMY_TOKEN_ADDRESS,
      abi: erc20Abi.abi,
      functionName: "balanceOf",
      args: [playerAddress as `0x${string}`],
    })),
    query: { enabled: playerAddresses.length > 0 },
  });

  const players = useMemo(() => {
    const withScores = basePlayers.map((player, index) => {
      const balanceEntry = balancesData?.[index];
      const wallet =
        balanceEntry?.status === "success" && typeof balanceEntry.result === "bigint"
          ? balanceEntry.result
          : 0n;
      const score =
        wallet + player.armies + BigInt(player.territories) * 100n * TOKEN_UNIT;
      return { ...player, wallet, score };
    });

    return withScores.sort((a, b) => {
      if (b.score > a.score) return 1;
      if (b.score < a.score) return -1;
      if (b.territories !== a.territories) return b.territories - a.territories;
      if (b.armies > a.armies) return 1;
      if (b.armies < a.armies) return -1;
      return 0;
    });
  }, [basePlayers, balancesData]);

  const activePlayers = players.length;
  const unclaimedCount = Math.max(0, totalTerritories - claimedCount);
  const formattedTotalArmies = Number.parseFloat(formatEther(totalArmies)).toFixed(0);

  const yourRank = useMemo(() => {
    if (!address) return null;
    const index = players.findIndex((player) => player.address === address.toLowerCase());
    return index >= 0 ? index + 1 : null;
  }, [players, address]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px 48px",
        color: "#e2e8f0",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: "28px" }}>Statistics & Leaderboard</h1>

      <div
        style={{
          marginTop: "22px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total Territories"
          value={totalTerritories.toString()}
          subtitle={`${claimedCount} claimed, ${unclaimedCount} unclaimed`}
          accent="linear-gradient(135deg, #0f2659, #1f4ea2)"
        />
        <StatCard
          label="Active Players"
          value={activePlayers.toString()}
          accent="linear-gradient(135deg, #2a123a, #6a2c90)"
        />
        <StatCard
          label="Total Armies"
          value={formattedTotalArmies}
          accent="linear-gradient(135deg, #0f2f1f, #1c6b42)"
        />
        <StatCard
          label="Your Rank"
          value={yourRank ? `#${yourRank}` : "—"}
          accent="linear-gradient(135deg, #3b2a12, #9b6b22)"
        />
      </div>

      <div
        style={{
          marginTop: "22px",
          padding: "18px 22px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10, 18, 40, 0.85)",
          boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: 700 }}>🏆 Leaderboard</div>

        <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
          {players.slice(0, 10).map((player, index) => {
            const isYou = address && player.address === address.toLowerCase();
            return (
              <div
                key={player.address}
                style={{
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: isYou
                    ? "1px solid rgba(168, 85, 247, 0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: isYou
                    ? "linear-gradient(120deg, rgba(88, 28, 135, 0.8), rgba(30, 58, 138, 0.75))"
                    : "rgba(12, 20, 40, 0.7)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background:
                        index === 0
                          ? "#fbbf24"
                          : index === 1
                            ? "#cbd5f5"
                            : index === 2
                              ? "#fb7185"
                              : "rgba(255,255,255,0.12)",
                      color: "#0f172a",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>
                      Player {index + 1} {isYou && <span style={{ marginLeft: "8px", color: "#c4b5fd" }}>You</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {player.address.slice(0, 6)}...{player.address.slice(-4)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "22px", textAlign: "right" }}>
                  <StatMini label="Score" value={Number.parseFloat(formatEther(player.score)).toFixed(0)} />
                  <StatMini label="Wallet" value={Number.parseFloat(formatEther(player.wallet)).toFixed(0)} />
                  <StatMini label="Armies" value={Number.parseFloat(formatEther(player.armies)).toFixed(0)} />
                  <StatMini label="Territories" value={player.territories.toString()} />
                </div>
              </div>
            );
          })}
          {players.length === 0 && <div style={{ color: "#94a3b8" }}>No players yet.</div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent: string;
}) {
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
      {subtitle && <div style={{ marginTop: "6px", fontSize: "12px", color: "#cbd5f5" }}>{subtitle}</div>}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "12px", color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
