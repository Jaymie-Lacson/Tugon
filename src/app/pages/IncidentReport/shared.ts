import { Wind, Volume2, AlertCircle, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IncidentCategory, Severity, PinData, ReportForm, LatLng } from './types';

// ── Tile layer URLs ───────────────────────────────────────────────────────────
// CARTO has better cache policies than OSM
export const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

export const TILE_ATTRIBUTIONS = {
  light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

// ── Incident categories ───────────────────────────────────────────────────────
export const CATEGORIES: {
  type: IncidentCategory; label: string; icon: LucideIcon;
  color: string; bg: string; desc: string; descKey: string; emoji: string;
}[] = [
  { type: 'Pollution',   label: 'Pollution',   icon: Wind,          color: '#0F766E',                   bg: '#CCFBF1', desc: 'Air, water, and waste pollution concerns',      descKey: 'citizen.report.category.pollution.desc',  emoji: 'P' },
  { type: 'Noise',       label: 'Noise',       icon: Volume2,       color: '#7C3AED',                   bg: '#EDE9FE', desc: 'Public noise disturbance incidents',             descKey: 'citizen.report.category.noise.desc',       emoji: 'N' },
  { type: 'Crime',       label: 'Crime',       icon: AlertCircle,   color: 'var(--primary)',             bg: '#DBEAFE', desc: 'Criminal and suspicious activity reports',      descKey: 'citizen.report.category.crime.desc',       emoji: 'C' },
  { type: 'Road Hazard', label: 'Road Hazard', icon: AlertTriangle, color: 'var(--severity-medium)',     bg: '#FEF3C7', desc: 'Road, sidewalk, and street safety hazards',     descKey: 'citizen.report.category.roadHazard.desc',  emoji: 'R' },
];

export const STEP_LABEL_KEYS = [
  'citizen.report.stepLabel.type',
  'citizen.report.stepLabel.location',
  'citizen.report.stepLabel.details',
  'citizen.report.stepLabel.evidence',
  'citizen.report.stepLabel.review',
] as const;

// ── Map constants ─────────────────────────────────────────────────────────────
export const TONDO_MAP_CENTER: LatLng = [14.61515, 120.97805];
export const TONDO_MAP_BOUNDS: [LatLng, LatLng] = [
  [14.61345, 120.97645],
  [14.61675, 120.97965],
];

export const BARANGAY_BOUNDARIES: Array<{ code: string; name: string; district: string; boundary: LatLng[] }> = [
  {
    code: '251',
    name: 'Barangay 251',
    district: 'Tondo, Manila',
    boundary: [
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
    district: 'Tondo, Manila',
    boundary: [
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
    district: 'Tondo, Manila',
    boundary: [
      [14.6165934, 120.9785196],
      [14.6165675, 120.9787716],
      [14.6164604, 120.9788136],
      [14.616355,  120.9788522],
      [14.616179,  120.9789493],
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
      [14.616262,  120.9781291],
      [14.6166307, 120.9781571],
      [14.6165934, 120.9785196],
    ],
  },
];

export function getBoundaryBounds(boundaries: Array<{ boundary: LatLng[] }>): [LatLng, LatLng] {
  let minLat = Number.POSITIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const barangay of boundaries) {
    for (const [lat, lng] of barangay.boundary) {
      minLat = Math.min(minLat, lat);
      minLng = Math.min(minLng, lng);
      maxLat = Math.max(maxLat, lat);
      maxLng = Math.max(maxLng, lng);
    }
  }

  return [[minLat, minLng], [maxLat, maxLng]];
}

export const BARANGAY_BOUNDARY_BOUNDS = getBoundaryBounds(BARANGAY_BOUNDARIES);

// ── Utility functions ─────────────────────────────────────────────────────────
export function findBarangayByCode(code: string | null) {
  if (!code) return null;
  return BARANGAY_BOUNDARIES.find((item) => item.code === code) ?? null;
}

export function toLegacyIncidentType(category: IncidentCategory | null): 'POLLUTION' | 'NOISE' | 'CRIME' | 'ROAD_HAZARD' | 'OTHER' {
  if (category === 'Pollution') return 'POLLUTION';
  if (category === 'Noise') return 'NOISE';
  if (category === 'Crime') return 'CRIME';
  if (category === 'Road Hazard') return 'ROAD_HAZARD';
  return 'OTHER';
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') { resolve(reader.result); return; }
      reject(new Error('Failed to read file data.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file data.'));
    reader.readAsDataURL(blob);
  });
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  const sourceDataUrl = await blobToDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 1280;
      let { width, height } = image;

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height >= width && height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) { reject(new Error('Unable to process image for upload.')); return; }

      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => reject(new Error('Unable to process image for upload.'));
    image.src = sourceDataUrl;
  });
}

export function isPinWithinSupportedBarangay(pin: PinData | null): boolean {
  if (!pin) return false;
  return Boolean(pin.barangayCode);
}

export function getBarangayBoundaryCenter(boundary: LatLng[]): LatLng {
  if (boundary.length === 0) return TONDO_MAP_CENTER;

  const totals = boundary.reduce(
    (acc, [lat, lng]) => { acc.lat += lat; acc.lng += lng; return acc; },
    { lat: 0, lng: 0 },
  );

  return [totals.lat / boundary.length, totals.lng / boundary.length];
}

// ── Step validation ───────────────────────────────────────────────────────────
export const STEP_REQUIREMENTS: Record<number, (f: ReportForm) => string | null> = {
  1: (f) => {
    if (!f.category) return 'Select an incident category to continue.';
    if (!f.subcategory) return 'Select a subcategory to continue.';
    if (!f.severity) return 'Select incident severity to continue.';
    return null;
  },
  2: (f) => {
    if (!f.pin) return 'Drop a map pin inside a supported barangay boundary to continue.';
    if (!isPinWithinSupportedBarangay(f.pin)) return 'Your pin must be inside a supported barangay boundary (251, 252, or 256).';
    if (!f.address.trim()) return 'Enter a specific address or landmark to continue.';
    return null;
  },
  3: (f) => {
    if (f.description.trim().length < 10) return 'Provide at least 10 characters in the incident description.';
    return null;
  },
  4: (f) => {
    if (f.photoPreviews.length === 0) return 'Attach at least one photo before continuing.';
    return null;
  },
  5: () => null,
};
