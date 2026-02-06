export interface ContractTerritory {
  id: number;
  svgId: string;
}

// Contract-only territories: keep IDs aligned with on-chain token IDs.
export const CONTRACT_TERRITORIES: ContractTerritory[] = [
  { id: 0, svgId: "CA" },
  { id: 1, svgId: "RU" },
  { id: 2, svgId: "CN" },
  { id: 3, svgId: "US" },
  { id: 4, svgId: "IN" },
  { id: 5, svgId: "EG" },
  { id: 6, svgId: "BR" },
  { id: 7, svgId: "AR" },
  { id: 8, svgId: "ZA" },
  { id: 9, svgId: "AU" },
];

import worldSvg from "../assets/world.svg?raw";

function extractSvgCodes(svg: string) {
  const codes = new Set<string>();
  const regex = /id="([A-Z]{2})"/g;
  let match;
  while ((match = regex.exec(svg)) !== null) {
    codes.add(match[1]);
  }
  return codes;
}

export const SVG_TERRITORY_CODES = extractSvgCodes(worldSvg);
export const SVG_TERRITORY_COUNT = SVG_TERRITORY_CODES.size;
