import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Layers, AlertTriangle, Clock, CheckCircle2, Users, Navigation, RefreshCw, Save,
  Filter,
} from 'lucide-react';
import { barangays as fallbackBarangays, mapIncidents, heatCircles } from '../../data/superAdminData';
import { superAdminApi } from '../../services/superAdminApi';
import type { BarangayProfile } from '../../data/superAdminData';

// ── Incident type styling ────────────────────────────────────────────────────
const INCIDENT_COLORS: Record<string, string> = {
  fire: '#B91C1C', flood: '#1D4ED8', accident: '#B4730A',
  medical: '#0F766E', crime: '#374151', infrastructure: '#374151',
};
const INCIDENT_EMOJI: Record<string, string> = {
  fire: '🔥', flood: '💧', accident: '🚗',
  medical: '❤️', crime: '🔒', infrastructure: '⚡',
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#B91C1C', high: '#EA580C', medium: '#B4730A', low: '#059669',
};

// ── Custom DivIcon factory ───────────────────────────────────────────────────
function makeIcon(type: string, severity: string, selected: boolean): L.DivIcon {
  const color  = INCIDENT_COLORS[type] ?? '#374151';
  const sColor = SEVERITY_COLORS[severity] ?? color;
  const size   = selected ? 38 : (severity === 'critical' ? 34 : 30);
  const pulse  = severity === 'critical';

  const html = `
    <div style="position:relative;width:${size}px;height:${size + 8}px;display:flex;flex-direction:column;align-items:center;">
      ${pulse ? `<div style="position:absolute;top:0;left:0;right:0;bottom:8px;border-radius:50%;background:${color};opacity:.18;animation:sa-ping 1.8s ease-out infinite;"></div>` : ''}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${selected ? `3px solid white` : '2px solid rgba(255,255,255,.85)'};box-shadow:${selected ? `0 0 0 3px ${sColor},0 4px 14px rgba(0,0,0,.35)` : '0 2px 8px rgba(0,0,0,.28)'};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.42)}px;cursor:pointer;">
        ${INCIDENT_EMOJI[type] ?? '📍'}
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-1px;"></div>
    </div>`;

  return L.divIcon({ html, className: '', iconSize: [size, size + 8], iconAnchor: [size / 2, size + 8] });
}

// ── Map zoom controller ──────────────────────────────────────────────────────
function ZoomController() {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', top: 80, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[
        { label: '+', action: () => map.zoomIn() },
        { label: '−', action: () => map.zoomOut() },
        { label: '⌂', action: () => map.flyTo([14.61495, 120.97795], 18, { animate: true }) },
      ].map(btn => (
        <button
          key={btn.label}
          onClick={btn.action}
          style={{
            width: 32, height: 32, border: '1px solid #E5E7EB', borderRadius: 6,
            background: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 700,
            color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >{btn.label}</button>
      ))}
    </div>
  );
}

function MapBoundaryEditor({
  active,
  onAddPoint,
}: {
  active: boolean;
  onAddPoint: (point: [number, number]) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (!active) {
        return;
      }
      onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

const TONDO_TRI_BRGY_CENTER: [number, number] = [14.61495, 120.97795];
const BOUNDARY_EDIT_ENABLED = false;

const alertLevelConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal:   { label: 'NORMAL',   color: '#059669', bg: '#D1FAE5' },
  elevated: { label: 'ELEVATED', color: '#B4730A', bg: '#FEF3C7' },
  critical: { label: 'CRITICAL', color: '#B91C1C', bg: '#FEE2E2' },
};

type BarangayMapView = BarangayProfile & {
  code: string;
  boundaryGeojson: string | null;
  source: 'mock' | 'api';
};

function deriveCodeFromId(id: string): string {
  const match = id.match(/\d{3}/);
  return match ? match[0] : '';
}

function boundaryToGeoJsonPolygon(boundary: [number, number][]) {
  const coordinates = boundary.map(([lat, lng]) => [lng, lat]);
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const isClosed = first && last && first[0] === last[0] && first[1] === last[1];
  const ring = isClosed ? coordinates : [...coordinates, first];
  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

function normalizeBoundaryPoints(boundary: [number, number][]): [number, number][] {
  if (boundary.length < 2) {
    return boundary;
  }

  const first = boundary[0];
  const last = boundary[boundary.length - 1];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  return isClosed ? boundary.slice(0, -1) : boundary;
}

function formatBoundaryGeojson(boundary: [number, number][]) {
  return JSON.stringify(boundaryToGeoJsonPolygon(boundary), null, 2);
}

function parseBoundaryGeojsonToBoundary(raw: string | null): [number, number][] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { type?: string; coordinates?: unknown };
    if (!parsed.coordinates || !Array.isArray(parsed.coordinates)) {
      return null;
    }

    const polygon =
      parsed.type === 'MultiPolygon'
        ? parsed.coordinates[0]
        : parsed.type === 'Polygon'
          ? parsed.coordinates
          : null;

    if (!polygon || !Array.isArray(polygon) || !Array.isArray(polygon[0])) {
      return null;
    }

    const ring = polygon[0] as Array<[number, number]>;
    const converted = ring
      .filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2)
      .map(([lng, lat]) => [lat, lng] as [number, number]);

    return converted.length >= 4 ? converted : null;
  } catch {
    return null;
  }
}

