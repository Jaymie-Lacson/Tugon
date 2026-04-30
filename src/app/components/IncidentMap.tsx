import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle, Polygon, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import { Incident, incidentTypeConfig } from '../data/incidents';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';

// ── Tile layer URLs ───────────────────────────────────────────────────────────
// CARTO CDN with WebP tiles (transparent conversion — ~40–55 % smaller than PNG).
// WebP is served when the URL ends in .webp regardless of {s} subdomain.
const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.webp',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.webp',
};

const TILE_ATTRIBUTIONS = {
  light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

// ── Leaflet default-icon fix for Vite bundler ──────────────────────────────
// Vite mangles asset paths, so we use DivIcon for all markers instead.

const TYPE_COLORS: Record<string, string> = {
  flood:          '#1D4ED8',
  accident:       'var(--severity-medium)',
  medical:        '#0F766E',
  crime:          '#7C3AED',
  infrastructure: '#374151',
  typhoon:        '#0369A1',
};

// Barangay-specific colors for map polygons (matching landing page SVG)
const BARANGAY_COLORS: Record<string, { stroke: string; fill: string; fillOpacity: number }> = {
  '251': { stroke: '#b91c1c', fill: '#b91c1c', fillOpacity: 0.18 },
  '252': { stroke: '#865300', fill: '#feb94c', fillOpacity: 0.22 },
  '256': { stroke: '#0F766E', fill: '#0f766e', fillOpacity: 0.18 },
};

function getTypeIconSvg(type: string, stroke: string): string {
  switch (type) {
    case 'flood':
      return `<path d="M12 3c-2.6 3.5-5.7 6.2-5.7 9.6 0 3.2 2.4 5.6 5.7 5.6s5.7-2.4 5.7-5.6C17.7 9.2 14.6 6.5 12 3z" fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linejoin="round"/><path d="M4.8 19.2c1 .7 2 .9 3 .9s2-.2 3-.9c1-.7 2-.7 3 0 1 .7 2 .9 3 .9" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>`;
    case 'accident':
      return `<rect x="4.5" y="10" width="15" height="5.8" rx="1.4" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M7.2 10l2-2.3h5.7l2 2.3" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/><circle cx="8.3" cy="16.8" r="1.5" fill="${stroke}"/><circle cx="15.7" cy="16.8" r="1.5" fill="${stroke}"/>`;
    case 'medical':
      return `<circle cx="12" cy="12" r="7" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M12 8.4v7.2M8.4 12h7.2" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'crime':
      return `<path d="M12 3.3l6.8 2.8v4.5c0 5-3.1 8.1-6.8 10.3-3.7-2.2-6.8-5.3-6.8-10.3V6.1L12 3.3z" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/><path d="M12 8.1v4.9" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="15.8" r="1.2" fill="${stroke}"/>`;
    case 'infrastructure':
      return `<path d="M12 4.5l8 14H4l8-14z" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/><path d="M12 9.1v4.9" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.4" r="1.1" fill="${stroke}"/>`;
    case 'typhoon':
      return `<path d="M7.1 8.8c1.2-1.8 3.9-2.3 5.9-.9 1.7 1.1 2.2 3.2 1.4 4.9-.9 1.8-2.9 2.7-4.8 2.3" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/><path d="M16.9 15.2c-1.2 1.8-3.9 2.3-5.9.9-1.7-1.1-2.2-3.2-1.4-4.9.9-1.8 2.9-2.7 4.8-2.3" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.4" fill="${stroke}"/>`;
    default:
      return `<circle cx="12" cy="12" r="5" fill="none" stroke="${stroke}" stroke-width="2.1"/><path d="M12 7v2m0 6v2m5-5h-2M9 12H7" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round"/>`;
  }
}

function getTypeIconMarkup(type: string, size: number, stroke: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${getTypeIconSvg(type, stroke)}</svg>`;
}

function makeIncidentIcon(incident: Incident, selected: boolean, hovered: boolean): L.DivIcon {
  const color  = incident.status === 'resolved'
    ? '#9CA3AF'
    : (TYPE_COLORS[incident.type] ?? '#374151');
  const isCritical = incident.severity === 'critical' && incident.status !== 'resolved';
  const isActive   = incident.status === 'active' || incident.status === 'responding';
  const size       = selected || hovered ? 38 : (isCritical ? 34 : 30);
  const pulse      = isActive && isCritical;

  const html = `
    <div style="
      position:relative;
      width:${size}px;
      height:${size + 8}px;
      display:flex;
      flex-direction:column;
      align-items:center;
    ">
      ${pulse ? `
        <div style="
          position:absolute;
          top:0; left:0; right:0; bottom:8px;
          border-radius:50%;
          background:${color};
          opacity:0.2;
          animation:tugon-ping 1.8s ease-out infinite;
        "></div>` : ''}
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${color};
        border:${selected ? '3px solid white' : '2px solid rgba(255,255,255,0.85)'};
        box-shadow:${selected ? `0 0 0 3px ${color}, 0 4px 12px rgba(0,0,0,0.35)` : '0 2px 8px rgba(0,0,0,0.28)'};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:${size * 0.44}px;
        cursor:pointer;
        transition:all 0.15s;
        position:relative;
      ">
        ${getTypeIconMarkup(incident.type, Math.round(size * 0.66), '#FFFFFF')}
      </div>
      <div style="
        width:0; height:0;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-top:8px solid ${color};
        margin-top:-1px;
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize:   [size, size + 8],
    iconAnchor: [size / 2, size + 8],
  });
}

