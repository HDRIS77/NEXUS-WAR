/* Design: Atlas Operations — real country geometry becomes the primary decision surface with restrained operational overlays. */
import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldTopology from "world-atlas/countries-110m.json";

type Props = { selectedId: string; onSelect: (countryId: string, countryName: string) => void; ownership: Record<string, string>; pulse?: { x: number; y: number; color: string } | null; aiAttack?: { attacker: string; target: string; x: number; y: number; phase: string } | null; detailNodes?: { name: string; x: number; y: number }[] };

const countryAliases: Record<string, string> = { Egypt: "مصر", Turkey: "تركيا", France: "فرنسا", Brazil: "البرازيل", India: "الهند", Australia: "أستراليا" };

export default function WorldMap({ selectedId, onSelect, ownership, pulse, aiAttack, detailNodes = [] }: Props) {
  const [zoom, setZoom] = useState(1);
  const countries = useMemo(() => { const collection = feature(worldTopology as never, (worldTopology.objects as never as { countries: never }).countries); return (collection as never as { features: never[] }).features; }, []);
  const projection = useMemo(() => geoMercator().scale(122 * zoom).translate([480, 245]), [zoom]);
  const path = useMemo(() => geoPath(projection), [projection]);
  return <div className="real-map-layer">
    <svg className="real-map-svg" viewBox="0 0 960 490" role="img" aria-label="خريطة العالم السياسية التفاعلية">
      <defs><filter id="map-shadow"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#061116" floodOpacity=".6" /></filter><pattern id="geo-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#d8d9c5" strokeOpacity=".1" strokeWidth="1" /></pattern></defs>
      <rect width="960" height="490" fill="url(#geo-grid)" />
      <g filter="url(#map-shadow)">{countries.map((country, index) => { const properties = (country as { properties?: { name?: string } }).properties; const name = properties?.name ?? `country-${index}`; const label = countryAliases[name] ?? name; const mapId = String((country as { id?: string }).id ?? index); const isSelected = mapId === selectedId; return <path key={`country-feature-${mapId}-${index}`} d={path(country as never) ?? ""} className={`country-shape country-${ownership[mapId] ?? "neutral"} ${isSelected ? "country-selected" : ""}`} onClick={() => onSelect(mapId, label)} aria-label={label}><title>{label}</title></path>; })}</g>
      <g className="geo-route-lines"><path d="M430 245 C530 220 622 210 738 246" /><path d="M430 245 C490 275 582 302 674 347" /><path d="M429 245 C358 233 298 255 246 304" /></g>
      {zoom >= 1.65 && detailNodes.length > 0 && <g className="map-detail-nodes">{detailNodes.map((node, index) => <g key={`detail-node-${node.name}-${index}`}><circle cx={node.x} cy={node.y} r="5" /><text x={node.x + 8} y={node.y - 7}>{node.name}</text></g>)}</g>}
      {aiAttack && <g className="ai-attack-visual"><path d={`M180 120 Q${aiAttack.x - 90} ${aiAttack.y - 35} ${aiAttack.x} ${aiAttack.y}`} /><circle cx={aiAttack.x} cy={aiAttack.y} r="8" /><text x={aiAttack.x + 12} y={aiAttack.y - 12}>{aiAttack.phase} / {aiAttack.attacker}</text></g>}
      {pulse && <g className="map-event-pulse" style={{ transform: `translate(${pulse.x}px, ${pulse.y}px)` }}><circle r="7" /><circle r="18" /><circle r="30" /></g>}
    </svg>
    <div className="map-zoom"><button onClick={() => setZoom((value) => Math.min(3.2, value + .15))}>＋</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.max(.75, value - .15))}>−</button></div>
  </div>;
}
