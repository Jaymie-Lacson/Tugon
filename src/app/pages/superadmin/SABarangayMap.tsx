import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Layers, AlertTriangle, Navigation, RefreshCw, Save,
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
  flood: '#1D4ED8', accident: 'var(--severity-medium)',
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
  critical: 'var(--severity-critical)', high: '#EA580C', medium: 'var(--severity-medium)', low: '#059669',
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
    <div style={{ position: 'absolute', top: 80, right: 10, zIndex: 1000 }} className="flex flex-col gap-1">
      {[
        { label: '+', action: () => map.zoomIn() },
        { label: '−', action: () => map.zoomOut() },
        { label: '⌂', action: () => map.flyTo([14.61495, 120.97795], 18, { animate: true }) },
      ].map(btn => (
        <button
          key={btn.label}
          onClick={btn.action}
          className="w-8 h-8 border border-[#E5E7EB] rounded-md bg-white cursor-pointer text-[15px] font-bold text-[#374151] shadow-[0_1px_4px_rgba(0,0,0,.12)] flex items-center justify-center"
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
  elevated: { label: 'ELEVATED', color: 'var(--severity-medium)', bg: '#FEF3C7' },
  critical: { label: 'CRITICAL', color: 'var(--severity-critical)', bg: '#FEE2E2' },
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
  '256': { color: 'var(--severity-medium)', district: 'District II', captain: 'Honorario Lopez', area: 'N/A', population: 1030 },
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
          color: 'var(--primary)',
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
      <div className="p-5 min-h-full">
        <TextSkeleton rows={2} title={false} />
        <div className="mt-3">
          <CardSkeleton count={3} lines={2} showImage={false} gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-[#F0F4FF] min-h-full">
      {/* Page header */}
      <div className="sa-map-header flex items-center justify-between mb-4 gap-2.5">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] m-0">Barangay Boundary Map</h1>
          <p className="text-xs text-[#6B7280] m-0 mt-0.5">
            OpenStreetMap — Barangays 251, 252 & 256 · Municipality of Tugon, Region IV-A
          </p>
        </div>
        <div className="sa-map-header-actions flex gap-2">
          <button
            onClick={() => {
              void loadBarangays();
            }}
            className="flex items-center gap-1.5 bg-white text-[#374151] border border-[#E5E7EB] rounded-lg px-3.5 py-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw size={13} /> {loadingBarangays ? 'Syncing...' : 'Sync Boundaries'}
          </button>
          <button
            onClick={() => setShowHeatmap(h => !h)}
            className={`flex items-center gap-1.5 border border-[#E5E7EB] rounded-lg px-3.5 py-2 cursor-pointer text-xs font-semibold ${showHeatmap ? 'bg-primary text-white' : 'bg-white text-[#374151]'}`}
          >
            <Layers size={13} /> {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
          </button>
          <button
            onClick={() => {
              setShowHeatmapSettings((open) => !open);
              setShowHeatmap(true);
            }}
            className={`flex items-center gap-1.5 border border-[#E5E7EB] rounded-lg px-3.5 py-2 cursor-pointer text-xs font-semibold ${showHeatmapSettings ? 'bg-primary text-white' : 'bg-white text-[#374151]'}`}
          >
            <SlidersHorizontal size={13} /> Tune Heatmap
          </button>
        </div>
      </div>

      {barangaysError ? (
        <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] text-severity-critical text-xs px-3 py-2.5">
          {barangaysError}
        </div>
      ) : null}

      {incidentsError ? (
        <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] text-severity-critical text-xs px-3 py-2.5">
          {incidentsError}
        </div>
      ) : null}

      <div className="sa-map-main-grid grid gap-3.5" style={{ gridTemplateColumns: '1fr 296px' }}>
        {/* ── OSM Map ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,.08)] border border-[#E5E7EB] flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#F3F4F6] bg-[#FAFAFA] flex-wrap">
            <Filter size={13} color="#6B7280" />
            <span className="text-xs font-semibold text-[#6B7280]">Filters:</span>
            {isCompactFilters ? (
              <>
                <select
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                  className="border border-[#CBD5E1] rounded-lg bg-white text-[#334155] text-[11px] font-semibold px-2 py-1.5 min-w-[140px]"
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
                  className="border border-[#CBD5E1] rounded-lg bg-white text-[#334155] text-[11px] font-semibold px-2 py-1.5 min-w-[120px] h-[72px]"
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
                      background: filterType === t ? (INCIDENT_COLORS[t] ?? '#374151') : '#F3F4F6',
                      color: filterType === t ? 'white' : '#6B7280',
                    }}
                    className="px-2.5 py-1 rounded-[20px] text-[11px] font-semibold cursor-pointer border border-transparent capitalize"
                  >
                    {t !== 'all' ? <span className="mr-1 inline-flex align-middle">{getIncidentTypeIcon(t, 12, filterType === t ? '#FFFFFF' : '#6B7280')}</span> : null}
                    {t === 'all' ? 'All Categories' : getCategoryLabelForIncidentType(t as IncidentType)}
                  </button>
                ))}
                <span className="text-[11px] text-[#94A3B8] ml-1">Barangay:</span>
                <button
                  onClick={() => setSelectedBarangayCodes([...BARANGAY_FILTER_CODES])}
                  className="px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer border border-[#CBD5E1] bg-white text-[#475569]"
                >
                  All
                </button>
                {BARANGAY_FILTER_CODES.map((code) => (
                  <label
                    key={code}
                    className={`inline-flex items-center gap-1 px-2 py-1 border border-[#CBD5E1] rounded-full text-[10px] font-bold cursor-pointer ${selectedBarangayCodes.includes(code) ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-white text-[#475569]'}`}
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
            <span className="ml-auto text-[11px] text-[#9CA3AF]">
              {filteredIncidents.length} incidents shown
            </span>
            {BOUNDARY_EDIT_ENABLED && boundaryEditMode && selectedBrgy ? (
              <span className="text-[11px] font-semibold text-[#1D4ED8]">
                Edit mode: click map to add boundary points for {selectedBrgy.name}
              </span>
            ) : null}
          </div>

          {/* Map */}
          <div style={{ position: 'relative', flex: 1, minHeight: 500 }}>
            {showHeatmapSettings ? (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 1200,
                  width: 232,
                }}
                className="bg-[rgba(255,255,255,0.98)] border border-[#DBEAFE] rounded-xl shadow-[0_6px_24px_rgba(15,23,42,.16)] p-3"
                onMouseDown={(event) => event.stopPropagation()}
                onMouseMove={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#1E293B]">Heatmap Settings</span>
                  <button
                    onClick={handleResetHeatmapSettings}
                    className="border border-[#CBD5E1] bg-white text-[#475569] rounded-md text-[10px] font-bold px-1.5 py-0.5 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="mb-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-semibold text-[#64748B]">Radius scale</span>
                    <span className="text-[10px] font-bold text-[#1E293B]">{heatRadiusPercent}%</span>
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
                    className="w-full"
                  />
                </div>

                <div className="mb-0.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-semibold text-[#64748B]">Opacity scale</span>
                    <span className="text-[10px] font-bold text-[#1E293B]">{heatOpacityScale.toFixed(2)}x</span>
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
                    className="w-full"
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
                    <div className="text-xs">
                      <div className="font-bold" style={{ color: b.color }}>{b.name}</div>
                      <div className="text-[#475569]">Pop: {b.population.toLocaleString()}</div>
                      <div className="text-[#6B7280]">Active: {b.activeIncidents} incidents</div>
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
                    <div className="text-[11px] min-w-[140px]">
                      <div className="font-bold text-[#1E293B] mb-0.5">{inc.label}</div>
                      <div className="text-[#475569]">{inc.barangay}</div>
                      <div
                        className="font-semibold capitalize mt-0.5"
                        style={{ color: SEVERITY_COLORS[inc.severity] }}
                      >
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
            <div
              style={{ position: 'absolute', bottom: 28, left: 10, zIndex: 1000 }}
              className="bg-[rgba(255,255,255,0.97)] rounded-[10px] px-3 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,.15)] border border-[#E5E7EB] min-w-[140px]"
            >
              <div className="font-bold text-[#0F172A] text-[10px] tracking-[0.06em] uppercase mb-[7px]">
                Map Legend
              </div>
              {barangaysData.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-[3px] opacity-80" style={{ background: b.color, border: `2px solid ${b.color}` }} />
                  <span className="text-[10px] text-[#374151]">{b.name}</span>
                </div>
              ))}
              {showHeatmap ? (
                <div className="border-t border-[#F3F4F6] pt-[5px] mt-[3px]">
                  <div className="text-[9px] text-[#6B7280] mb-1 font-bold">
                    Heat Intensity
                  </div>
                  <div className="flex items-center gap-1.5 mb-[3px]">
                    <span className="w-[11px] h-[11px] rounded-full bg-[#64748B]" style={{ opacity: Math.max(0.03, Math.min(0.42, 0.08 * heatOpacityScale)) }} />
                    <span className="text-[9px] text-[#6B7280]">Low ({Math.round(60 * heatRadiusScale)}m)</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-[3px]">
                    <span className="w-[11px] h-[11px] rounded-full bg-[#475569]" style={{ opacity: Math.max(0.03, Math.min(0.42, 0.11 * heatOpacityScale)) }} />
                    <span className="text-[9px] text-[#6B7280]">High ({Math.round(85 * heatRadiusScale)}m)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-[11px] h-[11px] rounded-full bg-[#334155]" style={{ opacity: Math.max(0.03, Math.min(0.42, 0.14 * heatOpacityScale)) }} />
                    <span className="text-[9px] text-[#6B7280]">Critical ({Math.round(110 * heatRadiusScale)}m)</span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#F3F4F6] pt-[5px] mt-[3px]">
                  {(Object.keys(INCIDENT_ICON_COMPONENTS) as IncidentType[]).map((type) => (
                    <div key={type} className="flex items-center gap-[5px] mb-0.5">
                      <span className="inline-flex items-center">{getIncidentTypeIcon(type, 11, '#6B7280')}</span>
                      <span className="text-[9px] text-[#6B7280]">{getCategoryLabelForIncidentType(type)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OSM attribution note */}
            <div
              style={{ position: 'absolute', bottom: 5, right: 10, zIndex: 1000 }}
              className="text-[9px] text-[#9CA3AF]"
            >
              Map data © OpenStreetMap contributors
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="flex flex-col gap-3">

          {/* Barangay detail card */}
          {selectedBrgy ? (
            <div className="bg-white rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,.07)] border border-[#E5E7EB]">
              <div style={{ height: 4, background: selectedBrgy.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-[3px]">
                      <span className="text-base font-bold text-[#0F172A]">{selectedBrgy.name}</span>
                      {(() => {
                        const al = alertLevelConfig[selectedBrgy.alertLevel];
                        return (
                          <span style={{ background: al.bg, color: al.color }} className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-[0.06em]">
                            {al.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">{selectedBrgy.district}</div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">Capt. {selectedBrgy.captain}</div>
                  </div>
                  <button
                    onClick={() => setSelectedBarangay(null)}
                    className="bg-[#F3F4F6] border-none rounded-md px-2 py-1 cursor-pointer text-[#6B7280] text-[11px]"
                  >✕</button>
                </div>

                <div className="grid grid-cols-2 gap-[7px] mb-3">
                  {[
                    { label: 'Population', value: selectedBrgy.population.toLocaleString() },
                    { label: 'Area', value: selectedBrgy.area },
                    { label: 'Active Inc.', value: selectedBrgy.activeIncidents },
                    { label: 'Resp. Rate', value: `${selectedBrgy.responseRate}%` },
                    { label: 'Avg Response', value: `${selectedBrgy.avgResponseMin}m` },
                  ].map(s => (
                    <div key={s.label} className="bg-[#F9FAFB] rounded-lg px-2.5 py-2">
                      <div className="text-[15px] font-bold text-[#0F172A]">{s.value}</div>
                      <div className="text-[10px] text-[#9CA3AF] mt-px">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Coord info */}
                <div className="bg-[#F0F4FF] rounded-lg px-2.5 py-2 border border-[#DBEAFE]">
                  <div className="text-[10px] font-semibold text-[#374151] mb-1 flex items-center gap-[5px]">
                    <Navigation size={10} color="#1D4ED8" /> OSM Coordinates
                  </div>
                  <div className="text-[9px] text-[#6B7280] font-mono">
                    Center: {selectedBrgy.center[0].toFixed(4)}°N, {selectedBrgy.center[1].toFixed(4)}°E
                  </div>
                  <div className="text-[9px] text-[#9CA3AF] mt-0.5">
                    {selectedBrgy.boundary.length}-vertex polygon boundary
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="text-[10px] font-semibold text-[#374151] mb-[5px]">
                    Boundary GeoJSON (Read-only)
                  </div>
                  {!BOUNDARY_EDIT_ENABLED ? (
                    <div className="text-[9px] text-[#64748B] mb-1.5">
                      Editing is locked to protect official barangay boundaries.
                    </div>
                  ) : null}
                  {BOUNDARY_EDIT_ENABLED ? (
                    <>
                      <div className="flex flex-wrap gap-1.5 mb-[7px]">
                        <button
                          onClick={() => {
                            if (BOUNDARY_EDIT_ENABLED) {
                              setBoundaryEditMode((current) => !current);
                            }
                          }}
                          disabled={!BOUNDARY_EDIT_ENABLED}
                          className={`border border-[#BFDBFE] rounded-md px-2 py-[5px] text-[10px] font-bold text-[#1D4ED8] ${boundaryEditMode ? 'bg-[#DBEAFE]' : 'bg-[#EFF6FF]'}`}
                          style={{ cursor: !BOUNDARY_EDIT_ENABLED ? 'not-allowed' : 'pointer', opacity: !BOUNDARY_EDIT_ENABLED ? 0.6 : 1 }}
                        >
                          {boundaryEditMode ? 'Exit Map Edit' : 'Edit on Map'}
                        </button>
                        <button
                          onClick={handleUndoBoundaryPoint}
                          disabled={!BOUNDARY_EDIT_ENABLED || !boundaryEditMode || boundaryPoints.length === 0}
                          className="border border-[#E5E7EB] rounded-md px-2 py-[5px] bg-white text-[#475569] text-[10px] font-bold"
                          style={{
                            cursor: !BOUNDARY_EDIT_ENABLED || !boundaryEditMode || boundaryPoints.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED || !boundaryEditMode || boundaryPoints.length === 0 ? 0.6 : 1,
                          }}
                        >
                          Undo Point
                        </button>
                        <button
                          onClick={handleResetBoundaryPoints}
                          disabled={!BOUNDARY_EDIT_ENABLED || !selectedBrgy}
                          className="border border-[#E5E7EB] rounded-md px-2 py-[5px] bg-white text-[#475569] text-[10px] font-bold"
                          style={{
                            cursor: !BOUNDARY_EDIT_ENABLED || !selectedBrgy ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED || !selectedBrgy ? 0.6 : 1,
                          }}
                        >
                          Reset Points
                        </button>
                        <button
                          onClick={handleApplyPointsToDraft}
                          disabled={!BOUNDARY_EDIT_ENABLED || boundaryPoints.length < 3}
                          className="border border-[#E5E7EB] rounded-md px-2 py-[5px] bg-white text-[#475569] text-[10px] font-bold"
                          style={{
                            cursor: !BOUNDARY_EDIT_ENABLED || boundaryPoints.length < 3 ? 'not-allowed' : 'pointer',
                            opacity: !BOUNDARY_EDIT_ENABLED || boundaryPoints.length < 3 ? 0.6 : 1,
                          }}
                        >
                          Apply Points to JSON
                        </button>
                      </div>
                      <div className="text-[9px] text-[#64748B] mb-1.5">
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
                    className="w-full min-h-[120px] border border-[#DBEAFE] rounded-lg px-2.5 py-2 text-[10px] font-mono text-[#334155] box-border bg-[#F8FAFF]"
                  />
                  {boundaryError ? (
                    <div className="text-[10px] text-severity-critical mt-[5px]">{boundaryError}</div>
                  ) : null}
                  {boundaryMessage ? (
                    <div className="text-[10px] text-[#059669] mt-[5px]">{boundaryMessage}</div>
                  ) : null}
                  {BOUNDARY_EDIT_ENABLED ? (
                    <button
                      onClick={() => {
                        void handleSaveBoundary();
                      }}
                      disabled={boundarySaving || !BOUNDARY_EDIT_ENABLED}
                      className="mt-[7px] inline-flex items-center gap-1.5 border-none rounded-[7px] px-2.5 py-[7px] bg-primary text-white text-[11px] font-bold"
                      style={{
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
            <div className="bg-white rounded-[14px] p-5 shadow-[0_1px_6px_rgba(0,0,0,.07)] border border-[#E5E7EB] flex flex-col items-center gap-2 min-h-[140px] justify-center">
              <MapPin size={28} color="#D1D5DB" />
              <div className="text-xs text-[#9CA3AF] text-center">
                Click a barangay boundary on the map to view details
              </div>
            </div>
          )}

          {/* Active incidents list */}
          <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_6px_rgba(0,0,0,.07)] border border-[#E5E7EB] flex-1 flex flex-col">
            <div className="text-sm font-bold text-[#0F172A] mb-2.5">
              {selectedBrgy ? `${selectedBrgy.name} Incidents` : 'All Active Incidents'}
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-[7px] max-h-[260px]">
              {filteredIncidents
                .filter(inc => !selectedBrgy || inc.barangay === selectedBrgy.name)
                .map(inc => {
                  const color = INCIDENT_COLORS[inc.type] ?? '#6B7280';
                  const sevBg: Record<string, string> = { critical: '#FEE2E2', high: '#FFEDD5', medium: '#FEF3C7', low: '#D1FAE5' };
                  const sevCol: Record<string, string> = { critical: 'var(--severity-critical)', high: '#EA580C', medium: 'var(--severity-medium)', low: '#059669' };
                  const isSel = selectedIncident?.id === inc.id;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(isSel ? null : inc)}
                      className="flex items-center gap-[9px] px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-[150ms]"
                      style={{
                        background: isSel ? `${color}12` : '#F9FAFB',
                        border: `1px solid ${isSel ? color + '40' : '#F3F4F6'}`,
                      }}
                    >
                      <div
                        className="w-[26px] h-[26px] rounded-md shrink-0 flex items-center justify-center text-xs"
                        style={{ background: color }}
                      >
                        {getIncidentTypeIcon(inc.type, 12, '#FFFFFF')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-[#1E293B]">{inc.label}</div>
                        <div className="text-[10px] text-[#9CA3AF]">{inc.barangay}</div>
                      </div>
                      <div
                        className="text-[9px] font-bold px-[5px] py-0.5 rounded capitalize"
                        style={{ background: sevBg[inc.severity], color: sevCol[inc.severity] }}
                      >{inc.severity}</div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick barangay buttons */}
          <div className="flex flex-col gap-1.5">
            {barangaysData.map(b => {
              const al = alertLevelConfig[b.alertLevel];
              const isSel = selectedBarangay === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarangay(isSel ? null : b.id)}
                  className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 cursor-pointer text-left shadow-none"
                  style={{
                    background: isSel ? `${b.color}14` : 'white',
                    border: `1px solid ${isSel ? b.color + '50' : '#E5E7EB'}`,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: b.color }} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[#0F172A]">{b.name}</div>
                    <div className="text-[10px] text-[#9CA3AF]">
                      {b.center[0].toFixed(4)}°N, {b.center[1].toFixed(4)}°E
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-bold px-[5px] py-0.5 rounded-[3px]"
                      style={{ background: al.bg, color: al.color }}
                    >{al.label}</span>
                    <span className="text-[11px] font-bold text-[#374151]">{b.activeIncidents}</span>
                    <AlertTriangle size={10} color="#9CA3AF" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-[14px] px-5 py-[18px] mt-3.5 shadow-[0_1px_6px_rgba(0,0,0,.07)] border border-[#E5E7EB]">
        <div className="text-[15px] font-bold text-[#0F172A] mb-3.5">Barangay Comparison Summary</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-[#F3F4F6]">
                {['Barangay', 'District', 'Population', 'Area', 'Captain', 'Alert Level', 'Active', 'Response Rate', 'Avg Response', 'OSM Center'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[#9CA3AF] font-semibold text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barangaysData.map((b, i) => {
                const al = alertLevelConfig[b.alertLevel];
                return (
                  <tr
                    key={b.id}
                    className="cursor-pointer"
                    style={{
                      borderBottom: i < barangaysData.length - 1 ? '1px solid #F9FAFB' : 'none',
                      background: selectedBarangay === b.id ? `${b.color}08` : 'transparent',
                    }}
                    onClick={() => setSelectedBarangay(selectedBarangay === b.id ? null : b.id)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: b.color }} />
                        <span className="text-[#0F172A] font-semibold">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#6B7280]">{b.district}</td>
                    <td className="px-3 py-2.5 text-[#374151] font-semibold">{b.population.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-[#6B7280]">{b.area}</td>
                    <td className="px-3 py-2.5 text-[#374151]">{b.captain}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold px-[7px] py-0.5 rounded" style={{ background: al.bg, color: al.color }}>{al.label}</span>
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: b.activeIncidents > 8 ? 'var(--severity-critical)' : '#374151' }}>{b.activeIncidents}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-[60px] h-[5px] bg-[#F3F4F6] rounded-[3px] overflow-hidden">
                          <div style={{ height: '100%', width: `${b.responseRate}%`, background: b.responseRate >= 90 ? '#059669' : 'var(--severity-medium)', borderRadius: 3 }} />
                        </div>
                        <span className="text-[#374151] font-semibold">{b.responseRate}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: b.avgResponseMin > 10 ? 'var(--severity-critical)' : '#059669' }}>
                      {b.avgResponseMin} min
                    </td>
                    <td className="px-3 py-2.5 text-[#6B7280] text-[10px] font-mono">
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