// ── Map-pan helper when selected changes ──────────────────────────────────
function MapPanner({ incident }: { incident: Incident | null }) {
  const map = useMap();

  useEffect(() => {
    if (incident) {
      // Force-center the selected pin so side-panel selections always bring it to map center.
      map.setView([incident.lat, incident.lng], map.getZoom(), { animate: true });
    }
  }, [incident, map]);

  return null;
}

function buildViewportSignature(incidents: Incident[]): string {
  return incidents
    .map((incident) => `${incident.id}:${incident.lat.toFixed(6)},${incident.lng.toFixed(6)}`)
    .sort()
    .join('|');
}

function extractBarangayCode(label: string): string | null {
  const match = label.match(/\b(251|252|256)\b/);
  return match ? match[1] : null;
}

function resolveViewportPoints(incidents: Incident[]): L.LatLng[] {
  const incidentPoints = incidents.map((incident) => L.latLng(incident.lat, incident.lng));
  if (incidents.length === 0) {
    return incidentPoints;
  }

  const barangayCodes = new Set(
    incidents
      .map((incident) => extractBarangayCode(incident.barangay))
      .filter((code): code is string => Boolean(code)),
  );

  if (barangayCodes.size !== 1) {
    return incidentPoints;
  }

  const [barangayCode] = Array.from(barangayCodes);
  const barangayPolygon = BARANGAY_POLYGONS.find((polygon) => polygon.code === barangayCode);
  if (!barangayPolygon) {
    return incidentPoints;
  }

  const boundaryPoints = barangayPolygon.points.map(([lat, lng]) => L.latLng(lat, lng));
  return [...incidentPoints, ...boundaryPoints];
}

function fitViewportToPoints(map: L.Map, points: L.LatLng[], targetZoom: number) {
  const bounds = L.latLngBounds(points);
  if (!bounds.isValid()) {
    return;
  }

  if (points.length === 1) {
    map.setView(points[0], Math.max(17, targetZoom), { animate: false });
    return;
  }

  map.fitBounds(bounds.pad(0.16), {
    paddingTopLeft: [52, 44],
    paddingBottomRight: [44, 44],
    maxZoom: Math.max(17, targetZoom),
    animate: false,
  });
}

