import { useEffect, useMemo, useRef } from "react";
import worldSvg from "../assets/world.svg?raw";

type SvgTerritory = {
  code: string;
  name: string;
  svgId: string;
};

interface SvgRiskMapProps {
  territories: SvgTerritory[];
  selectedTerritory: string | null;
  targetTerritory: string | null;
  neighborIds: Set<string>;
  claimedCodes: Set<string>;
  onSelect: (code: string) => void;
}

const WORLD_VIEWBOX = "0 0 1009.6727 665.96301";
const COLOR_DEFAULT = "#f8fafc";
const COLOR_SELECTED = "#fbbf24";
const COLOR_NEIGHBOR = "#ef4444";
const COLOR_CLAIMED = "#9ca3af";
const COLOR_BORDER = "rgba(10, 15, 30, 0.9)";
const COLOR_BORDER_FAINT = "rgba(10, 15, 30, 0.45)";
const COLOR_BASE = "rgba(255,255,255,0.08)";
const STROKE_BASE = "rgba(255,255,255,0.15)";

function SvgRiskMap({
  territories,
  selectedTerritory,
  targetTerritory,
  neighborIds,
  claimedCodes,
  onSelect,
}: SvgRiskMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const svgMarkup = useMemo(() => {
    return worldSvg.replace(
      "<svg",
      `<svg viewBox="${WORLD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">`,
    );
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    const territoryBySvgId = new Map(territories.map((territory) => [territory.svgId, territory]));

    svg.querySelectorAll<SVGPathElement>("path").forEach((path) => {
      const territory = territoryBySvgId.get(path.id);
      if (!territory) {
        path.style.fill = COLOR_BASE;
        path.style.stroke = STROKE_BASE;
        path.style.strokeWidth = "0.8";
        path.style.opacity = "0.5";
        path.style.cursor = "default";
        path.removeAttribute("data-territory-code");
        return;
      }

      const isSelected = selectedTerritory === territory.code;
      const isNeighbor = neighborIds.has(territory.code);
      const isTarget = targetTerritory === territory.code;

      const fill = isSelected
        ? COLOR_SELECTED
        : isNeighbor || isTarget
          ? COLOR_NEIGHBOR
          : claimedCodes.has(territory.code)
            ? COLOR_CLAIMED
            : COLOR_DEFAULT;

      const stroke = isSelected || isNeighbor || isTarget ? COLOR_BORDER : COLOR_BORDER_FAINT;

      const strokeWidth = isSelected || isNeighbor || isTarget ? 1.1 : 0.5;
      const opacity = selectedTerritory !== null && !isSelected && !isNeighbor && !isTarget ? 0.45 : 1;

      path.style.fill = fill;
      path.style.stroke = stroke;
      path.style.strokeWidth = `${strokeWidth}`;
      path.style.opacity = `${opacity}`;
      path.style.strokeLinejoin = "round";
      path.style.cursor = "pointer";
      path.style.transition = "fill 0.2s ease, stroke 0.2s ease, opacity 0.2s ease";
      path.style.vectorEffect = "non-scaling-stroke";
      path.setAttribute("data-territory-code", territory.code);
    });

  }, [territories, selectedTerritory, targetTerritory, neighborIds, claimedCodes]);

  return (
    <div
      ref={wrapperRef}
      onClick={(event) => {
        const target = event.target as SVGPathElement | null;
        if (!target) return;
        const territoryCode = target.getAttribute("data-territory-code");
        if (!territoryCode) return;
        onSelect(territoryCode);
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle at top, #101b3b 0%, #0b1024 60%)",
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
    </div>
  );
}

export default SvgRiskMap;
