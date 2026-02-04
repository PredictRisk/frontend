import { useMemo, useState } from "react";
import {
  polymarketCategories,
  polymarketMarkets,
  polymarketStats,
  type PolymarketCategory,
} from "../mock/polymarket";

const panelBorder = "1px solid rgba(255, 255, 255, 0.08)";
const panelShadow = "0 10px 30px rgba(0, 0, 0, 0.35)";

function Polymarket() {
  const [activeCategory, setActiveCategory] = useState<PolymarketCategory>("All Markets");

  const markets = useMemo(() => {
    if (activeCategory === "All Markets") return polymarketMarkets;
    return polymarketMarkets.filter((market) => market.category === activeCategory);
  }, [activeCategory]);

  return (
    <div
      style={{
        padding: "36px 40px 60px",
        color: "#e6e6f0",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", letterSpacing: "0.5px" }}>
          Polymarket Betting
        </h1>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginTop: "22px",
        }}
      >
        <StatCard
          label="Available Armies"
          value={polymarketStats.availableArmies}
          accent="linear-gradient(135deg, #0f2659, #1f4ea2)"
        />
        <StatCard
          label="Active Bets"
          value={polymarketStats.activeBets}
          accent="linear-gradient(135deg, #2a123a, #6a2c90)"
        />
        <StatCard
          label="Bets Won"
          value={polymarketStats.betsWon}
          accent="linear-gradient(135deg, #0f2f1f, #1c6b42)"
        />
        <StatCard
          label="Total Staked"
          value={polymarketStats.totalStaked}
          accent="linear-gradient(135deg, #3b2a12, #9b6b22)"
        />
      </div>

      <div
        style={{
          marginTop: "26px",
          padding: "22px 26px",
          borderRadius: "16px",
          background: "linear-gradient(130deg, rgba(90, 51, 140, 0.95), rgba(16, 34, 76, 0.95))",
          border: panelBorder,
          boxShadow: panelShadow,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          Bet Your Armies on Polymarket
        </h2>
        <p style={{ marginTop: "8px", color: "#b6b6d4", lineHeight: 1.5 }}>
          Stake your armies on real-world events and crypto markets. Win big by
          predicting correctly. Your armies are on the line, choose wisely.
        </p>
      </div>

      <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ color: "#b6b6d4", fontSize: "14px" }}>Filter:</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {polymarketCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: panelBorder,
                background:
                  activeCategory === category
                    ? "linear-gradient(135deg, #7a2ff2, #a856ff)"
                    : "rgba(255, 255, 255, 0.06)",
                color: activeCategory === category ? "#fff" : "#c2c2d8",
                cursor: "pointer",
                fontFamily: '"Cinzel", serif',
                fontSize: "13px",
                letterSpacing: "0.4px",
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "28px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "22px" }}>Available Markets</h3>
        <span style={{ color: "#9aa0b8", fontSize: "13px" }}>
          {markets.length} markets
        </span>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "18px",
        }}
      >
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "18px 20px",
        background: accent,
        border: panelBorder,
        boxShadow: panelShadow,
      }}
    >
      <div style={{ color: "#c7c7df", fontSize: "13px", marginBottom: "10px" }}>
        {label}
      </div>
      <div style={{ fontSize: "26px", fontWeight: 700 }}>
        {value.toLocaleString("en-US")}
      </div>
    </div>
  );
}

function MarketCard({
  market,
}: {
  market: typeof polymarketMarkets[number];
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "16px 18px",
        background: "rgba(9, 15, 30, 0.85)",
        border: panelBorder,
        boxShadow: panelShadow,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "12px",
            padding: "4px 8px",
            borderRadius: "8px",
            background: "rgba(60, 120, 255, 0.2)",
            color: "#8ab2ff",
            border: "1px solid rgba(60, 120, 255, 0.35)",
          }}
        >
          {market.category.toUpperCase()}
        </span>
        <span style={{ fontSize: "12px", color: "#9aa0b8" }}>{market.timeLeft}</span>
      </div>

      <h4 style={{ marginTop: "14px", marginBottom: "10px", fontSize: "16px" }}>
        {market.title}
      </h4>
      <p style={{ margin: 0, fontSize: "13px", color: "#9aa0b8", lineHeight: 1.4 }}>
        {market.description}
      </p>

      <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
        <OutcomeRow label="YES" value={market.yesPercent} color="#2ecc71" />
        <OutcomeRow label="NO" value={market.noPercent} color="#e74c3c" />
      </div>

      <div style={{ marginTop: "12px", fontSize: "12px", color: "#9aa0b8" }}>
        Volume: {market.volumeArmies.toLocaleString("en-US")} armies
      </div>
    </div>
  );
}

function OutcomeRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
        <span style={{ color }}>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div
        style={{
          marginTop: "6px",
          height: "6px",
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export default Polymarket;