function createInitialBarangays(): BarangayMapView[] {
  return fallbackBarangays.map((barangay) => ({
    ...barangay,
    code: deriveCodeFromId(barangay.id),
    boundaryGeojson: JSON.stringify(boundaryToGeoJsonPolygon(barangay.boundary)),
    source: 'mock',
  }));
}

export default function SABarangayMap() {
  const [barangaysData, setBarangaysData] = useState<BarangayMapView[]>(createInitialBarangays());
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [barangaysError, setBarangaysError] = useState<string | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<typeof mapIncidents[0] | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [boundaryDraft, setBoundaryDraft] = useState('');
  const [boundarySaving, setBoundarySaving] = useState(false);
  const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [boundaryEditMode, setBoundaryEditMode] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>([]);

  const selectedBrgy = barangaysData.find(b => b.id === selectedBarangay);
  const filteredIncidents = filterType === 'all' ? mapIncidents : mapIncidents.filter(i => i.type === filterType);

  const loadBarangays = async () => {
    setLoadingBarangays(true);
    setBarangaysError(null);
    try {
      const payload = await superAdminApi.getBarangays();
      const fallbackByCode = new Map(fallbackBarangays.map((barangay) => [deriveCodeFromId(barangay.id), barangay]));
      const defaultFallback = fallbackBarangays[0];
      const mapped = payload.barangays.map((apiBarangay) => {
        const fallback = fallbackByCode.get(apiBarangay.code);
        const parsedBoundary = parseBoundaryGeojsonToBoundary(apiBarangay.boundaryGeojson);
        const boundary = parsedBoundary ?? fallback?.boundary ?? defaultFallback.boundary;
        const color = fallback?.color ?? '#1E3A8A';
        const activeIncidents = apiBarangay.activeReports;
        const responseRate = apiBarangay.totalReports > 0
          ? Math.max(0, Math.min(100, Math.round(((apiBarangay.totalReports - activeIncidents) / apiBarangay.totalReports) * 100)))
          : (fallback?.responseRate ?? 100);

        return {
          ...(fallback ?? defaultFallback),
          id: fallback?.id ?? `brgy${apiBarangay.code}`,
          code: apiBarangay.code,
          name: `Barangay ${apiBarangay.code}`,
          color,
          boundary,
          center: fallback?.center ?? boundary[0],
          activeIncidents,
          totalThisMonth: apiBarangay.totalReports,
          resolvedThisMonth: Math.max(apiBarangay.totalReports - activeIncidents, 0),
          responseRate,
          responders: apiBarangay.officialCount,
          registeredUsers: apiBarangay.citizenCount,
          boundaryGeojson: apiBarangay.boundaryGeojson,
          source: 'api' as const,
        };
      });

      setBarangaysData(mapped.length > 0 ? mapped : createInitialBarangays());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load barangay data.';
      setBarangaysError(message);
    } finally {
      setLoadingBarangays(false);
    }
  };

  useEffect(() => {
    void loadBarangays();
  }, []);

  useEffect(() => {
    if (!selectedBrgy) {
      setBoundaryDraft('');
      setBoundaryMessage(null);
      setBoundaryError(null);
      return;
    }

    const fallbackGeojson = JSON.stringify(boundaryToGeoJsonPolygon(selectedBrgy.boundary), null, 2);
    if (selectedBrgy.boundaryGeojson) {
      try {
        setBoundaryDraft(JSON.stringify(JSON.parse(selectedBrgy.boundaryGeojson), null, 2));
      } catch {
        setBoundaryDraft(fallbackGeojson);
      }
    } else {
      setBoundaryDraft(fallbackGeojson);
    }
    setBoundaryPoints(normalizeBoundaryPoints(selectedBrgy.boundary));
    setBoundaryEditMode(false);
    setBoundaryMessage(null);
    setBoundaryError(null);
  }, [selectedBrgy?.id]);

  const syncDraftFromPoints = (points: [number, number][]) => {
    if (points.length < 3) {
      setBoundaryError('Boundary requires at least 3 points.');
      return;
    }
    setBoundaryDraft(formatBoundaryGeojson(points));
    setBoundaryError(null);
  };

  const handleAddBoundaryPoint = (point: [number, number]) => {
    if (!BOUNDARY_EDIT_ENABLED) {
      return;
    }
    setBoundaryMessage(null);
    setBoundaryError(null);
    setBoundaryPoints((current) => {
      const next = [...current, point];
      if (next.length >= 3) {
        setBoundaryDraft(formatBoundaryGeojson(next));
      }
      return next;
    });
  };

  const handleUndoBoundaryPoint = () => {
    if (!BOUNDARY_EDIT_ENABLED) {
      return;
    }
    setBoundaryMessage(null);
    setBoundaryError(null);
    setBoundaryPoints((current) => {
      if (current.length === 0) {
        return current;
      }
      const next = current.slice(0, -1);
      if (next.length >= 3) {
        setBoundaryDraft(formatBoundaryGeojson(next));
      }
      return next;
    });
  };

  const handleResetBoundaryPoints = () => {
    if (!BOUNDARY_EDIT_ENABLED) {
      return;
    }
    if (!selectedBrgy) {
      return;
    }
    const resetPoints = normalizeBoundaryPoints(selectedBrgy.boundary);
    setBoundaryPoints(resetPoints);
    setBoundaryDraft(formatBoundaryGeojson(resetPoints));
    setBoundaryMessage(null);
    setBoundaryError(null);
  };

  const handleApplyPointsToDraft = () => {
    if (!BOUNDARY_EDIT_ENABLED) {
      return;
    }
    syncDraftFromPoints(boundaryPoints);
  };

  const handleSaveBoundary = async () => {
    if (!BOUNDARY_EDIT_ENABLED) {
      setBoundaryError('Boundary editing is locked. Contact an administrator to update boundaries.');
      return;
    }
    if (!selectedBrgy) {
      return;
    }

    setBoundarySaving(true);
    setBoundaryMessage(null);
    setBoundaryError(null);
    try {
      const parsed = JSON.parse(boundaryDraft);
      await superAdminApi.updateBarangayBoundary(selectedBrgy.code, parsed);
      await loadBarangays();
      setBoundaryMessage(`Boundary saved for Barangay ${selectedBrgy.code}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save boundary.';
      setBoundaryError(message);
    } finally {
      setBoundarySaving(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#F0F4FF', minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>Barangay Boundary Map</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            OpenStreetMap — Barangays 251, 252 & 256 · Municipality of Tugon, Region IV-A
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              void loadBarangays();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'white',
              color: '#374151',
              border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <RefreshCw size={13} /> {loadingBarangays ? 'Syncing...' : 'Sync Boundaries'}
          </button>
          <button
            onClick={() => setShowHeatmap(h => !h)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showHeatmap ? '#1E3A8A' : 'white',
              color: showHeatmap ? 'white' : '#374151',
              border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <Layers size={13} /> {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
          </button>
        </div>
      </div>

      {barangaysError ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#B91C1C', fontSize: 12, padding: '10px 12px' }}>
          {barangaysError}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 296px', gap: 14 }}>
        {/* ── OSM Map ── */}
        <div style={{
          background: 'white', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,.08)', border: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', flexWrap: 'wrap',
          }}>
            <Filter size={13} color="#6B7280" />
            <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 600 }}>Filter:</span>
            {['all', 'fire', 'flood', 'accident', 'medical', 'crime'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid transparent', textTransform: 'capitalize',
                  background: filterType === t ? (INCIDENT_COLORS[t] ?? '#374151') : '#F3F4F6',
                  color: filterType === t ? 'white' : '#6B7280',
                }}
              >
                {INCIDENT_EMOJI[t] ?? ''} {t === 'all' ? 'All Types' : t}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', color: '#9CA3AF', fontSize: 11 }}>
              {filteredIncidents.length} incidents shown
            </span>
            {BOUNDARY_EDIT_ENABLED && boundaryEditMode && selectedBrgy ? (
              <span style={{ color: '#1D4ED8', fontSize: 11, fontWeight: 600 }}>
                Edit mode: click map to add boundary points for {selectedBrgy.name}
              </span>
            ) : null}
          </div>

          {/* Map */}
          <div style={{ position: 'relative', flex: 1, minHeight: 500 }}>
            <MapContainer
              center={TONDO_TRI_BRGY_CENTER}
              zoom={18}
              style={{ width: '100%', height: '100%', minHeight: 500 }}
              zoomControl={false}
              attributionControl={true}
              scrollWheelZoom={true}
            >
              {/* OSM tiles */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {/* Barangay boundary polygons */}
              {barangaysData.map(b => (
                <Polygon
                  key={b.id}
                  positions={b.boundary}
                  pathOptions={{
                    color: b.color,
                    fillColor: b.color,
                    fillOpacity: selectedBarangay === b.id ? 0.22 : 0.10,
                    weight: selectedBarangay === b.id ? 3 : 2,
                    dashArray: undefined,
                  }}
                  eventHandlers={{
                    click: () => setSelectedBarangay(selectedBarangay === b.id ? null : b.id),
                  }}
                >
                  <Tooltip sticky direction="center" opacity={1}>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: b.color }}>{b.name}</div>
                      <div style={{ color: '#475569' }}>Pop: {b.population.toLocaleString()}</div>
                      <div style={{ color: '#6B7280' }}>Active: {b.activeIncidents} incidents</div>
                    </div>
                  </Tooltip>
                </Polygon>
              ))}

              {BOUNDARY_EDIT_ENABLED && boundaryEditMode && selectedBrgy && boundaryPoints.length >= 3 ? (
                <Polygon
                  positions={boundaryPoints}
                  pathOptions={{
                    color: '#1D4ED8',
                    fillColor: '#1D4ED8',
                    fillOpacity: 0.14,
                    weight: 2,
                    dashArray: '6 6',
                  }}
                />
              ) : null}

              {BOUNDARY_EDIT_ENABLED && boundaryEditMode
                ? boundaryPoints.map((point, index) => (
                    <Circle
                      key={`boundary-point-${index}`}
                      center={point}
                      radius={3}
                      pathOptions={{
                        color: '#1D4ED8',
                        fillColor: '#1D4ED8',
                        fillOpacity: 1,
                        weight: 1,
                      }}
                    />
                  ))
                : null}

              {/* Heatmap circles */}
              {showHeatmap && heatCircles.map((c, i) => (
                <Circle
                  key={`heat-${i}`}
                  center={[c.lat, c.lng]}
                  radius={c.radius}
                  pathOptions={{
                    color: c.color,
                    fillColor: c.color,
                    fillOpacity: c.opacity,
                    weight: 0,
                  }}
                />
              ))}

              {/* Incident markers */}
              {filteredIncidents.map(inc => (
                <Marker
                  key={inc.id}
                  position={[inc.lat, inc.lng]}
                  icon={makeIcon(inc.type, inc.severity, selectedIncident?.id === inc.id)}
                  zIndexOffset={inc.severity === 'critical' ? 500 : 0}
                  eventHandlers={{
                    click: () => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                    <div style={{ fontSize: 11, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 2 }}>{inc.label}</div>
                      <div style={{ color: '#475569' }}>{inc.barangay}</div>
                      <div style={{
                        color: SEVERITY_COLORS[inc.severity], fontWeight: 600,
                        textTransform: 'capitalize', marginTop: 2,
                      }}>
                        {inc.type} · {inc.severity}
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              ))}

              {/* Custom zoom controls */}
              <ZoomController />
              <MapBoundaryEditor active={BOUNDARY_EDIT_ENABLED && boundaryEditMode && Boolean(selectedBrgy)} onAddPoint={handleAddBoundaryPoint} />
            </MapContainer>

            {/* Map legend overlay */}
            <div style={{
              position: 'absolute', bottom: 28, left: 10, zIndex: 1000,
              background: 'rgba(255,255,255,0.97)', borderRadius: 10, padding: '10px 12px',
              boxShadow: '0 2px 10px rgba(0,0,0,.15)', border: '1px solid #E5E7EB', minWidth: 140,
            }}>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>
                Map Legend
              </div>
              {barangaysData.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: b.color, border: `2px solid ${b.color}`, opacity: 0.8 }} />
                  <span style={{ color: '#374151', fontSize: 10 }}>{b.name}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 5, marginTop: 3 }}>
                {Object.entries(INCIDENT_EMOJI).map(([type, emoji]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 11 }}>{emoji}</span>
                    <span style={{ color: '#6B7280', fontSize: 9, textTransform: 'capitalize' }}>{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OSM attribution note */}
            <div style={{
              position: 'absolute', bottom: 5, right: 10, zIndex: 1000,
              color: '#9CA3AF', fontSize: 9,
            }}>
              Map data © OpenStreetMap contributors
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Barangay detail card */}
          {selectedBrgy ? (
            <div style={{
              background: 'white', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,.07)', border: '1px solid #E5E7EB',
            }}>
              <div style={{ height: 4, background: selectedBrgy.color }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ color: '#0F172A', fontSize: 16, fontWeight: 700 }}>{selectedBrgy.name}</span>
                      {(() => {
                        const al = alertLevelConfig[selectedBrgy.alertLevel];
                        return (
                          <span style={{ background: al.bg, color: al.color, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.06em' }}>
                            {al.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 11 }}>{selectedBrgy.district}</div>
                    <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>Capt. {selectedBrgy.captain}</div>
                  </div>
                  <button
                    onClick={() => setSelectedBarangay(null)}
                    style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#6B7280', fontSize: 11 }}
                  >✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 12 }}>
                  {[
                    { label: 'Population', value: selectedBrgy.population.toLocaleString() },
                    { label: 'Area', value: selectedBrgy.area },
                    { label: 'Active Inc.', value: selectedBrgy.activeIncidents },
                    { label: 'Resp. Rate', value: `${selectedBrgy.responseRate}%` },
                    { label: 'Avg Response', value: `${selectedBrgy.avgResponseMin}m` },
                    { label: 'Responders', value: selectedBrgy.responders },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>{s.value}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Coord info */}
                <div style={{
                  background: '#F0F4FF', borderRadius: 8, padding: '8px 10px',
                  border: '1px solid #DBEAFE',
                }}>
                  <div style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Navigation size={10} color="#1D4ED8" /> OSM Coordinates
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}>
                    Center: {selectedBrgy.center[0].toFixed(4)}°N, {selectedBrgy.center[1].toFixed(4)}°E
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 9, marginTop: 2 }}>
                    {selectedBrgy.boundary.length}-vertex polygon boundary
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginBottom: 5 }}>
                    Boundary GeoJSON (Read-only)
                  </div>
                  {!BOUNDARY_EDIT_ENABLED ? (
                    <div style={{ color: '#64748B', fontSize: 9, marginBottom: 6 }}>
                      Editing is locked to protect official barangay boundaries.
                    </div>
                  ) : null}
                  {BOUNDARY_EDIT_ENABLED ? (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 7 }}>
                        <button
                          onClick={() => {
                            if (BOUNDARY_EDIT_ENABLED) {
                              setBoundaryEditMode((current) => !current);
                            }
                          }}
                          disabled={!BOUNDARY_EDIT_ENABLED}
                          style={{
                            border: '1px solid #BFDBFE',
                            borderRadius: 6,
                            padding: '5px 8px',
                            background: boundaryEditMode ? '#DBEAFE' : '#EFF6FF',
                            color: '#1D4ED8',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: !BOUNDARY_EDIT_ENABLED ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED ? 0.6 : 1,
                          }}
                        >
                          {boundaryEditMode ? 'Exit Map Edit' : 'Edit on Map'}
                        </button>
                        <button
                          onClick={handleUndoBoundaryPoint}
                          disabled={!BOUNDARY_EDIT_ENABLED || !boundaryEditMode || boundaryPoints.length === 0}
                          style={{
                            border: '1px solid #E5E7EB',
                            borderRadius: 6,
                            padding: '5px 8px',
                            background: 'white',
                            color: '#475569',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: !BOUNDARY_EDIT_ENABLED || !boundaryEditMode || boundaryPoints.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED || !boundaryEditMode || boundaryPoints.length === 0 ? 0.6 : 1,
                          }}
                        >
                          Undo Point
                        </button>
                        <button
                          onClick={handleResetBoundaryPoints}
                          disabled={!BOUNDARY_EDIT_ENABLED || !selectedBrgy}
                          style={{
                            border: '1px solid #E5E7EB',
                            borderRadius: 6,
                            padding: '5px 8px',
                            background: 'white',
                            color: '#475569',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: !BOUNDARY_EDIT_ENABLED || !selectedBrgy ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED || !selectedBrgy ? 0.6 : 1,
                          }}
                        >
                          Reset Points
                        </button>
                        <button
                          onClick={handleApplyPointsToDraft}
                          disabled={!BOUNDARY_EDIT_ENABLED || boundaryPoints.length < 3}
                          style={{
                            border: '1px solid #E5E7EB',
                            borderRadius: 6,
                            padding: '5px 8px',
                            background: 'white',
                            color: '#475569',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: !BOUNDARY_EDIT_ENABLED || boundaryPoints.length < 3 ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED || boundaryPoints.length < 3 ? 0.6 : 1,
                          }}
                        >
                          Apply Points to JSON
                        </button>
                      </div>
                      <div style={{ color: '#64748B', fontSize: 9, marginBottom: 6 }}>
                        {boundaryPoints.length} points selected. Use at least 3 points for a valid polygon.
                      </div>
                    </>
                  ) : null}
                  <textarea
                    value={boundaryDraft}
                    onChange={(event) => {
                      if (BOUNDARY_EDIT_ENABLED) {
                        setBoundaryDraft(event.target.value);
                      }
                    }}
                    readOnly={!BOUNDARY_EDIT_ENABLED}
                    style={{
                      width: '100%',
                      minHeight: 120,
                      border: '1px solid #DBEAFE',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: '#334155',
                      boxSizing: 'border-box',
                      background: '#F8FAFF',
                    }}
                  />
                  {boundaryError ? (
                    <div style={{ color: '#B91C1C', fontSize: 10, marginTop: 5 }}>{boundaryError}</div>
                  ) : null}
                  {boundaryMessage ? (
                    <div style={{ color: '#059669', fontSize: 10, marginTop: 5 }}>{boundaryMessage}</div>
                  ) : null}
                  {BOUNDARY_EDIT_ENABLED ? (
                    <button
                      onClick={() => {
                        void handleSaveBoundary();
                      }}
                      disabled={boundarySaving || !BOUNDARY_EDIT_ENABLED}
                      style={{
                        marginTop: 7,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        borderRadius: 7,
                        padding: '7px 10px',
                        background: '#1E3A8A',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: boundarySaving || !BOUNDARY_EDIT_ENABLED ? 'not-allowed' : 'pointer',
                        opacity: boundarySaving || !BOUNDARY_EDIT_ENABLED ? 0.7 : 1,
                      }}
                    >
                      <Save size={12} /> {boundarySaving ? 'Saving...' : 'Save Boundary'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'white', borderRadius: 14, padding: 20,
              boxShadow: '0 1px 6px rgba(0,0,0,.07)', border: '1px solid #E5E7EB',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 140,
              justifyContent: 'center',
            }}>
              <MapPin size={28} color="#D1D5DB" />
              <div style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center' }}>
                Click a barangay boundary on the map to view details
              </div>
            </div>
          )}

          {/* Active incidents list */}
          <div style={{
            background: 'white', borderRadius: 14, padding: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,.07)', border: '1px solid #E5E7EB', flex: 1,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
              {selectedBrgy ? `${selectedBrgy.name} Incidents` : 'All Active Incidents'}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 260 }}>
              {filteredIncidents
                .filter(inc => !selectedBrgy || inc.barangay === selectedBrgy.name)
                .map(inc => {
                  const color = INCIDENT_COLORS[inc.type] ?? '#6B7280';
                  const sevBg: Record<string, string> = { critical: '#FEE2E2', high: '#FFEDD5', medium: '#FEF3C7', low: '#D1FAE5' };
                  const sevCol: Record<string, string> = { critical: '#B91C1C', high: '#EA580C', medium: '#B4730A', low: '#059669' };
                  const isSel = selectedIncident?.id === inc.id;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(isSel ? null : inc)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                        borderRadius: 8, cursor: 'pointer',
                        background: isSel ? `${color}12` : '#F9FAFB',
                        border: `1px solid ${isSel ? color + '40' : '#F3F4F6'}`,
                        transition: 'all .15s',
                      }}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, background: color, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                      }}>
                        {INCIDENT_EMOJI[inc.type] ?? '📍'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#1E293B', fontSize: 11, fontWeight: 600 }}>{inc.label}</div>
                        <div style={{ color: '#9CA3AF', fontSize: 10 }}>{inc.barangay}</div>
                      </div>
                      <div style={{
                        background: sevBg[inc.severity], color: sevCol[inc.severity],
                        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, textTransform: 'capitalize',
                      }}>{inc.severity}</div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick barangay buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {barangaysData.map(b => {
              const al = alertLevelConfig[b.alertLevel];
              const isSel = selectedBarangay === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarangay(isSel ? null : b.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: isSel ? `${b.color}14` : 'white',
                    border: `1px solid ${isSel ? b.color + '50' : '#E5E7EB'}`,
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                    boxShadow: isSel ? `0 2px 8px ${b.color}22` : '0 1px 3px rgba(0,0,0,.05)',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0F172A', fontSize: 12, fontWeight: 600 }}>{b.name}</div>
                    <div style={{ color: '#9CA3AF', fontSize: 10 }}>
                      {b.center[0].toFixed(4)}°N, {b.center[1].toFixed(4)}°E
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      background: al.bg, color: al.color,
                      fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                    }}>{al.label}</span>
                    <span style={{ color: '#374151', fontSize: 11, fontWeight: 700 }}>{b.activeIncidents}</span>
                    <AlertTriangle size={10} color="#9CA3AF" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{
        background: 'white', borderRadius: 14, padding: '18px 20px', marginTop: 14,
        boxShadow: '0 1px 6px rgba(0,0,0,.07)', border: '1px solid #E5E7EB',
      }}>
        <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Barangay Comparison Summary</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                {['Barangay', 'District', 'Population', 'Area', 'Captain', 'Alert Level', 'Active', 'Response Rate', 'Avg Response', 'OSM Center'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barangaysData.map((b, i) => {
                const al = alertLevelConfig[b.alertLevel];
                return (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: i < barangaysData.length - 1 ? '1px solid #F9FAFB' : 'none',
                      background: selectedBarangay === b.id ? `${b.color}08` : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedBarangay(selectedBarangay === b.id ? null : b.id)}
                    onMouseEnter={e => { if (selectedBarangay !== b.id) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                    onMouseLeave={e => { if (selectedBarangay !== b.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: b.color, flexShrink: 0 }} />
                        <span style={{ color: '#0F172A', fontWeight: 600 }}>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6B7280' }}>{b.district}</td>
                    <td style={{ padding: '10px 12px', color: '#374151', fontWeight: 600 }}>{b.population.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#6B7280' }}>{b.area}</td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{b.captain}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: al.bg, color: al.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>{al.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: b.activeIncidents > 8 ? '#B91C1C' : '#374151', fontWeight: 700 }}>{b.activeIncidents}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${b.responseRate}%`, background: b.responseRate >= 90 ? '#059669' : '#B4730A', borderRadius: 3 }} />
                        </div>
                        <span style={{ color: '#374151', fontWeight: 600 }}>{b.responseRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: b.avgResponseMin > 10 ? '#B91C1C' : '#059669', fontWeight: 600 }}>
                      {b.avgResponseMin} min
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}>
                      {b.center[0].toFixed(4)}°N<br />{b.center[1].toFixed(4)}°E
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes sa-ping {
          0%   { transform: scale(1);   opacity: .18; }
          70%  { transform: scale(2.5); opacity: 0;   }
          100% { transform: scale(2.5); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
