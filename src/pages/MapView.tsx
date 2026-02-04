import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Users, Swords, ArrowRight, Info } from "lucide-react";
import { useAccount } from "wagmi";

import ActionModal from "../components/ActionModal";

// Territory data with positions for the map layout
const TERRITORIES = [
  { id: 1, name: "Northern Highlands", x: 250, y: 80 },
  { id: 2, name: "Eastern Plains", x: 580, y: 150 },
  { id: 3, name: "Southern Marshes", x: 680, y: 480 },
  { id: 4, name: "Western Mountains", x: 120, y: 280 },
  { id: 5, name: "Central Valley", x: 480, y: 320 },
  { id: 6, name: "Coastal Shores", x: 850, y: 400 },
  { id: 7, name: "Frozen Tundra", x: 80, y: 480 },
  { id: 8, name: "Desert Expanse", x: 350, y: 500 },
  { id: 9, name: "Jungle Depths", x: 980, y: 550 },
  { id: 10, name: "Volcanic Ridge", x: 450, y: 620 },
  { id: 11, name: "Ancient Ruins", x: 900, y: 700 },
  { id: 12, name: "Crystal Caverns", x: 620, y: 720 },
];

// Border connections between territories
const BORDERS: [number, number][] = [
  [1, 2],
  [1, 4],
  [1, 5],
  [2, 3],
  [2, 5],
  [2, 6],
  [3, 5],
  [3, 6],
  [3, 8],
  [4, 5],
  [4, 7],
  [5, 6],
  [5, 8],
  [6, 9],
  [7, 8],
  [8, 10],
  [8, 12],
  [9, 11],
  [10, 11],
  [10, 12],
  [11, 12],
];

