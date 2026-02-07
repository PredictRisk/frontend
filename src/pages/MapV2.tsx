import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "viem";

import ActionPanel from "../components/ActionPanel";
import SvgRiskMap from "../components/SvgRiskMap";
import territoryNftAbi from "../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json";
import worldSvg from "../assets/world.svg?raw";
import worldBordersCsv from "../assets/world-borders.csv?raw";
import { CONTRACT_TERRITORIES } from "../data/mapV2";
import { TERRITORY_NFT_ADDRESS, useClaimDailyArmies, useClaimInitialTerritory } from "../hooks/useContract";

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
  const { isConnected, address } = useAccount();
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [targetTerritory, setTargetTerritory] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [suppressClick, setSuppressClick] = useState(false);
  const isPanningRef = useRef(false);
  const panPointerIdRef = useRef<number | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const { data: territoryBalance, refetch: refetchTerritoryBalance } = useReadContract({
    address: TERRITORY_NFT_ADDRESS,
    abi: territoryNftAbi.abi as unknown as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const territoryBalanceValue = typeof territoryBalance === "bigint" ? territoryBalance : 0n;
  const hasTerritory = territoryBalanceValue > 0n;

  const {
    claim: claimDaily,
    isPending: isClaimingDaily,
    isSuccess: dailySuccess,
  } = useClaimDailyArmies();
  const {
    claimInitial,
    isPending: isClaimingInitial,
    isSuccess: initialSuccess,
  } = useClaimInitialTerritory();

  const { countries, neighborsByCode } = useMemo(
    () => parseWorldBordersCsv(worldBordersCsv, extractSvgCodes(worldSvg)),
    [],
  );

  const territoryIds = useMemo(
    () => Array.from({ length: countries.length }, (_, index) => index),
    [countries.length],
  );

  const { data: existsList, refetch: refetchExistsList } = useReadContracts({
    allowFailure: true,
    contracts: territoryIds.map((id) => ({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi as unknown as Abi,
      functionName: "exists",
      args: [BigInt(id)],
    })),
    query: { enabled: territoryIds.length > 0 },
  });

  const contractIdByCode = useMemo(() => {
    if (countries.length > CONTRACT_TERRITORIES.length) {
      return new Map(countries.map((country, index) => [country.code, index]));
    }
    return new Map(CONTRACT_TERRITORIES.map((territory) => [territory.svgId, territory.id]));
  }, [countries]);

  const claimedCodes = useMemo(() => {
    const claimed = new Set<string>();
    existsList?.forEach((entry, index) => {
      if (entry?.status === "success" && entry.result === true) {
        const code = countries[index]?.code;
        if (code) claimed.add(code);
      }
    });
    return claimed;
  }, [existsList, countries]);

  const mintedIds = useMemo(() => {
    const ids: number[] = [];
    existsList?.forEach((entry, index) => {
      if (entry?.status === "success" && entry.result === true) {
        ids.push(index);
      }
    });
    return ids;
  }, [existsList]);

  const { data: ownerResults, refetch: refetchOwners } = useReadContracts({
    allowFailure: true,
    contracts: mintedIds.map((id) => ({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi as unknown as Abi,
      functionName: "ownerOf",
      args: [BigInt(id)],
    })),
    query: { enabled: mintedIds.length > 0 },
  });

  const ownerById = useMemo(() => {
    const map = new Map<number, `0x${string}`>();
    mintedIds.forEach((id, index) => {
      const ownerEntry = ownerResults?.[index];
      if (ownerEntry?.status !== "success") return;
      const owner = ownerEntry.result as `0x${string}`;
      map.set(id, owner);
    });
    return map;
  }, [mintedIds, ownerResults]);

  const ownedCodes = useMemo(() => {
    const owned = new Set<string>();
    if (!address) return owned;
    const idToCode = new Map<number, string>();
    countries.forEach((country) => {
      const id = contractIdByCode.get(country.code);
      if (id !== undefined) idToCode.set(id, country.code);
    });
    mintedIds.forEach((id) => {
      const owner = ownerById.get(id);
      if (!owner) return;
      if (owner.toLowerCase() !== address.toLowerCase()) return;
      const code = idToCode.get(id);
      if (code) owned.add(code);
    });
    return owned;
  }, [address, countries, contractIdByCode, mintedIds, ownerById]);


  const selectedTerritoryId = selectedTerritory ? contractIdByCode.get(selectedTerritory) ?? null : null;

  const { data: existsData } = useReadContract({
    address: TERRITORY_NFT_ADDRESS,
    abi: territoryNftAbi.abi as unknown as Abi,
    functionName: "exists",
    args: selectedTerritoryId !== null ? [BigInt(selectedTerritoryId)] : undefined,
    query: { enabled: selectedTerritoryId !== null },
  });

  const isAlreadyMinted = typeof existsData === "boolean" ? existsData : false;


  const selectedNeighbors = useMemo(() => {
    if (selectedTerritory === null) return new Set<string>();
    return neighborsByCode.get(selectedTerritory) ?? new Set<string>();
  }, [selectedTerritory, neighborsByCode]);

  const selectedOwned = useMemo(() => {
    if (!selectedTerritory || !address) return false;
    return ownedCodes.has(selectedTerritory);
  }, [selectedTerritory, address, ownedCodes]);

  const selectedOwnerAddress = useMemo(() => {
    if (selectedTerritoryId === null) return null;
    return ownerById.get(selectedTerritoryId) ?? null;
  }, [selectedTerritoryId, ownerById]);

  const highlightedCodes = useMemo(() => {
    const set = new Set<string>();
    if (!selectedOwnerAddress || (address && selectedOwnerAddress.toLowerCase() === address.toLowerCase())) {
      return set;
    }
    const idToCode = new Map<number, string>();
    countries.forEach((country) => {
      const id = contractIdByCode.get(country.code);
      if (id !== undefined) idToCode.set(id, country.code);
    });
    ownerById.forEach((owner, id) => {
      if (owner.toLowerCase() !== selectedOwnerAddress.toLowerCase()) return;
      const code = idToCode.get(id);
      if (code) set.add(code);
    });
    return set;
  }, [selectedOwnerAddress, address, countries, contractIdByCode, ownerById]);

  const selectedTerritoryName = useMemo(() => {
    if (!selectedTerritory) return null;
    return countries.find((country) => country.code === selectedTerritory)?.name ?? null;
  }, [selectedTerritory, countries]);

  const targetTerritoryName = useMemo(() => {
    if (!targetTerritory) return null;
    return countries.find((country) => country.code === targetTerritory)?.name ?? null;
  }, [targetTerritory, countries]);

  const selectedNeighborList = useMemo(() => {
    if (!selectedTerritory) return [];
    const neighbors = neighborsByCode.get(selectedTerritory) ?? new Set<string>();
    return Array.from(neighbors).map((code) => {
      const country = countries.find((item) => item.code === code);
      return country?.name ?? code;
    });
  }, [selectedTerritory, neighborsByCode, countries]);

  const attackableTargets = useMemo(() => {
    if (!selectedTerritory || !ownedCodes.has(selectedTerritory)) return [];
    const neighbors = neighborsByCode.get(selectedTerritory) ?? new Set<string>();
    return Array.from(neighbors)
      .map((code) => {
        const id = contractIdByCode.get(code);
        if (id === undefined) return null;
        const country = countries.find((item) => item.code === code);
        const ownerIndex = mintedIds.indexOf(id);
        const ownerEntry = ownerIndex >= 0 ? ownerResults?.[ownerIndex] : undefined;
        const owner =
          ownerEntry?.status === "success" ? (ownerEntry.result as `0x${string}`) : null;
        if (owner && address && owner.toLowerCase() === address.toLowerCase()) {
          return null;
        }
        return {
          id,
          code,
          name: country?.name ?? code,
          owner,
        };
      })
      .filter(Boolean) as Array<{
      id: number;
      code: string;
      name: string;
      owner: `0x${string}` | null;
    }>;
  }, [selectedTerritory, ownedCodes, neighborsByCode, contractIdByCode, countries, mintedIds, ownerResults]);

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

  useEffect(() => {
    if (dailySuccess || initialSuccess) {
      refetchTerritoryBalance();
    }
  }, [dailySuccess, initialSuccess, refetchTerritoryBalance]);

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

      <div
        style={{
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(6, 10, 26, 0.7)",
          color: "#cbd5f5",
          fontSize: "13px",
        }}
      >
        {!hasTerritory ? (
          <>
            <span>
              Select a free territory, then claim your starter (100 armies).
            </span>
            <button
              type="button"
              onClick={() => {
                if (selectedTerritoryId === null) return;
                claimInitial(selectedTerritoryId);
              }}
              disabled={
                selectedTerritoryId === null ||
                isAlreadyMinted ||
                isClaimingInitial
              }
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                color: "#fff",
                cursor: "pointer",
                opacity:
                  selectedTerritoryId === null || isAlreadyMinted || isClaimingInitial
                    ? 0.6
                    : 1,
              }}
            >
              {isClaimingInitial ? "Claiming..." : "Claim Starter"}
            </button>
            {selectedTerritoryId !== null && isAlreadyMinted && (
              <span style={{ color: "#f87171" }}>Selected territory already claimed.</span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={claimDaily}
            disabled={isClaimingDaily}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #4caf50, #2e7d32)",
              color: "#fff",
              cursor: "pointer",
              opacity: isClaimingDaily ? 0.6 : 1,
            }}
          >
            {isClaimingDaily ? "Claiming..." : "Claim Daily Armies"}
          </button>
        )}
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
              if (event.button !== 0 && event.button !== 1) return;
              isPanningRef.current = false;
              setIsPanning(false);
              setSuppressClick(false);
              movedRef.current = false;
              panPointerIdRef.current = event.pointerId;
              panOriginRef.current = { x: event.clientX, y: event.clientY };
              panStartRef.current = {
                x: event.clientX - pan.x,
                y: event.clientY - pan.y,
              };
            }}
            onPointerMove={(event) => {
              if (panPointerIdRef.current !== event.pointerId) return;
              const dx = Math.abs(event.clientX - panOriginRef.current.x);
              const dy = Math.abs(event.clientY - panOriginRef.current.y);
              if (dx > 6 || dy > 6) {
                if (!isPanningRef.current) {
                  isPanningRef.current = true;
                  setIsPanning(true);
                  movedRef.current = true;
                  setSuppressClick(true);
                  if (panPointerIdRef.current !== null) {
                    (event.currentTarget as HTMLDivElement).setPointerCapture(
                      panPointerIdRef.current,
                    );
                  }
                }
              }
              if (!isPanningRef.current) return;
              setPan({
                x: event.clientX - panStartRef.current.x,
                y: event.clientY - panStartRef.current.y,
              });
            }}
            onPointerUp={(event) => {
              if (panPointerIdRef.current !== event.pointerId) return;
              if (isPanningRef.current) {
                isPanningRef.current = false;
                setIsPanning(false);
                (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
                setSuppressClick(true);
                setTimeout(() => setSuppressClick(false), 0);
              }
              movedRef.current = false;
              panPointerIdRef.current = null;
            }}
            onPointerLeave={() => {
              isPanningRef.current = false;
              setIsPanning(false);
              panPointerIdRef.current = null;
            }}
            style={{
              width: "100%",
              height: "100%",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.1s ease",
              cursor: isPanning ? "grabbing" : "grab",
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
              claimedCodes={claimedCodes}
              ownedCodes={ownedCodes}
              highlightCodes={highlightedCodes}
              isSelectedOwned={selectedOwned}
              suppressClick={suppressClick}
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
        selectedTerritory={selectedTerritoryId}
        targetTerritory={
          targetTerritory ? contractIdByCode.get(targetTerritory) ?? null : null
        }
        selectedTerritoryExists={isAlreadyMinted}
        selectedTerritoryName={selectedTerritoryName}
        targetTerritoryName={targetTerritoryName}
        selectedOwnerAddress={selectedOwnerAddress}
        attackableTargets={attackableTargets}
        neighborNames={selectedNeighborList}
        onSelectTarget={(id) => {
          const codeEntry = countries.find((country) => {
            const mappedId = contractIdByCode.get(country.code);
            return mappedId === id;
          });
          if (codeEntry) {
            setTargetTerritory(codeEntry.code);
          }
        }}
        onClose={() => {
          setSelectedTerritory(null);
          setTargetTerritory(null);
        }}
        onActionComplete={() => {
          refetchTerritoryBalance();
          refetchExistsList();
          refetchOwners();
        }}
        onOpenProfile={(owner) => {
          const profileUrl = `#/profile/${owner}`;
          window.open(profileUrl, "_blank", "noopener,noreferrer");
        }}
      />
    </div>
  );
}
