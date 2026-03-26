import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Layers, AlertTriangle, Clock, CheckCircle2, Navigation, RefreshCw, Save,
  Filter, Droplets, Car, Heart, Shield as ShieldIcon, Zap, Wind, SlidersHorizontal,
} from 'lucide-react';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
import { superAdminApi } from '../../services/superAdminApi';
import { officialReportsApi } from '../../services/officialReportsApi';
import { reportToIncident } from '../../utils/incidentAdapters';
import { getCategoryLabelForIncidentType } from '../../utils/mapCategoryLabels';
import type { IncidentType } from '../../data/incidents';

// ── Incident type styling ────────────────────────────────────────────────────
const INCIDENT_COLORS: Record<string, string> = {
  flood: '#1D4ED8', accident: '#B4730A',
  medical: '#0F766E', crime: '#374151', infrastructure: '#374151',
};
const INCIDENT_ICON_COMPONENTS: Record<IncidentType, React.ReactElement> = {
  flood: <Droplets size={12} />,
  accident: <Car size={12} />,
  medical: <Heart size={12} />,
  crime: <ShieldIcon size={12} />,
  infrastructure: <Zap size={12} />,
  typhoon: <Wind size={12} />,
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#B91C1C', high: '#EA580C', medium: '#B4730A', low: '#059669',
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

function getIncidentTypeIcon(type: string, size: number, color: string) {
  const icon = INCIDENT_ICON_COMPONENTS[type as IncidentType];
  if (!icon) {
    return <AlertTriangle size={size} color={color} />;
  }
  return React.cloneElement(icon as React.ReactElement<{ size?: number; color?: string }>, { size, color });
}

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
        ${getTypeIconMarkup(type, Math.round(size * 0.66), '#FFFFFF')}
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

function FitToBarangayBounds({ barangays }: { barangays: BarangayMapView[] }) {
  const map = useMap();
  const lastBoundsRef = useRef<string>('');

  useEffect(() => {
    const points = barangays
      .flatMap((barangay) => sanitizeBoundary(barangay.boundary) ?? [])
      .filter(isFiniteLatLng);
    if (points.length === 0) {
      return;
    }

    const signature = points.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join('|');
    if (signature === lastBoundsRef.current) {
      return;
    }

    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    if (!bounds.isValid()) {
      return;
    }

    map.fitBounds(bounds.pad(0.08), { animate: false });
    lastBoundsRef.current = signature;
  }, [map, barangays]);

  return null;
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
const MAP_MIN_ZOOM = 15;
const MAP_DEFAULT_ZOOM = 18;
const MAP_MAX_ZOOM = 20;
const BOUNDARY_EDIT_ENABLED = false;
const TONDO_LAT_RANGE: [number, number] = [14.50, 14.75];
const TONDO_LNG_RANGE: [number, number] = [120.90, 121.05];

const alertLevelConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal:   { label: 'NORMAL',   color: '#059669', bg: '#D1FAE5' },
  elevated: { label: 'ELEVATED', color: '#B4730A', bg: '#FEF3C7' },
  critical: { label: 'CRITICAL', color: '#B91C1C', bg: '#FEE2E2' },
};

const BARANGAY_CENTER_BY_CODE: Record<string, [number, number]> = {
  '251': [14.6146, 120.9776],
  '252': [14.6144, 120.9770],
  '256': [14.6159, 120.9786],
};

// Canonical boundaries aligned with citizen/admin IncidentMap and server geofencing defaults.
const CANONICAL_BOUNDARY_BY_CODE: Record<string, [number, number][]> = {
  '251': [
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
  '252': [
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
  '256': [
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
};

const BARANGAY_META_BY_CODE: Record<string, { color: string; district: string; captain: string; area: string; population: number }> = {
  '251': { color: '#1D4ED8', district: 'District II', captain: 'Reynaldo Angat', area: 'N/A', population: 1181 },
  '252': { color: '#0F766E', district: 'District II', captain: 'Leana Marie Angat', area: 'N/A', population: 910 },
  '256': { color: '#B4730A', district: 'District II', captain: 'Honorario Lopez', area: 'N/A', population: 1030 },
};
const BARANGAY_FILTER_CODES = ['251', '252', '256'] as const;
const HEAT_RADIUS_MAX_SCALE = 0.6;

type BarangayMapView = {
  id: string;
  code: string;
  name: string;
  district: string;
  captain: string;
  population: number;
  area: string;
  center: [number, number];
  boundary: [number, number][];
  color: string;
  activeIncidents: number;
  totalThisMonth: number;
  resolvedThisMonth: number;
  responseRate: number;
  avgResponseMin: number;
  registeredUsers: number;
  alertLevel: 'normal' | 'elevated' | 'critical';
  boundaryGeojson: string | null;
};

type MapIncident = {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: string;
  barangay: string;
  label: string;
};

function normalizeLatLngPoint(point: [number, number]): [number, number] {
  const [a, b] = point;

  // Accept both [lat, lng] and [lng, lat] and normalize to [lat, lng].
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    return [b, a];
  }
  return [a, b];
}

function isFiniteLatLng(point: [number, number]): boolean {
  const [lat, lng] = point;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function isLikelyTondoPoint(point: [number, number]): boolean {
  const [lat, lng] = point;
  return lat >= TONDO_LAT_RANGE[0] && lat <= TONDO_LAT_RANGE[1] && lng >= TONDO_LNG_RANGE[0] && lng <= TONDO_LNG_RANGE[1];
}

function normalizeBoundaryPointsOrder(boundary: [number, number][]): [number, number][] {
  return boundary.map((point) => normalizeLatLngPoint(point));
}

function boundaryToGeoJsonPolygon(boundary: [number, number][]) {
  const coordinates = normalizeBoundaryPointsOrder(boundary).map(([lat, lng]) => [lng, lat]);
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
  const normalized = normalizeBoundaryPointsOrder(boundary);

  if (normalized.length < 2) {
    return normalized;
  }

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  return isClosed ? normalized.slice(0, -1) : normalized;
}

function sanitizeBoundary(boundary: [number, number][]): [number, number][] | null {
  const normalized = normalizeBoundaryPointsOrder(boundary)
    .filter(isFiniteLatLng)
    .filter(isLikelyTondoPoint);

  if (normalized.length < 3) {
    return null;
  }

  return normalizeBoundaryPoints(normalized);
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
      .map((point) => normalizeLatLngPoint(point));

    return sanitizeBoundary(converted);
  } catch {
    return null;
  }
}

function fallbackBoundaryForCode(code: string): [number, number][] {
  const canonical = CANONICAL_BOUNDARY_BY_CODE[code];
  if (canonical) {
    return canonical;
  }

  const center = BARANGAY_CENTER_BY_CODE[code] ?? TONDO_TRI_BRGY_CENTER;
  const latDelta = 0.0009;
  const lngDelta = 0.0011;
  return [
    [center[0] + latDelta, center[1] - lngDelta],
    [center[0] + latDelta, center[1] + lngDelta],
    [center[0] - latDelta, center[1] + lngDelta],
    [center[0] - latDelta, center[1] - lngDelta],
  ];
}

function alertLevelFromActive(activeIncidents: number): 'normal' | 'elevated' | 'critical' {
  if (activeIncidents >= 10) return 'critical';
  if (activeIncidents >= 5) return 'elevated';
  return 'normal';
}

function extractBarangayCode(label: string): string | null {
  const matched = label.match(/251|252|256/);
  return matched ? matched[0] : null;
}

export default function SABarangayMap() {
  const [barangaysData, setBarangaysData] = useState<BarangayMapView[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [barangaysError, setBarangaysError] = useState<string | null>(null);
  const [reportIncidents, setReportIncidents] = useState<MapIncident[]>([]);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHeatmapSettings, setShowHeatmapSettings] = useState(false);
  const [heatRadiusPercent, setHeatRadiusPercent] = useState(85);
  const [heatOpacityScale, setHeatOpacityScale] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedBarangayCodes, setSelectedBarangayCodes] = useState<string[]>([...BARANGAY_FILTER_CODES]);
  const [isCompactFilters, setIsCompactFilters] = useState(false);
  const [boundaryDraft, setBoundaryDraft] = useState('');
  const [boundarySaving, setBoundarySaving] = useState(false);
  const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [boundaryEditMode, setBoundaryEditMode] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>([]);

  const selectedBrgy = barangaysData.find(b => b.id === selectedBarangay);
  const categoryFilteredIncidents = filterType === 'all'
    ? reportIncidents
    : reportIncidents.filter(i => i.type === filterType);
  const filteredIncidents = selectedBarangayCodes.length === 0
    ? categoryFilteredIncidents
    : categoryFilteredIncidents.filter((incident) => {
        const code = extractBarangayCode(incident.barangay);
        return code ? selectedBarangayCodes.includes(code) : true;
      });
  const heatRadiusScale = (heatRadiusPercent / 100) * HEAT_RADIUS_MAX_SCALE;

  const heatCircles = filteredIncidents.map((incident) => ({
    baseRadius: incident.severity === 'critical' ? 110 : incident.severity === 'high' ? 85 : 60,
    baseOpacity: incident.severity === 'critical' ? 0.14 : incident.severity === 'high' ? 0.11 : 0.08,
    lat: incident.lat,
    lng: incident.lng,
    radius: Math.max(20, (incident.severity === 'critical' ? 110 : incident.severity === 'high' ? 85 : 60) * heatRadiusScale),
    color: INCIDENT_COLORS[incident.type] ?? '#374151',
    opacity: Math.max(0.03, Math.min(0.42, (incident.severity === 'critical' ? 0.14 : incident.severity === 'high' ? 0.11 : 0.08) * heatOpacityScale)),
  }));

  const loadBarangays = async () => {
    setLoadingBarangays(true);
    setBarangaysError(null);
    try {
      const payload = await superAdminApi.getBarangays();
      const mapped = payload.barangays.map((apiBarangay) => {
        const meta = BARANGAY_META_BY_CODE[apiBarangay.code] ?? {
          color: '#1E3A8A',
          district: 'District II',
          captain: 'Assigned Barangay Captain',
          area: 'N/A',
          population: 0,
        };
        const canonicalBoundary = CANONICAL_BOUNDARY_BY_CODE[apiBarangay.code];
        const parsedBoundary = parseBoundaryGeojsonToBoundary(apiBarangay.boundaryGeojson);
        const boundary = canonicalBoundary ?? parsedBoundary ?? fallbackBoundaryForCode(apiBarangay.code);
        const activeIncidents = apiBarangay.activeReports;
        const resolvedThisMonth = Math.max(apiBarangay.totalReports - activeIncidents, 0);
        const responseRate = apiBarangay.totalReports > 0
          ? Math.max(0, Math.min(100, Math.round((resolvedThisMonth / apiBarangay.totalReports) * 100)))
          : 100;

        return {
          id: apiBarangay.id,
          code: apiBarangay.code,
          name: apiBarangay.name || `Barangay ${apiBarangay.code}`,
          district: meta.district,
          captain: meta.captain,
          population: meta.population,
          area: meta.area,
          center: BARANGAY_CENTER_BY_CODE[apiBarangay.code] ?? boundary[0] ?? TONDO_TRI_BRGY_CENTER,
          boundary,
          color: meta.color,
          activeIncidents,
          totalThisMonth: apiBarangay.totalReports,
          resolvedThisMonth,
          responseRate,
          avgResponseMin: 0,
          registeredUsers: apiBarangay.citizenCount,
          alertLevel: alertLevelFromActive(activeIncidents),
          boundaryGeojson: apiBarangay.boundaryGeojson,
        } satisfies BarangayMapView;
      });

      setBarangaysData(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load barangay data.';
      setBarangaysError(message);
    } finally {
      setLoadingBarangays(false);
    }
  };

  const loadReportIncidents = async () => {
    setLoadingIncidents(true);
    setIncidentsError(null);
    try {
      const payload = await officialReportsApi.getReports();
      const mapped = payload.reports.map((report) => {
        const incident = reportToIncident(report);
        return {
          id: incident.id,
          lat: incident.lat,
          lng: incident.lng,
          type: incident.type,
          severity: incident.severity,
          barangay: incident.barangay,
          label: incident.description,
        };
      });
      setReportIncidents(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load incident markers.';
      setIncidentsError(message);
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    void loadBarangays();
    void loadReportIncidents();
  }, []);

  useEffect(() => {
    const updateCompactMode = () => {
      setIsCompactFilters(window.innerWidth < 900);
    };

    updateCompactMode();
    window.addEventListener('resize', updateCompactMode);
    return () => window.removeEventListener('resize', updateCompactMode);
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

  const toggleBarangayCode = (code: string) => {
    setSelectedBarangayCodes((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      }
      return [...current, code].sort();
    });
  };

  const handleCompactBarangaySelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCodes = Array.from(event.target.selectedOptions).map((option) => option.value);
    setSelectedBarangayCodes(selectedCodes);
  };

  const handleResetHeatmapSettings = () => {
    setHeatRadiusPercent(85);
    setHeatOpacityScale(1);
  };

  if ((loadingBarangays || loadingIncidents) && reportIncidents.length === 0) {
    return (
      <div style={{ padding: '20px', minHeight: '100%' }}>
        <TextSkeleton rows={2} title={false} />
        <div style={{ marginTop: 12 }}>
          <CardSkeleton count={3} lines={2} showImage={false} gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#F0F4FF', minHeight: '100%' }}>
      {/* Page header */}
      <div className="sa-map-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
        <div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>Barangay Boundary Map</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            OpenStreetMap — Barangays 251, 252 & 256 · Municipality of Tugon, Region IV-A
          </p>
        </div>
        <div className="sa-map-header-actions" style={{ display: 'flex', gap: 8 }}>
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
          <button
            onClick={() => {
              setShowHeatmapSettings((open) => !open);
              setShowHeatmap(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showHeatmapSettings ? '#1E3A8A' : 'white',
              color: showHeatmapSettings ? 'white' : '#374151',
              border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <SlidersHorizontal size={13} /> Tune Heatmap
          </button>
        </div>
      </div>

      {barangaysError ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#B91C1C', fontSize: 12, padding: '10px 12px' }}>
          {barangaysError}
        </div>
      ) : null}

      {incidentsError ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#B91C1C', fontSize: 12, padding: '10px 12px' }}>
          {incidentsError}
        </div>
      ) : null}

      <div className="sa-map-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 296px', gap: 14 }}>
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
            <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 600 }}>Filters:</span>
            {isCompactFilters ? (
              <>
                <select
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                  style={{
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    background: 'white',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '6px 8px',
                    minWidth: 140,
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="flood">{getCategoryLabelForIncidentType('flood')}</option>
                  <option value="accident">{getCategoryLabelForIncidentType('accident')}</option>
                  <option value="medical">{getCategoryLabelForIncidentType('medical')}</option>
                  <option value="crime">{getCategoryLabelForIncidentType('crime')}</option>
                </select>
                <select
                  multiple
                  value={selectedBarangayCodes}
                  onChange={handleCompactBarangaySelect}
                  title="Select one or more barangays"
                  style={{
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    background: 'white',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '6px 8px',
                    minWidth: 120,
                    height: 72,
                  }}
                >
                  {BARANGAY_FILTER_CODES.map((code) => (
                    <option key={code} value={code}>Barangay {code}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                {['all', 'flood', 'accident', 'medical', 'crime'].map(t => (
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
                    {t !== 'all' ? <span style={{ marginRight: 4, display: 'inline-flex', verticalAlign: 'middle' }}>{getIncidentTypeIcon(t, 12, filterType === t ? '#FFFFFF' : '#6B7280')}</span> : null}
                    {t === 'all' ? 'All Categories' : getCategoryLabelForIncidentType(t as IncidentType)}
                  </button>
                ))}
                <span style={{ color: '#94A3B8', fontSize: 11, marginLeft: 4 }}>Barangay:</span>
                <button
                  onClick={() => setSelectedBarangayCodes([...BARANGAY_FILTER_CODES])}
                  style={{
                    padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    cursor: 'pointer', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569',
                  }}
                >
                  All
                </button>
                {BARANGAY_FILTER_CODES.map((code) => (
                  <label
                    key={code}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 999,
                      background: selectedBarangayCodes.includes(code) ? '#DBEAFE' : '#FFFFFF',
                      color: selectedBarangayCodes.includes(code) ? '#1D4ED8' : '#475569',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBarangayCodes.includes(code)}
                      onChange={() => toggleBarangayCode(code)}
                    />
                    {code}
                  </label>
                ))}
              </>
            )}
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
            {showHeatmapSettings ? (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1200,
                width: 232,
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid #DBEAFE',
                borderRadius: 12,
                boxShadow: '0 6px 24px rgba(15,23,42,.16)',
                padding: 12,
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onMouseMove={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              onTouchMove={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerMove={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#1E293B', fontSize: 12, fontWeight: 700 }}>Heatmap Settings</span>
                  <button
                    onClick={handleResetHeatmapSettings}
                    style={{
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748B', fontSize: 10, fontWeight: 600 }}>Radius scale</span>
                    <span style={{ color: '#1E293B', fontSize: 10, fontWeight: 700 }}>{heatRadiusPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={heatRadiusPercent}
                    onChange={(event) => setHeatRadiusPercent(Number(event.target.value))}
                    onMouseDown={(event) => event.stopPropagation()}
                    onMouseMove={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerMove={(event) => event.stopPropagation()}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748B', fontSize: 10, fontWeight: 600 }}>Opacity scale</span>
                    <span style={{ color: '#1E293B', fontSize: 10, fontWeight: 700 }}>{heatOpacityScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={3}
                    step={0.05}
                    value={heatOpacityScale}
                    onChange={(event) => setHeatOpacityScale(Number(event.target.value))}
                    onMouseDown={(event) => event.stopPropagation()}
                    onMouseMove={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerMove={(event) => event.stopPropagation()}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : null}

            <MapContainer
              center={TONDO_TRI_BRGY_CENTER}
              zoom={MAP_DEFAULT_ZOOM}
              style={{ width: '100%', height: '100%', minHeight: 500 }}
              zoomControl={false}
              attributionControl={true}
              scrollWheelZoom={!showHeatmapSettings}
              dragging={!showHeatmapSettings}
              touchZoom={!showHeatmapSettings}
              doubleClickZoom={!showHeatmapSettings}
              boxZoom={!showHeatmapSettings}
              keyboard={!showHeatmapSettings}
              minZoom={MAP_MIN_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
            >
              {/* OSM tiles */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxNativeZoom={19}
                maxZoom={MAP_MAX_ZOOM}
              />

              <FitToBarangayBounds barangays={barangaysData} />

              {/* Barangay boundary polygons */}
              {barangaysData.map(b => (
                <Polygon
                  key={b.id}
                  positions={b.boundary}
                  pathOptions={{
                    color: b.color,
                    fillColor: b.color,
                    fillOpacity: selectedBarangay === b.id ? (showHeatmap ? 0.28 : 0.22) : (showHeatmap ? 0.15 : 0.10),
                    weight: selectedBarangay === b.id ? (showHeatmap ? 4 : 3) : (showHeatmap ? 3 : 2),
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
              {heatCircles.map((c, i) => (
                <Circle
                  key={`heat-${i}`}
                  center={[c.lat, c.lng]}
                  radius={c.radius}
                  pathOptions={{
                    color: c.color,
                    fillColor: c.color,
                    className: 'sa-map-heat-circle',
                    fillOpacity: showHeatmap ? c.opacity : 0,
                    weight: 0,
                  }}
                />
              ))}

              {/* Incident markers */}
              {!showHeatmap && filteredIncidents.map(inc => (
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
                        {getCategoryLabelForIncidentType(inc.type as IncidentType)} · {inc.severity}
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
              {showHeatmap ? (
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 5, marginTop: 3 }}>
                  <div style={{ color: '#6B7280', fontSize: 9, marginBottom: 4, fontWeight: 700 }}>
                    Heat Intensity
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#64748B', opacity: Math.max(0.03, Math.min(0.42, 0.08 * heatOpacityScale)) }} />
                    <span style={{ color: '#6B7280', fontSize: 9 }}>Low ({Math.round(60 * heatRadiusScale)}m)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#475569', opacity: Math.max(0.03, Math.min(0.42, 0.11 * heatOpacityScale)) }} />
                    <span style={{ color: '#6B7280', fontSize: 9 }}>High ({Math.round(85 * heatRadiusScale)}m)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#334155', opacity: Math.max(0.03, Math.min(0.42, 0.14 * heatOpacityScale)) }} />
                    <span style={{ color: '#6B7280', fontSize: 9 }}>Critical ({Math.round(110 * heatRadiusScale)}m)</span>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 5, marginTop: 3 }}>
                  {(Object.keys(INCIDENT_ICON_COMPONENTS) as IncidentType[]).map((type) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{getIncidentTypeIcon(type, 11, '#6B7280')}</span>
                      <span style={{ color: '#6B7280', fontSize: 9 }}>{getCategoryLabelForIncidentType(type)}</span>
                    </div>
                  ))}
                </div>
              )}
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
                        {getIncidentTypeIcon(inc.type, 12, '#FFFFFF')}
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
                    boxShadow: 'none',
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

        @media (max-width: 1024px) {
          .sa-map-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .sa-map-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .sa-map-header-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .sa-map-header-actions button {
            flex: 1;
            min-height: 40px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