// Mock data - replace with your contract hooks
const mockTerritoryData: Record<number, { armies: number; owner: string | null }> = {
  1: { armies: 45, owner: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" },
  2: { armies: 30, owner: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" },
  3: { armies: 25, owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" },
  4: { armies: 38, owner: "0x1234567890abcdef1234567890abcdef12345678" },
  5: { armies: 42, owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" },
  6: { armies: 28, owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" },
  7: { armies: 20, owner: "0x1234567890abcdef1234567890abcdef12345678" },
  8: { armies: 15, owner: null },
  9: { armies: 12, owner: null },
  10: { armies: 27, owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" },
  11: { armies: 33, owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" },
  12: { armies: 10, owner: null },
};

// Mock current user address - replace with actual connected address
const MOCK_USER_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

// Custom node component for territories
interface TerritoryNodeData {
  label: string;
  tokenId: number;
  armies: number;
  owner: string | null;
  isOwned: boolean;
  isSelected: boolean;
  isNeighbor: boolean;
  canAttack: boolean;
  canMove: boolean;
  onSelect: (id: number) => void;
  onAttack: (id: number) => void;
  onMove: (id: number) => void;
}

function TerritoryNode({ data }: NodeProps<Node<TerritoryNodeData>>) {
  const {
    label,
    tokenId,
    armies,
    owner,
    isOwned,
    isSelected,
    isNeighbor,
    canAttack,
    canMove,
    onSelect,
    onAttack,
    onMove,
  } = data;

  const getNodeColor = () => {
    if (isOwned) return "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
    if (owner === null) return "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
    if (isNeighbor && !isOwned) return "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
    return "linear-gradient(135deg, #374151 0%, #1f2937 100%)";
  };

  const getBorderColor = () => {
    if (isSelected) return "#fbbf24";
    if (isNeighbor) return "#f97316";
    return "rgba(255,255,255,0.15)";
  };

  const getBorderWidth = () => {
    if (isSelected) return "4px";
    return "3px";
  };

  const getBoxShadow = () => {
    if (isSelected)
      return "0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.3)";
    if (isNeighbor) return "0 0 20px rgba(249, 115, 22, 0.4)";
    return "0 4px 20px rgba(0,0,0,0.4)";
  };

  return (
    <div
      onClick={() => onSelect(tokenId)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Handles for edges */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {/* Selection indicator dot */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "50%",
            transform: "translateX(50px)",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#fbbf24",
            border: "2px solid #1f2937",
            boxShadow: "0 0 10px #fbbf24",
          }}
        />
      )}

      {/* Circle with army count */}
      <div
        style={{
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          background: getNodeColor(),
          border: `${getBorderWidth()} solid ${getBorderColor()}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: getBoxShadow(),
          transition: "all 0.3s ease",
        }}
      >
        <Users
          size={18}
          style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2px" }}
        />
        <span
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {armies}
        </span>
      </div>

      {/* Label card */}
      <div
        style={{
          marginTop: "8px",
          padding: "10px 16px",
          background: "rgba(31, 41, 55, 0.95)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
          minWidth: "130px",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "3px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
          }}
        >
          NFT #{String(tokenId).padStart(3, "0")}
        </div>
        {owner === null && (
          <div
            style={{
              fontSize: "10px",
              color: "#f87171",
              marginTop: "3px",
            }}
          >
            Unclaimed
          </div>
        )}

        {/* Action buttons for neighbors */}
        {isNeighbor && (canAttack || canMove) && (
          <div style={{ marginTop: "8px" }}>
            {canAttack && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAttack(tokenId);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  width: "100%",
                  padding: "6px 12px",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Swords size={12} />
                Attack
              </button>
            )}
            {canMove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(tokenId);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  width: "100%",
                  padding: "6px 12px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <ArrowRight size={12} />
                Move
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  territory: TerritoryNode,
};

interface MapViewProps {
  onAttack?: (fromId: number, toId: number) => void;
  onMove?: (fromId: number, toId: number) => void;
}

export default function MapView({ onAttack, onMove }: MapViewProps) {
  const { address } = useAccount();
  const userAddress = address || MOCK_USER_ADDRESS;

  const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [targetTerritory, setTargetTerritory] = useState<number | null>(null);

  // Get neighbors of selected territory
  const selectedNeighbors = useMemo(() => {
    if (selectedTerritory === null) return new Set<number>();
    const neighbors = new Set<number>();
    BORDERS.forEach(([a, b]) => {
      if (a === selectedTerritory) neighbors.add(b);
      if (b === selectedTerritory) neighbors.add(a);
    });
    return neighbors;
  }, [selectedTerritory]);

  // Get selected territory data
  const selectedTerritoryData = useMemo(() => {
    if (selectedTerritory === null) return null;
    const territory = TERRITORIES.find((t) => t.id === selectedTerritory);
    const data = mockTerritoryData[selectedTerritory];
    return territory ? { ...territory, ...data } : null;
  }, [selectedTerritory]);

  // Check if selected territory is owned by user
  const isSelectedOwned = useMemo(() => {
    if (!selectedTerritoryData) return false;
    return selectedTerritoryData.owner?.toLowerCase() === userAddress.toLowerCase();
  }, [selectedTerritoryData, userAddress]);

  // Handle territory selection
  const handleSelect = useCallback(
    (id: number) => {
      const data = mockTerritoryData[id];
      const isOwned = data.owner?.toLowerCase() === userAddress.toLowerCase();

      // If clicking on own territory, select it
      if (isOwned) {
        setSelectedTerritory((prev) => (prev === id ? null : id));
      } else if (selectedTerritory !== null && selectedNeighbors.has(id)) {
        // If clicking on neighbor while own territory selected, keep selection
        // Action buttons will handle the interaction
      } else {
        // Clicking on non-owned, non-neighbor territory clears selection
        setSelectedTerritory(null);
      }
    },
    [userAddress, selectedTerritory, selectedNeighbors]
  );

  // Handle attack action
  const handleAttack = useCallback(
    (toId: number) => {
      if (selectedTerritory === null) return;
      setTargetTerritory(toId);
      setShowAttackModal(true);
      onAttack?.(selectedTerritory, toId);
    },
    [selectedTerritory, onAttack]
  );

  // Handle move action
  const handleMove = useCallback(
    (toId: number) => {
      if (selectedTerritory === null) return;
      setTargetTerritory(toId);
      setShowMoveModal(true);
      onMove?.(selectedTerritory, toId);
    },
    [selectedTerritory, onMove]
  );

  // Create nodes from territory data
  const initialNodes: Node<TerritoryNodeData>[] = useMemo(
    () =>
      TERRITORIES.map((territory) => {
        const data = mockTerritoryData[territory.id];
        const isOwned = data.owner?.toLowerCase() === userAddress.toLowerCase();
        const isNeighbor = selectedNeighbors.has(territory.id);

        // Determine if attack/move is available
        const canAttack = isSelectedOwned && isNeighbor && !isOwned;
        const canMove = isSelectedOwned && isNeighbor && isOwned;

        return {
          id: String(territory.id),
          type: "territory",
          position: { x: territory.x, y: territory.y },
          data: {
            label: territory.name,
            tokenId: territory.id,
            armies: data.armies,
            owner: data.owner,
            isOwned,
            isSelected: selectedTerritory === territory.id,
            isNeighbor,
            canAttack,
            canMove,
            onSelect: handleSelect,
            onAttack: handleAttack,
            onMove: handleMove,
          },
          draggable: false,
        };
      }),
    [
      userAddress,
      selectedTerritory,
      selectedNeighbors,
      isSelectedOwned,
      handleSelect,
      handleAttack,
      handleMove,
    ]
  );

  // Create edges from borders with highlighting
  const initialEdges: Edge[] = useMemo(
    () =>
      BORDERS.map(([a, b]) => {
        const isHighlighted =
          selectedTerritory !== null &&
          ((a === selectedTerritory && selectedNeighbors.has(b)) ||
            (b === selectedTerritory && selectedNeighbors.has(a)));

        return {
          id: `e${a}-${b}`,
          source: String(a),
          target: String(b),
          style: {
            stroke: isHighlighted ? "#fbbf24" : "rgba(107, 114, 128, 0.3)",
            strokeWidth: isHighlighted ? 3 : 2,
          },
          type: "straight",
          animated: isHighlighted,
        };
      }),
    [selectedTerritory, selectedNeighbors]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when selection changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Count neighbors by type
  const neighborCount = selectedNeighbors.size;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Inter", system-ui, sans-serif',
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      {/* Header hint */}
      <div
        style={{
          padding: "14px 24px",
          background: "rgba(31, 41, 55, 0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#9ca3af",
          fontSize: "14px",
        }}
      >
        <Info size={18} style={{ color: "#6b7280" }} />
        {selectedTerritory && isSelectedOwned
          ? "Your territory is selected. Click on neighboring territories to attack or move troops."
          : "Click on your territories to see attack and move options."}
      </div>

      {/* Selection panel */}
      {selectedTerritoryData && isSelectedOwned && (
        <div
          style={{
            padding: "16px 24px",
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)",
            borderBottom: "1px solid rgba(59, 130, 246, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "#fff",
              }}
            >
              {selectedTerritoryData.name} Selected
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                color: "#9ca3af",
              }}
            >
              {selectedTerritoryData.armies} armies • {neighborCount} neighbors
            </p>
          </div>
          <button
            onClick={() => setShowMoveModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              borderRadius: "8px",
              color: "#60a5fa",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.borderColor = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
            }}
          >
            <ArrowRight size={16} />
            Move Troops
          </button>
        </div>
      )}

      {/* Map container */}
      <div
        style={{
          flex: 1,
          margin: "16px",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.4}
          maxZoom={1.5}
          panOnScroll
          zoomOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.02)" gap={24} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div
        style={{
          margin: "0 16px 16px 16px",
          padding: "16px 24px",
          background: "rgba(31, 41, 55, 0.9)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "12px",
          }}
        >
          Map Legend
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
            flexWrap: "wrap",
          }}
        >
          <LegendItem color="#fbbf24" label="Selected Territory" />
          <LegendItem color="#f97316" label="Neighboring Territory" />
          <LegendItem color="#3b82f6" label="Your Territory" filled />
          <LegendItem color="#ef4444" label="Unclaimed" filled />
          <LegendItem color="#6b7280" label="Enemy Territory" filled />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "3px",
                background: "#fbbf24",
                borderRadius: "2px",
              }}
            />
            Active Connection
          </div>
        </div>
      </div>

      {/* Move Modal */}
      {showMoveModal && selectedTerritory && (
        <ActionModal
          type="move"
          fromTerritory={selectedTerritoryData!}
          toTerritoryId={targetTerritory}
          neighbors={Array.from(selectedNeighbors)
            .filter((id) => {
              const data = mockTerritoryData[id];
              return data.owner?.toLowerCase() === userAddress.toLowerCase();
            })
            .map((id) => ({
              ...TERRITORIES.find((t) => t.id === id)!,
              ...mockTerritoryData[id],
            }))}
          onClose={() => {
            setShowMoveModal(false);
            setTargetTerritory(null);
          }}
          onConfirm={(toId, amount) => {
            console.log(`Moving ${amount} troops from ${selectedTerritory} to ${toId}`);
            setShowMoveModal(false);
            setTargetTerritory(null);
          }}
        />
      )}

      {/* Attack Modal */}
      {showAttackModal && selectedTerritory && (
        <ActionModal
          type="attack"
          fromTerritory={selectedTerritoryData!}
          toTerritoryId={targetTerritory}
          neighbors={Array.from(selectedNeighbors)
            .filter((id) => {
              const data = mockTerritoryData[id];
              return data.owner?.toLowerCase() !== userAddress.toLowerCase();
            })
            .map((id) => ({
              ...TERRITORIES.find((t) => t.id === id)!,
              ...mockTerritoryData[id],
            }))}
          onClose={() => {
            setShowAttackModal(false);
            setTargetTerritory(null);
          }}
          onConfirm={(toId, amount) => {
            console.log(`Attacking ${toId} from ${selectedTerritory} with ${amount} troops`);
            setShowAttackModal(false);
            setTargetTerritory(null);
          }}
        />
      )}
    </div>
  );
}

function LegendItem({
  color,
  label,
  filled = false,
}: {
  color: string;
  label: string;
  filled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#9ca3af",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          border: filled ? "none" : `3px solid ${color}`,
          background: filled ? color : "transparent",
        }}
      />
      {label}
    </div>
  );
}