function MapViewportController({
  incidents,
  selectedIncident,
  targetZoom,
  viewportKey,
}: {
  incidents: Incident[];
  selectedIncident: Incident | null;
  targetZoom: number;
  viewportKey: string;
}) {
  const map = useMap();
  const lastFitSignatureRef = useRef('');

  useEffect(() => {
    if (selectedIncident || incidents.length === 0) {
      return;
    }

    const signature = buildViewportSignature(incidents);
    if (signature === lastFitSignatureRef.current) {
      return;
    }

    const points = resolveViewportPoints(incidents);
    fitViewportToPoints(map, points, targetZoom);

    lastFitSignatureRef.current = signature;
  }, [incidents, map, selectedIncident, targetZoom]);

  useEffect(() => {
    if (incidents.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      map.invalidateSize({ animate: false });

      if (selectedIncident) {
        map.setView([selectedIncident.lat, selectedIncident.lng], map.getZoom(), { animate: false });
        return;
      }

      const points = resolveViewportPoints(incidents);
      fitViewportToPoints(map, points, targetZoom);
    }, 360);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [incidents, map, selectedIncident, targetZoom, viewportKey]);

  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────
export interface IncidentMapProps {
  incidents: Incident[];
  height?: number | string;
  selectedId?: string | null;
  onSelectIncident?: (incident: Incident | null) => void;
  compact?: boolean;
  zoom?: number;
  heatmapClusters?: HeatmapClusterOverlay[];
  showSelectedPopup?: boolean;
  renderMode?: 'standard' | 'hotspot';
  heatmapRadiusPercent?: number;
  heatmapOpacityPercent?: number;
  interactive?: boolean;
  viewportKey?: string;
  showMarkerTooltip?: boolean;
  showIncidentGlow?: boolean;
  forceLight?: boolean;
}

export interface HeatmapClusterOverlay {
  id: string;
  latitude: number;
  longitude: number;
  intensity: number;
  incidentCount: number;
  incidentType: string;
}

const TONDO_TRI_BRGY_CENTER: [number, number] = [14.61495, 120.97795];
const TONDO_TRI_BRGY_BOUNDS: [[number, number], [number, number]] = [
  [14.61345, 120.97645],
  [14.61675, 120.97965],
];
const INCIDENT_MAP_MAX_ZOOM = 20;

const BARANGAY_POLYGONS: Array<{ code: string; name: string; points: [number, number][] }> = [
  {
    code: '251',
    name: 'Barangay 251',
    points: [
      [14.6151576, 120.9778668],
      [14.6151269, 120.9780734],
      [14.6138576, 120.9777379],
      [14.6138881, 120.9775742],
      [14.6139514, 120.9772961],
      [14.6139695, 120.9771491],
      [14.6140086, 120.9771571],
      [14.6152725, 120.977463],
      [14.6151576, 120.9778668],
    ],
  },
  {
    code: '252',
    name: 'Barangay 252',
    points: [
      [14.6152725, 120.977463],
      [14.6140086, 120.9771571],
      [14.6139695, 120.9771491],
      [14.6138726, 120.9771203],
      [14.6138888, 120.9770354],
      [14.6137142, 120.9769944],
      [14.6137978, 120.9766256],
      [14.6140525, 120.9766893],
      [14.6146931, 120.9768373],
      [14.6153845, 120.9770152],
      [14.6152725, 120.977463],
    ],
  },
  {
    code: '256',
    name: 'Barangay 256',
    points: [
      [14.6165934, 120.9785196],
      [14.6165675, 120.9787716],
      [14.6164604, 120.9788136],
      [14.616355, 120.9788522],
      [14.616179, 120.9789493],
      [14.6159963, 120.9790463],
      [14.6157071, 120.9791867],
      [14.6155382, 120.9792674],
      [14.6153803, 120.9793486],
      [14.6152404, 120.9794005],
      [14.6151315, 120.9794212],
      [14.6148209, 120.97942],
      [14.6148861, 120.9791266],
      [14.6149511, 120.9788318],
      [14.6149661, 120.9787605],
      [14.6150187, 120.9785164],
      [14.6150567, 120.9783709],
      [14.6150973, 120.9782174],
      [14.6151269, 120.9780734],
      [14.6151576, 120.9778668],
      [14.6157229, 120.9779947],
      [14.616262, 120.9781291],
      [14.6166307, 120.9781571],
      [14.6165934, 120.9785196],
    ],
  },
];

export function IncidentMap({
  incidents,
  height = 380,
  selectedId = null,
  onSelectIncident,
  compact = false,
  zoom = 17,
  heatmapClusters = [],
  showSelectedPopup = false,
  renderMode = 'standard',
  heatmapRadiusPercent = 100,
  heatmapOpacityPercent = 100,
  interactive = true,
  viewportKey = 'default',
  showMarkerTooltip = true,
  showIncidentGlow = true,
  forceLight = false,
}: IncidentMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = !forceLight && resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_URLS.dark : TILE_URLS.light;
  const tileAttribution = isDark ? TILE_ATTRIBUTIONS.dark : TILE_ATTRIBUTIONS.light;

  // Sort: critical first so they render on top
  const sorted = [...incidents].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[b.severity] ?? 3) - (order[a.severity] ?? 3);
  });
  const isHotspotMode = renderMode === 'hotspot' && heatmapClusters.length > 0;
  const clampedRadiusPercent = Math.max(50, Math.min(100, heatmapRadiusPercent));
  const uniqueLegendKeys = Object.keys(incidentTypeConfig).filter((key, idx, arr) =>
    arr.findIndex(k => getCategoryLabelForIncidentType(k as Incident['type']) === getCategoryLabelForIncidentType(key as Incident['type'])) === idx
  );
  const clampedOpacityPercent = Math.max(50, Math.min(120, heatmapOpacityPercent));
  const heatRadiusScale = 0.1 + ((clampedRadiusPercent - 50) / 50) * 0.9;
  const heatOpacityScale = 0.2 + ((clampedOpacityPercent - 50) / 70) * 1.3;
  const glowRadiusScale = 0.35 + ((clampedRadiusPercent - 50) / 50) * 0.65;
  const glowOpacityScale = 0.55 + ((clampedOpacityPercent - 50) / 70) * 0.95;
  const selectedIncident = incidents.find((incident) => incident.id === selectedId) ?? null;
  const markerIncidents = isHotspotMode
    ? (selectedIncident ? [selectedIncident] : [])
    : sorted;

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer
        center={TONDO_TRI_BRGY_CENTER}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={!compact}
        attributionControl={true}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        maxBounds={TONDO_TRI_BRGY_BOUNDS}
        maxBoundsViscosity={1}
        minZoom={16}
        maxZoom={INCIDENT_MAP_MAX_ZOOM}
      >
        <TileLayer
          key={isDark ? 'dark-tiles' : 'light-tiles'}
          attribution={tileAttribution}
          url={tileUrl}
          maxNativeZoom={20}
          maxZoom={INCIDENT_MAP_MAX_ZOOM}
          detectRetina
          crossOrigin={true}
        />

        {/* Official barangay boundaries */}
        {BARANGAY_POLYGONS.map((barangay) => {
          const brgyColor = BARANGAY_COLORS[barangay.code] || { stroke: 'var(--primary)', fill: '#93C5FD', fillOpacity: 0.08 };
          return (
            <Polygon
              key={barangay.code}
              positions={barangay.points}
              pathOptions={{
                color: brgyColor.stroke,
                weight: isHotspotMode ? 2 : 3,
                dashArray: '8 6',
                fillColor: brgyColor.fill,
                fillOpacity: isHotspotMode ? brgyColor.fillOpacity * 0.5 : brgyColor.fillOpacity,
              }}
            >
              <Tooltip direction="center" permanent>
                {barangay.name}
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Auto-pan when selected changes */}
        <MapPanner incident={selectedIncident} />

        {/* Auto-fit viewport for the visible data scope (including single-barangay official views). */}
        <MapViewportController incidents={sorted} selectedIncident={selectedIncident} targetZoom={zoom} viewportKey={viewportKey} />

        {/* Soft glow circles for active incidents */}
        {showIncidentGlow && !isHotspotMode && sorted
          .filter(inc => inc.status === 'active' || inc.status === 'responding')
          .map(inc => (
            <Circle
              key={`glow-${inc.id}`}
              center={[inc.lat, inc.lng]}
              radius={Math.max(14, (inc.severity === 'critical' ? 80 : 55) * glowRadiusScale)}
              pathOptions={{
                color: TYPE_COLORS[inc.type] ?? '#374151',
                fillColor: TYPE_COLORS[inc.type] ?? '#374151',
                fillOpacity: Math.max(0.03, Math.min(0.4, 0.12 * glowOpacityScale)),
                weight: 1,
                opacity: 0.4,
              }}
            />
          ))}

        {/* Heatmap hotspot circles (official analytics overlay) */}
        {heatmapClusters.map((cluster) => {
          const normalizedType = cluster.incidentType.toLowerCase();
          const color =
            TYPE_COLORS[normalizedType] ??
            (cluster.incidentType === 'Road Hazard' ? TYPE_COLORS.accident :
              cluster.incidentType === 'Pollution' ? TYPE_COLORS.flood :
                  cluster.incidentType === 'Crime' ? TYPE_COLORS.crime :
                    TYPE_COLORS.infrastructure);
          const radius = isHotspotMode
            ? Math.max(18, Math.round((70 + cluster.intensity * 58 + cluster.incidentCount * 2) * heatRadiusScale))
            : Math.max(14, Math.round((45 + cluster.intensity * 45) * heatRadiusScale));
          const hotspotBaseOpacity = 0.11 + Math.min(0.22, cluster.intensity * 0.04 + cluster.incidentCount * 0.003);
          const standardBaseOpacity = 0.08 + Math.min(0.16, cluster.intensity * 0.03 + cluster.incidentCount * 0.002);

          return (
            <Circle
              key={`heat-${cluster.id}`}
              center={[cluster.latitude, cluster.longitude]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isHotspotMode
                  ? Math.max(0.04, Math.min(0.72, hotspotBaseOpacity * heatOpacityScale))
                  : Math.max(0.03, Math.min(0.56, standardBaseOpacity * heatOpacityScale)),
                weight: isHotspotMode ? 2 : 1,
                opacity: isHotspotMode ? 0.7 : 0.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                <div style={{ fontSize: 11, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    {cluster.incidentType} hotspot
                  </div>
                  <div style={{ marginBottom: 2 }}>
                    {cluster.incidentCount} incidents (intensity {cluster.intensity.toFixed(2)})
                  </div>
                </div>
              </Tooltip>
            </Circle>
          );
        })}

        {/* Incident markers */}
        {markerIncidents.map(inc => {
          const selected = inc.id === selectedId;
          const icon = makeIncidentIcon(inc, selected, false);
          return (
            <Marker
              key={inc.id}
              position={[inc.lat, inc.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectIncident?.(selected ? null : inc),
                popupclose: () => onSelectIncident?.(null),
              }}
              zIndexOffset={selected ? 1000 : inc.severity === 'critical' ? 500 : 0}
            >
              {showSelectedPopup ? (
                <Popup
                  autoPan
                  closeButton
                >
                  <div style={{ minWidth: 180, maxWidth: 240, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 2 }}>{inc.id}</div>
                    <div style={{ color: '#475569', marginBottom: 6 }}>{inc.location}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span
                        style={{
                          background: incidentTypeConfig[inc.type].bgColor,
                          color: incidentTypeConfig[inc.type].color,
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {getCategoryLabelForIncidentType(inc.type)}
                      </span>
                      <span style={{ color: TYPE_COLORS[inc.type], fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>
                        {inc.severity}
                      </span>
                    </div>
                    <div style={{ color: '#64748B', fontSize: 11 }}>
                      {inc.barangay} · {new Date(inc.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </Popup>
              ) : null}
              {!compact && showMarkerTooltip && (
                <Tooltip
                  direction="top"
                  offset={[0, -30]}
                  opacity={1}
                  permanent={false}
                >
                  <div style={{ fontSize: 12, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{inc.id}</div>
                    <div style={{ marginBottom: 2 }}>{inc.barangay}</div>
                    <div style={{ color: TYPE_COLORS[inc.type], fontWeight: 600, textTransform: 'capitalize' }}>
                      {getCategoryLabelForIncidentType(inc.type)} · {inc.severity}
                    </div>
                  </div>
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend — only when not compact */}
      {!compact && (
        <div className="incident-map-legend-overlay" style={{
          position: 'absolute',
          bottom: 28,
          right: 10,
          zIndex: 1000,
          background: isDark ? 'rgba(9, 23, 40, 0.95)' : 'rgba(255,255,255,0.97)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 10,
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.18)',
          minWidth: 115,
          border: isDark ? '1px solid var(--outline-variant)' : '1px solid #E2E8F0',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--on-surface)', marginBottom: 5, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isHotspotMode ? 'Hotspot Intensity' : 'Incident Categories'}
          </div>
          {isHotspotMode ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--severity-critical)', opacity: 0.72, display: 'inline-block' }} />
                <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>Hotspot cluster zone</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', opacity: 0.55, display: 'inline-block' }} />
                <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>Barangay boundary (reference)</span>
              </div>
              <div style={{ marginTop: 5, borderTop: '1px solid var(--outline-variant)', paddingTop: 4 }}>
                <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>Only selected incident pin is shown to reduce clutter.</span>
              </div>
            </>
          ) : uniqueLegendKeys.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: TYPE_COLORS[key] ?? '#334155',
                  background: `${TYPE_COLORS[key] ?? '#334155'}1A`,
                  borderRadius: 6,
                }}
                dangerouslySetInnerHTML={{ __html: getTypeIconMarkup(key, 13, 'currentColor') }}
              />
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>{getCategoryLabelForIncidentType(key as Incident['type'])}</span>
            </div>
          ))}
          {!isHotspotMode && (
            <div style={{ marginTop: 5, borderTop: '1px solid var(--outline-variant)', paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9CA3AF', display: 'inline-block' }} />
                <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>Resolved</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile legend section — outside map overlay area */}
      {!compact && (
        <div className="incident-map-legend-mobile" style={{
          display: 'none',
          marginTop: 10,
          background: isDark ? 'rgba(9, 23, 40, 0.95)' : 'rgba(255,255,255,0.97)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 10,
          boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.12)',
          border: isDark ? '1px solid var(--outline-variant)' : '1px solid #E2E8F0',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--on-surface)', marginBottom: 5, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incident Categories</div>
          {uniqueLegendKeys.map((key) => (
            <div key={`mobile-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: TYPE_COLORS[key] ?? '#334155',
                  background: `${TYPE_COLORS[key] ?? '#334155'}1A`,
                  borderRadius: 6,
                }}
                dangerouslySetInnerHTML={{ __html: getTypeIconMarkup(key, 13, 'currentColor') }}
              />
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>{getCategoryLabelForIncidentType(key as Incident['type'])}</span>
            </div>
          ))}
          <div style={{ marginTop: 5, borderTop: '1px solid var(--outline-variant)', paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9CA3AF', display: 'inline-block' }} />
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 9 }}>Resolved</span>
            </div>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes tugon-ping {
          0%   { transform: scale(1);   opacity: 0.22; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        @media (max-width: 768px) {
          .incident-map-legend-overlay {
            display: none !important;
          }

          .incident-map-legend-mobile {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
