import { useState } from "react";
import { Swords, ArrowRight } from "lucide-react";

interface ActionModalProps {
  type: "move" | "attack";
  fromTerritory: {
    id: number;
    name: string;
    armies: number;
  };
  toTerritoryId: number | null;
  neighbors: Array<{
    id: number;
    name: string;
    armies: number;
  }>;
  onClose: () => void;
  onConfirm: (toId: number, amount: number) => void;
}

function ActionModal({
  type,
  fromTerritory,
  toTerritoryId,
  neighbors,
  onClose,
  onConfirm,
}: ActionModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<number | null>(toTerritoryId);
  const [amount, setAmount] = useState("");

  const maxAmount = fromTerritory.armies - 1; // Keep at least 1 army
  const targetTerritory = neighbors.find((n) => n.id === selectedTarget);

  const isAttack = type === "attack";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
          border: `1px solid ${isAttack ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
          borderRadius: "16px",
          padding: "24px",
          minWidth: "400px",
          maxWidth: "500px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {isAttack ? (
              <>
                <Swords size={22} style={{ color: "#ef4444" }} />
                Attack Territory
              </>
            ) : (
              <>
                <ArrowRight size={22} style={{ color: "#3b82f6" }} />
                Move Troops
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "24px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* From territory */}
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>
            From
          </div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#fff" }}>
            {fromTerritory.name}
          </div>
          <div style={{ fontSize: "13px", color: "#60a5fa" }}>
            {fromTerritory.armies} armies available
          </div>
        </div>

        {/* Target selection */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
            {isAttack ? "Attack Target" : "Move To"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {neighbors.map((neighbor) => (
              <button
                key={neighbor.id}
                onClick={() => setSelectedTarget(neighbor.id)}
                style={{
                  padding: "10px 16px",
                  background:
                    selectedTarget === neighbor.id
                      ? isAttack
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(59, 130, 246, 0.2)"
                      : "rgba(255,255,255,0.05)",
                  border: `1px solid ${
                    selectedTarget === neighbor.id
                      ? isAttack
                        ? "#ef4444"
                        : "#3b82f6"
                      : "rgba(255,255,255,0.1)"
                  }`,
                  borderRadius: "8px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontWeight: 500 }}>{neighbor.name}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {neighbor.armies} armies
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
            {isAttack ? "Troops to Send" : "Troops to Move"}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              max={maxAmount}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "16px",
                outline: "none",
              }}
            />
            <button
              onClick={() => setAmount(String(maxAmount))}
              style={{
                padding: "12px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Max ({maxAmount})
            </button>
          </div>
        </div>

        {/* Attack power indicator for attacks */}
        {isAttack && selectedTarget && amount && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#fbbf24", marginBottom: "4px" }}>
              Attack Power Ratio
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#fff" }}>
              {Number(amount)} vs {targetTerritory?.armies || 0}
              <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: "8px" }}>
                (Need {Math.ceil((targetTerritory?.armies || 0) * 2.7)}+ to win)
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "14px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#9ca3af",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedTarget && amount) {
                onConfirm(selectedTarget, Number(amount));
              }
            }}
            disabled={!selectedTarget || !amount || Number(amount) < 1}
            style={{
              flex: 1,
              padding: "14px",
              background: isAttack
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              opacity: !selectedTarget || !amount ? 0.5 : 1,
            }}
          >
            {isAttack ? "⚔️ Attack" : "→ Move Troops"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActionModal;
