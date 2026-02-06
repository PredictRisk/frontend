import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";

import riskGameAbi from "../artifacts/contracts/RiskGame.sol/RiskGame.json";
import territoryNftAbi from "../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json";
import armyTokenAbi from "../artifacts/contracts/ArmyToken.sol/ArmyToken.json";
import betEscrowAbi from "../artifacts/contracts/BetEscrow.sol/BetEscrow.json";
import {
  ARMY_TOKEN_ADDRESS,
  BET_ESCROW_ADDRESS,
  RISK_GAME_ADDRESS,
  TERRITORY_NFT_ADDRESS,
} from "../hooks/useContract";

export default function Admin() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const [mintRecipient, setMintRecipient] = useState("");
  const [mintTokenId, setMintTokenId] = useState("");
  const [mintUri, setMintUri] = useState("");

  const [gameContract, setGameContract] = useState("");
  const [nftGameContract, setNftGameContract] = useState("");

  const [borderTerritoryId, setBorderTerritoryId] = useState("");
  const [borderNeighbors, setBorderNeighbors] = useState("");

  const [spawnIds, setSpawnIds] = useState("");
  const [spawnEnabled, setSpawnEnabled] = useState(true);

  const [grantPlayer, setGrantPlayer] = useState("");
  const [grantTerritoryId, setGrantTerritoryId] = useState("");

  const [spawnTerritoryId, setSpawnTerritoryId] = useState("");

  const [betSigner, setBetSigner] = useState("");
  const [resolveMarket, setResolveMarket] = useState("");
  const [resolveOutcome, setResolveOutcome] = useState("");
  const [cancelMarket, setCancelMarket] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const parseIdList = (value: string) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
      .map((entry) => BigInt(entry));

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px 48px",
        color: "#e2e8f0",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: "28px" }}>Admin Panel</h1>
      <div style={{ marginTop: "8px", color: "#94a3b8", fontSize: "13px" }}>
        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Territory NFT</h2>
        <div style={gridStyle}>
          <Field label="Recipient" value={mintRecipient} onChange={setMintRecipient} />
          <Field label="Token ID" value={mintTokenId} onChange={setMintTokenId} />
          <Field label="URI (optional)" value={mintUri} onChange={setMintUri} />
          <ActionButton
            label="Mint Territory"
            disabled={isPending || !mintRecipient || !mintTokenId}
            onClick={() =>
              writeContract({
                address: TERRITORY_NFT_ADDRESS,
                abi: territoryNftAbi.abi,
                functionName: "mintTerritory",
                args: [mintRecipient as `0x${string}`, BigInt(mintTokenId), mintUri],
              })
            }
          />
          <Field label="Set Game Contract" value={nftGameContract} onChange={setNftGameContract} />
          <ActionButton
            label="Update NFT Game Contract"
            disabled={isPending || !nftGameContract}
            onClick={() =>
              writeContract({
                address: TERRITORY_NFT_ADDRESS,
                abi: territoryNftAbi.abi,
                functionName: "setGameContract",
                args: [nftGameContract as `0x${string}`],
              })
            }
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Army Token</h2>
        <div style={gridStyle}>
          <Field label="Set Game Contract" value={gameContract} onChange={setGameContract} />
          <ActionButton
            label="Update Token Game Contract"
            disabled={isPending || !gameContract}
            onClick={() =>
              writeContract({
                address: ARMY_TOKEN_ADDRESS,
                abi: armyTokenAbi.abi,
                functionName: "setGameContract",
                args: [gameContract as `0x${string}`],
              })
            }
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Risk Game</h2>
        <div style={gridStyle}>
          <Field label="Territory ID" value={borderTerritoryId} onChange={setBorderTerritoryId} />
          <Field
            label="Neighbor IDs (comma separated)"
            value={borderNeighbors}
            onChange={setBorderNeighbors}
          />
          <ActionButton
            label="Set Borders"
            disabled={isPending || !borderTerritoryId || !borderNeighbors}
            onClick={() =>
              writeContract({
                address: RISK_GAME_ADDRESS,
                abi: riskGameAbi.abi,
                functionName: "setBorders",
                args: [BigInt(borderTerritoryId), parseIdList(borderNeighbors)],
              })
            }
          />

          <Field label="Spawn Territory IDs" value={spawnIds} onChange={setSpawnIds} />
          <Toggle
            label="Spawn Enabled"
            checked={spawnEnabled}
            onChange={() => setSpawnEnabled((prev) => !prev)}
          />
          <ActionButton
            label="Set Spawn Territories"
            disabled={isPending || !spawnIds}
            onClick={() =>
              writeContract({
                address: RISK_GAME_ADDRESS,
                abi: riskGameAbi.abi,
                functionName: "setSpawnTerritories",
                args: [parseIdList(spawnIds), spawnEnabled],
              })
            }
          />

          <Field label="Grant Player" value={grantPlayer} onChange={setGrantPlayer} />
          <Field label="Territory ID" value={grantTerritoryId} onChange={setGrantTerritoryId} />
          <ActionButton
            label="Grant Initial Territory"
            disabled={isPending || !grantPlayer || !grantTerritoryId}
            onClick={() =>
              writeContract({
                address: RISK_GAME_ADDRESS,
                abi: riskGameAbi.abi,
                functionName: "grantInitialTerritory",
                args: [grantPlayer as `0x${string}`, BigInt(grantTerritoryId)],
              })
            }
          />

          <Field label="Spawn Territory ID" value={spawnTerritoryId} onChange={setSpawnTerritoryId} />
          <ActionButton
            label="Claim Spawn Territory"
            disabled={isPending || !spawnTerritoryId}
            onClick={() =>
              writeContract({
                address: RISK_GAME_ADDRESS,
                abi: riskGameAbi.abi,
                functionName: "claimSpawnTerritory",
                args: [BigInt(spawnTerritoryId)],
              })
            }
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Bet Escrow</h2>
        <div style={gridStyle}>
          <Field label="Signer" value={betSigner} onChange={setBetSigner} />
          <ActionButton
            label="Set Signer"
            disabled={isPending || !betSigner}
            onClick={() =>
              writeContract({
                address: BET_ESCROW_ADDRESS,
                abi: betEscrowAbi.abi,
                functionName: "setSigner",
                args: [betSigner as `0x${string}`],
              })
            }
          />

          <Field label="Resolve Market (URL)" value={resolveMarket} onChange={setResolveMarket} />
          <Field label="Outcome Index" value={resolveOutcome} onChange={setResolveOutcome} />
          <ActionButton
            label="Resolve Market"
            disabled={isPending || !resolveMarket || resolveOutcome === ""}
            onClick={() =>
              writeContract({
                address: BET_ESCROW_ADDRESS,
                abi: betEscrowAbi.abi,
                functionName: "resolveMarket",
                args: [resolveMarket, Number(resolveOutcome)],
              })
            }
          />

          <Field label="Cancel Market (URL)" value={cancelMarket} onChange={setCancelMarket} />
          <ActionButton
            label="Cancel Market"
            disabled={isPending || !cancelMarket}
            onClick={() =>
              writeContract({
                address: BET_ESCROW_ADDRESS,
                abi: betEscrowAbi.abi,
                functionName: "cancelMarket",
                args: [cancelMarket],
              })
            }
          />

          <Field label="Withdraw To" value={withdrawTo} onChange={setWithdrawTo} />
          <Field label="Withdraw Amount (wei)" value={withdrawAmount} onChange={setWithdrawAmount} />
          <ActionButton
            label="Withdraw"
            disabled={isPending || !withdrawTo || !withdrawAmount}
            onClick={() =>
              writeContract({
                address: BET_ESCROW_ADDRESS,
                abi: betEscrowAbi.abi,
                functionName: "withdraw",
                args: [withdrawTo as `0x${string}`, BigInt(withdrawAmount)],
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "8px", fontSize: "12px", color: "#94a3b8" }}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10, 18, 40, 0.85)",
          color: "#e2e8f0",
          fontFamily: '"Cinzel", serif',
        }}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#94a3b8" }}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: "8px",
        border: "none",
        background: disabled
          ? "rgba(148, 163, 184, 0.2)"
          : "linear-gradient(135deg, #7a2ff2, #a856ff)",
        color: "#fff",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: '"Cinzel", serif',
      }}
    >
      {label}
    </button>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: "24px",
  padding: "18px 22px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(10, 18, 40, 0.85)",
  boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};
