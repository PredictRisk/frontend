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
import { Users } from "lucide-react";
import { useAccount } from "wagmi";

// Territory data with positions for the map layout
const TERRITORIES = [
  { id: 1, name: "Northern Highlands", x: 250, y: 50 },
  { id: 2, name: "Eastern Plains", x: 550, y: 80 },
  { id: 3, name: "Southern Marshes", x: 650, y: 400 },
  { id: 4, name: "Western Mountains", x: 100, y: 200 },
  { id: 5, name: "Central Valley", x: 450, y: 250 },
  { id: 6, name: "Coastal Shores", x: 800, y: 320 },
  { id: 7, name: "Frozen Tundra", x: 80, y: 370 },
  { id: 8, name: "Desert Expanse", x: 350, y: 430 },
  { id: 9, name: "Jungle Depths", x: 950, y: 470 },
  { id: 10, name: "Volcanic Ridge", x: 420, y: 550 },
  { id: 11, name: "Ancient Ruins", x: 880, y: 600 },
  { id: 12, name: "Crystal Caverns", x: 600, y: 620 },
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
  1: { armies: 45, owner: "0x1234567890abcdef1234567890abcdef12345678" },
  2: { armies: 30, owner: "0x1234567890abcdef1234567890abcdef12345678" },
  3: { armies: 25, owner: "0x1234567890abcdef1234567890abcdef12345678" },
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

// Custom node component for territories
interface TerritoryNodeData {
  label: string;
  tokenId: number;
  armies: number;
  owner: string | null;
  isOwned: boolean;
  isSelected: boolean;
  isNeighbor: boolean;
  onSelect: (id: number) => void;
}

function TerritoryNode({ data }: NodeProps<Node<TerritoryNodeData>>) {
  const { label, tokenId, armies, owner, isOwned, isSelected, isNeighbor, onSelect } = data;

  const getNodeColor = () => {
    if (isOwned) return "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
    if (owner === null) return "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
    return "linear-gradient(135deg, #374151 0%, #1f2937 100%)";
  };

  const getBorderColor = () => {
    if (isSelected) return "#fbbf24";
    if (isNeighbor) return "#f97316";
    return "rgba(255,255,255,0.1)";
  };

  const getBoxShadow = () => {
    if (isSelected) return "0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.2)";
    if (isNeighbor) return "0 0 20px rgba(249, 115, 22, 0.4)";
    return "0 4px 20px rgba(0,0,0,0.3)";
  };

  return (
    <div
      onClick={() => onSelect(tokenId)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      {/* Handles for edges */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {/* Circle with army count */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: getNodeColor(),
          border: `3px solid ${getBorderColor()}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: getBoxShadow(),
          transition: "all 0.3s ease",
        }}
      >
        <Users size={18} style={{ color: "rgba(255,255,255,0.7)", marginBottom: "2px" }} />
        <span
          style={{
            fontSize: "22px",
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
          padding: "8px 16px",
          background: "rgba(31, 41, 55, 0.95)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
          minWidth: "120px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "2px",
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
              color: "#ef4444",
              marginTop: "2px",
            }}
          >
            Unclaimed
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  territory: TerritoryNode,
};

export default function MapView() {
  const { address } = useAccount();
  const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);

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

  // Handle territory selection
  const handleSelect = useCallback((id: number) => {
    setSelectedTerritory((prev) => (prev === id ? null : id));
  }, []);

  // Create nodes from territory data
  const initialNodes: Node<TerritoryNodeData>[] = useMemo(
    () =>
      TERRITORIES.map((territory) => {
        const data = mockTerritoryData[territory.id];
        const isOwned = data.owner?.toLowerCase() === address?.toLowerCase();

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
            isNeighbor: selectedNeighbors.has(territory.id),
            onSelect: handleSelect,
          },
          draggable: false,
        };
      }),
    [address, selectedTerritory, selectedNeighbors, handleSelect]
  );

  // Create edges from borders
  const initialEdges: Edge[] = useMemo(
    () =>
      BORDERS.map(([a, b]) => ({
        id: `e${a}-${b}`,
        source: String(a),
        target: String(b),
        style: {
          stroke: "rgba(107, 114, 128, 0.4)",
          strokeWidth: 2,
        },
        type: "straight",
      })),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when selection changes
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Header hint */}
      <div
        style={{
          padding: "12px 24px",
          background: "rgba(31, 41, 55, 0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#9ca3af",
          fontSize: "14px",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: "2px solid #9ca3af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
          }}
        >
          i
        </div>
        Click on your territories to see attack and move options.
      </div>

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
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
          panOnScroll
          zoomOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.03)" gap={20} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div
        style={{
          margin: "0 16px 16px 16px",
          padding: "16px 24px",
          background: "rgba(31, 41, 55, 0.8)",
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
            gap: "40px",
            flexWrap: "wrap",
          }}
        >
          <LegendItem color="#fbbf24" label="Selected Territory" />
          <LegendItem color="#f97316" label="Neighboring Territory" />
          <LegendItem color="#6b7280" label="Other Territory" />
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
                height: "2px",
                background: "#6b7280",
              }}
            />
            Border Connection
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
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
          border: `3px solid ${color}`,
          background: "transparent",
        }}
      />
      {label}
    </div>
  );
}
