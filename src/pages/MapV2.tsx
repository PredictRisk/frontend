import { useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import ActionPanel from "../components/ActionPanel";
import SvgRiskMap from "../components/SvgRiskMap";
import worldSvg from "../assets/world.svg?raw";
import worldBordersCsv from "../assets/world-borders.csv?raw";
import { CONTRACT_TERRITORIES } from "../data/mapV2";

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

export default function MapV2() {
  const { isConnected } = useAccount();
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [targetTerritory, setTargetTerritory] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const { countries, neighborsByCode } = useMemo(
    () => parseWorldBordersCsv(worldBordersCsv, extractSvgCodes(worldSvg)),
    [],
  );

  const contractIdByCode = useMemo(() => {
    if (countries.length > CONTRACT_TERRITORIES.length) {
      return new Map(countries.map((country, index) => [country.code, index]));
    }
    return new Map(CONTRACT_TERRITORIES.map((territory) => [territory.svgId, territory.id]));
  }, [countries]);

  const selectedNeighbors = useMemo(() => {
    if (selectedTerritory === null) return new Set<string>();
    return neighborsByCode.get(selectedTerritory) ?? new Set<string>();
  }, [selectedTerritory, neighborsByCode]);

  const handleTerritoryClick = (code: string) => {

    if (selectedTerritory === null) {
      setSelectedTerritory(code);
      setTargetTerritory(null);
      return;
    }

    if (selectedTerritory === code) {
      setSelectedTerritory(null);
      setTargetTerritory(null);
      return;
    }

    const isNeighbor = neighborsByCode.get(selectedTerritory)?.has(code);
    const hasContractIds =
      contractIdByCode.has(selectedTerritory) && contractIdByCode.has(code);

    if (isNeighbor && hasContractIds) {
      setTargetTerritory(code);
    } else {
      setSelectedTerritory(code);
      setTargetTerritory(null);
    }
  };

  const clampZoom = (value: number) => Math.min(6, Math.max(1, value));

  const handleZoomIn = () => setZoom((prev) => clampZoom(prev + 0.1));
  const handleZoomOut = () => setZoom((prev) => clampZoom(prev - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(8, 12, 30, 0.8)",
        }}
      >
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc" }}>
            World Map
          </div>
          <div style={{ fontSize: "13px", color: "#9aa0b8", marginTop: "4px" }}>
            Select a territory, then choose a neighboring target to attack.
          </div>
          {!isConnected && (
            <div style={{ fontSize: "12px", color: "#9aa0b8", marginTop: "4px" }}>
              Wallet not connected. You can browse the map, but actions require a wallet.
            </div>
          )}
        </div>
        <div style={{ fontSize: "13px", color: "#9aa0b8" }}>
          {selectedTerritory !== null
            ? `Selected: ${countries.find((t) => t.code === selectedTerritory)?.name ?? "-"}`
            : "No territory selected"}
          {targetTerritory !== null
            ? ` • Target: ${countries.find((t) => t.code === targetTerritory)?.name ?? "-"}`
            : ""}
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px" }}>
        <div
          style={{
            height: "calc(100vh - 140px)",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            background: "rgba(8, 12, 30, 0.75)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)",
            position: "relative",
          }}
        >
          <div
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY > 0 ? -0.08 : 0.08;
              setZoom((prev) => clampZoom(prev + delta));
            }}
            onPointerDown={(event) => {
              const shouldPan = event.button === 1 || event.shiftKey;
              if (!shouldPan) return;
              isPanningRef.current = true;
              panStartRef.current = {
                x: event.clientX - pan.x,
                y: event.clientY - pan.y,
              };
              (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!isPanningRef.current) return;
              setPan({
                x: event.clientX - panStartRef.current.x,
                y: event.clientY - panStartRef.current.y,
              });
            }}
            onPointerUp={(event) => {
              isPanningRef.current = false;
              (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
            }}
            onPointerLeave={() => {
              isPanningRef.current = false;
            }}
            style={{
              width: "100%",
              height: "100%",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.1s ease",
              cursor: isPanningRef.current ? "grabbing" : "grab",
            }}
          >
            <SvgRiskMap
              territories={countries.map((country) => ({
                code: country.code,
                name: country.name,
                svgId: country.code,
              }))}
              selectedTerritory={selectedTerritory}
              targetTerritory={targetTerritory}
              neighborIds={selectedNeighbors}
              onSelect={handleTerritoryClick}
            />
          </div>

          <div
            style={{
              position: "absolute",
              right: "16px",
              top: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              background: "rgba(8, 12, 30, 0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "8px",
            }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              −
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              style={{
                width: "36px",
                height: "28px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#cbd5f5",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              100%
            </button>
          </div>
        </div>
      </div>

      <ActionPanel
        selectedTerritory={
          selectedTerritory ? contractIdByCode.get(selectedTerritory) ?? null : null
        }
        targetTerritory={
          targetTerritory ? contractIdByCode.get(targetTerritory) ?? null : null
        }
        onClose={() => {
          setSelectedTerritory(null);
          setTargetTerritory(null);
        }}
      />
    </div>
  );
}
