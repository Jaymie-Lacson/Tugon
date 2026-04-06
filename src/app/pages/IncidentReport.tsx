import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation, LanguageToggle } from '../i18n';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import {
  ChevronLeft, Check, MapPin, Navigation,
  Wind, Volume2, AlertCircle, AlertTriangle, MoreHorizontal,
  Camera, Mic, MicOff, Square, Trash2,
  FileText, User, Clock, CheckCircle2, Info, X, Phone,
} from 'lucide-react';
import { CitizenPageLayout } from '../components/CitizenPageLayout';
import { CitizenDesktopNav } from '../components/CitizenDesktopNav';
import { CitizenMobileMenu } from '../components/CitizenMobileMenu';
import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from '../components/CitizenNotifications';
import { RoleHomeLogo } from '../components/RoleHomeLogo';
import { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';
import { citizenReportsApi } from '../services/citizenReportsApi';
import { clearAuthSession, getAuthSession } from '../utils/authSession';
import {
  getCategoryTaxonomy,
  MEDIATION_WARNING,
  REPORT_TAXONOMY,
  type ReportCategory,
  type ReportSubcategory,
} from '../data/reportTaxonomy';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
type IncidentCategory = ReportCategory;
type Severity = 'low' | 'medium' | 'high' | 'critical';
interface PinData {
  lat: number;
  lng: number;
  barangay: string;
  district: string;
  barangayCode: string | null;
  isCrossBarangay: boolean;
}
interface ReportForm {
  category: IncidentCategory | null;
  subcategory: ReportSubcategory | null;
  requiresMediation: boolean;
  mediationWarning: string | null;
  severity: Severity | null;
  pin: PinData | null;
  address: string;
  description: string;
  quickTags: string[];
  affectedCount: string | null;
  photoPreviews: string[];
  photoFiles: File[];
  audioUrl: string | null;
  audioBlob: Blob | null;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONSTANTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const CATEGORIES: {
  type: IncidentCategory; label: string; icon: React.FC<{ size?: number }>;
  color: string; bg: string; desc: string; descKey: string; emoji: string;
}[] = [
  { type: 'Pollution', label: 'Pollution', icon: Wind, color: '#0F766E', bg: '#CCFBF1', desc: 'Air, water, and waste pollution concerns', descKey: 'citizen.report.category.pollution.desc', emoji: 'P' },
  { type: 'Noise', label: 'Noise', icon: Volume2, color: '#7C3AED', bg: '#EDE9FE', desc: 'Public noise disturbance incidents', descKey: 'citizen.report.category.noise.desc', emoji: 'N' },
  { type: 'Crime', label: 'Crime', icon: AlertCircle, color: 'var(--primary)', bg: '#DBEAFE', desc: 'Criminal and suspicious activity reports', descKey: 'citizen.report.category.crime.desc', emoji: 'C' },
  { type: 'Road Hazard', label: 'Road Hazard', icon: AlertTriangle, color: 'var(--severity-medium)', bg: '#FEF3C7', desc: 'Road, sidewalk, and street safety hazards', descKey: 'citizen.report.category.roadHazard.desc', emoji: 'R' },
  { type: 'Other', label: 'Other', icon: MoreHorizontal, color: '#475569', bg: '#F1F5F9', desc: 'Unlisted general issues', descKey: 'citizen.report.category.other.desc', emoji: 'O' },
];

const STEP_LABEL_KEYS = [
  'citizen.report.stepLabel.type',
  'citizen.report.stepLabel.location',
  'citizen.report.stepLabel.details',
  'citizen.report.stepLabel.evidence',
  'citizen.report.stepLabel.review',
] as const;

type LatLng = [number, number];

const TONDO_MAP_CENTER: LatLng = [14.61515, 120.97805];
const TONDO_MAP_BOUNDS: [LatLng, LatLng] = [
  [14.61345, 120.97645],
  [14.61675, 120.97965],
];

const BARANGAY_BOUNDARIES: Array<{ code: string; name: string; district: string; boundary: LatLng[] }> = [
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

function getBoundaryBounds(boundaries: Array<{ boundary: LatLng[] }>): [LatLng, LatLng] {
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

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

const BARANGAY_BOUNDARY_BOUNDS = getBoundaryBounds(BARANGAY_BOUNDARIES);

function findBarangayByCode(code: string | null) {
  if (!code) {
    return null;
  }

  return BARANGAY_BOUNDARIES.find((item) => item.code === code) ?? null;
}

function toLegacyIncidentType(category: IncidentCategory | null): 'POLLUTION' | 'NOISE' | 'CRIME' | 'ROAD_HAZARD' | 'OTHER' {
  if (category === 'Pollution') return 'POLLUTION';
  if (category === 'Noise') return 'NOISE';
  if (category === 'Crime') return 'CRIME';
  if (category === 'Road Hazard') return 'ROAD_HAZARD';
  return 'OTHER';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read file data.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file data.'));
    reader.readAsDataURL(blob);
  });
}

async function compressImageToDataUrl(file: File): Promise<string> {
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

      if (!ctx) {
        reject(new Error('Unable to process image for upload.'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.72);
      resolve(compressed);
    };
    image.onerror = () => reject(new Error('Unable to process image for upload.'));
    image.src = sourceDataUrl;
  });
}

function isPinWithinSupportedBarangay(pin: PinData | null): boolean {
  if (!pin) {
    return false;
  }
  return Boolean(pin.barangayCode);
}

function getBarangayBoundaryCenter(boundary: LatLng[]): LatLng {
  if (boundary.length === 0) {
    return TONDO_MAP_CENTER;
  }

  const totals = boundary.reduce(
    (acc, [lat, lng]) => {
      acc.lat += lat;
      acc.lng += lng;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return [totals.lat / boundary.length, totals.lng / boundary.length];
}

function Step2MapClickCapture({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function Step2FitToBoundaryBounds() {
  const map = useMapEvents({});

  useEffect(() => {
    map.fitBounds(BARANGAY_BOUNDARY_BOUNDS, { padding: [24, 24] });
  }, [map]);

  return null;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP PROGRESS INDICATOR
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation();
  return (
    <div
      className="citizen-web-strip sticky top-[60px] z-40 bg-white border-b border-slate-200 pt-3 pb-2.5"
    >
      <div className="citizen-web-strip-inner flex items-start">
        {STEP_LABEL_KEYS.map((labelKey, i) => {
          const label = t(labelKey);
          const s = i + 1;
          const done = s < current;
          const active = s === current;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'size-8 shrink-0 rounded-[9px] flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out',
                    done
                      ? 'bg-primary text-white border-[2.5px] border-primary'
                      : active
                        ? 'bg-primary text-white border-[2.5px] border-[#60A5FA]'
                        : 'bg-[#F1F5F9] text-[#94A3B8] border-2 border-[#E2E8F0]',
                  ].join(' ')}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : s}
                </div>
                <span
                  className={[
                    'text-[9px] whitespace-nowrap tracking-[0.02em]',
                    active ? 'font-bold text-primary' : done ? 'font-medium text-[#64748B]' : 'font-medium text-[#CBD5E1]',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABEL_KEYS.length - 1 && (
                <div className="flex-1 h-[2.5px] mt-[14px] mx-[3px] rounded overflow-hidden bg-slate-200">
                  <div className={[`h-full bg-primary transition-[width] duration-300 ease-out`, done ? 'w-full' : 'w-0'].join(' ')} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function getCategoryThemeClasses(type: IncidentCategory) {
  if (type === 'Pollution') {
    return {
      selectedCard: 'bg-[#0F766E] border-[#0F766E]',
      unselectedHalo: 'bg-[#CCFBF1]',
      unselectedIcon: 'bg-[#CCFBF1] text-[#0F766E]',
    };
  }
  if (type === 'Noise') {
    return {
      selectedCard: 'bg-[#7C3AED] border-[#7C3AED]',
      unselectedHalo: 'bg-[#EDE9FE]',
      unselectedIcon: 'bg-[#EDE9FE] text-[#7C3AED]',
    };
  }
  if (type === 'Crime') {
    return {
      selectedCard: 'bg-primary border-primary',
      unselectedHalo: 'bg-[#DBEAFE]',
      unselectedIcon: 'bg-[#DBEAFE] text-primary',
    };
  }
  if (type === 'Road Hazard') {
    return {
      selectedCard: 'bg-[var(--severity-medium)] border-[var(--severity-medium)]',
      unselectedHalo: 'bg-[#FEF3C7]',
      unselectedIcon: 'bg-[#FEF3C7] text-[var(--severity-medium)]',
    };
  }
  return {
    selectedCard: 'bg-[#475569] border-[#475569]',
    unselectedHalo: 'bg-[#F1F5F9]',
    unselectedIcon: 'bg-[#F1F5F9] text-[#475569]',
  };
}

function getSeverityButtonClasses(level: Severity, selected: boolean) {
  const base = 'rounded-xl py-2.5 px-1 border-2 text-[10px] font-bold text-center tracking-[0.01em] transition-all duration-200';

  if (level === 'low') {
    return [
      base,
      selected
        ? 'border-[#059669] bg-[#D1FAE5] text-[#059669] shadow-[0_2px_10px_rgba(5,150,105,0.19)]'
        : 'border-[#6EE7B7] bg-white text-[#059669]',
    ].join(' ');
  }
  if (level === 'medium') {
    return [
      base,
      selected
        ? 'border-[var(--severity-medium)] bg-[#FEF3C7] text-[var(--severity-medium)] shadow-[0_2px_10px_rgba(180,115,10,0.19)]'
        : 'border-[#FCD34D] bg-white text-[var(--severity-medium)]',
    ].join(' ');
  }
  if (level === 'high') {
    return [
      base,
      selected
        ? 'border-[#C2410C] bg-[#FFEDD5] text-[#C2410C] shadow-[0_2px_10px_rgba(194,65,12,0.19)]'
        : 'border-[#FB923C] bg-white text-[#C2410C]',
    ].join(' ');
  }

  return [
    base,
    selected
      ? 'border-[var(--severity-critical)] bg-[#FEE2E2] text-[var(--severity-critical)] shadow-[0_2px_10px_rgba(185,28,28,0.19)]'
      : 'border-[#FCA5A5] bg-white text-[var(--severity-critical)]',
  ].join(' ');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP 1 - INCIDENT TYPE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Step1({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
  const { t } = useTranslation();
  const severitySectionRef = useRef<HTMLDivElement | null>(null);
  const subcategorySectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = (target: React.RefObject<HTMLDivElement | null>) => {
    window.setTimeout(() => {
      target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  return (
    <div className="incident-step2 pt-[22px] px-4 pb-2">
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-lg px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">
          {t('citizen.report.step1.badge')}
        </div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          {t('citizen.report.step1.heading')}
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          {t('citizen.report.step1.desc')}
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-[10px] mb-3.5">
        {CATEGORIES.map(({ type, label, icon: Icon, descKey }) => {
          const sel = form.category === type;
          const theme = getCategoryThemeClasses(type);
          return (
            <button
              key={type}
              onClick={() => {
                const taxonomy = getCategoryTaxonomy(type);
                setForm((p) => ({
                  ...p,
                  category: type,
                  subcategory: taxonomy?.subcategories[0] ?? null,
                  requiresMediation: taxonomy?.requiresMediation ?? false,
                  mediationWarning: taxonomy?.requiresMediation ? MEDIATION_WARNING : null,
                }));
                scrollToSection(severitySectionRef);
              }}
              className={[
                'relative overflow-hidden min-h-[124px] rounded-xl border-2 pt-3.5 px-3 pb-3 text-left flex flex-col items-start gap-2.5 transition-all duration-200 ease-out',
                sel
                  ? `${theme.selectedCard} text-white shadow-[0_8px_16px_rgba(15,23,42,0.14)]`
                  : 'bg-white border-[#E8EEF4] text-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
              ].join(' ')}
            >
              {/* Subtle bg pattern for unselected */}
              {!sel && (
                <div className={`absolute -top-5 -right-5 size-[70px] rounded-xl opacity-35 ${theme.unselectedHalo}`} />
              )}
              {/* Checkmark badge */}
              {sel && (
                <div className="absolute top-2.5 right-2.5 size-[22px] rounded-[7px] bg-white/25 border-[1.5px] border-white/50 flex items-center justify-center">
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
              {/* Icon */}
              <div
                className={[
                  'size-[46px] rounded-[13px] flex items-center justify-center shrink-0',
                  sel ? 'bg-white/20 text-white' : theme.unselectedIcon,
                ].join(' ')}
              >
                <Icon size={22} />
              </div>
              {/* Label & desc */}
              <div className="relative z-[1]">
                <div className={['mb-[3px] text-sm font-extrabold leading-[1.2]', sel ? 'text-white' : 'text-[#1E293B]'].join(' ')}>
                  {label}
                </div>
                <div className={['text-[10px] leading-[1.45]', sel ? 'text-white/80' : 'text-[#94A3B8]'].join(' ')}>
                  {t(descKey)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Severity Row - appears after selecting a type */}
      <div
        ref={severitySectionRef}
        className={[
          'overflow-hidden transition-all duration-300 ease-out',
          form.category ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
          <div className="font-bold text-[13px] text-[#1E293B] mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} color="var(--severity-medium)" /> {t('citizen.report.step1.severityPrompt')}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: 'low' as Severity,      labelKey: 'citizen.report.severity.minor',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
              { k: 'medium' as Severity,   labelKey: 'citizen.report.severity.moderate', color: 'var(--severity-medium)', bg: '#FEF3C7', border: '#FCD34D' },
              { k: 'high' as Severity,     labelKey: 'citizen.report.severity.serious',  color: '#C2410C', bg: '#FFEDD5', border: '#FB923C' },
              { k: 'critical' as Severity, labelKey: 'citizen.report.severity.critical', color: 'var(--severity-critical)', bg: '#FEE2E2', border: '#FCA5A5' },
            ].map(s => {
              const sel = form.severity === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => {
                    setForm(p => ({ ...p, severity: s.k }));
                    scrollToSection(subcategorySectionRef);
                  }}
                  className={getSeverityButtonClasses(s.k, sel)}
                >
                  {t(s.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {form.category ? (
        <div ref={subcategorySectionRef} className="mt-3 bg-white border border-[#E2E8F0] rounded-[14px] p-3.5">
          <label htmlFor="incident-subcategory-select" className="block font-bold text-xs text-[#1E293B] mb-2">
            {t('citizen.report.step1.subcategoryLabel')}
          </label>
          <select
            id="incident-subcategory-select"
            title="Select incident subcategory"
            value={form.subcategory ?? ''}
            onChange={(event) => setForm((p) => ({ ...p, subcategory: event.target.value as ReportSubcategory }))}
            className="w-full rounded-[10px] border border-[#CBD5E1] p-[10px_12px] text-xs text-[#1E293B]"
          >
            {(REPORT_TAXONOMY.find((item) => item.category === form.category)?.subcategories ?? []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {form.requiresMediation ? (
            <div className="mt-2.5 text-[11px] text-primary bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] py-2 px-2.5 leading-[1.5]">
              {MEDIATION_WARNING}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Step1WithValidation({
  form,
  setForm,
  validationError,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
}) {
  return (
    <>
      <Step1 form={form} setForm={setForm} />
      {validationError ? (
        <div className="mx-4 mb-2.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP 2 - LOCATION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Step2({
  form,
  setForm,
  validationError,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
}) {
  const { t } = useTranslation();
  const session = getAuthSession();
  const userBarangayCode = session?.user.barangayCode ?? null;
  const allowedBarangays = userBarangayCode
    ? BARANGAY_BOUNDARIES.filter((barangay) => barangay.code === userBarangayCode)
    : [];
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pinValidationInFlight, setPinValidationInFlight] = useState(false);
  const [pinValidationError, setPinValidationError] = useState<string | null>(null);
  const hasBarangayProfile = allowedBarangays.length > 0;
  const pinInSupportedArea = isPinWithinSupportedBarangay(form.pin);
  const assignedBarangayCenter = hasBarangayProfile
    ? getBarangayBoundaryCenter(allowedBarangays[0].boundary)
    : TONDO_MAP_CENTER;

  useEffect(() => {
    if (!mapExpanded) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mapExpanded]);

  const placePin = async (lat: number, lng: number) => {
    if (!hasBarangayProfile) {
      return;
    }

    setPinValidationError(null);
    setPinValidationInFlight(true);

    try {
      const pinValidation = await citizenReportsApi.validateReportPin(lat, lng);
      const routedBarangay = findBarangayByCode(pinValidation.routedBarangayCode);
      const routedLabel = routedBarangay?.name ?? `Barangay ${pinValidation.routedBarangayCode}`;

      setForm((p) => ({
        ...p,
        pin: {
          lat,
          lng,
          barangay: routedLabel,
          district: routedBarangay?.district ?? 'Tondo, Manila',
          barangayCode: pinValidation.routedBarangayCode,
          isCrossBarangay: Boolean(pinValidation.isCrossBarangay),
        },
        address: p.address.trim() ? p.address : `${routedLabel}, ${routedBarangay?.district ?? 'Tondo, Manila'}`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to validate pin location right now.';
      const isOutsideSupportedArea = message.toLowerCase().includes('outside supported barangay boundaries');

      setPinValidationError(isOutsideSupportedArea ? null : message);
      setForm((p) => ({
        ...p,
        pin: {
          lat,
          lng,
          barangay: isOutsideSupportedArea ? 'Outside Supported Area' : 'Unverified Pin',
          district: 'Tondo, Manila',
          barangayCode: null,
          isCrossBarangay: false,
        },
      }));
    } finally {
      setPinValidationInFlight(false);
    }
  };

  const renderMap = (height: number | string) => (
    <MapContainer
      className="incident-step2-map block w-full"
      center={TONDO_MAP_CENTER}
      zoom={18}
      minZoom={17}
      maxZoom={22}
      maxBounds={TONDO_MAP_BOUNDS}
      maxBoundsViscosity={1}
      style={{ height }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        maxNativeZoom={20}
        maxZoom={22}
      />

      {allowedBarangays.map((barangay) => (
        <Polygon
          key={barangay.code}
          positions={barangay.boundary}
          pathOptions={{
            color: form.pin?.barangay === barangay.name ? 'var(--severity-critical)' : 'var(--primary)',
            weight: form.pin?.barangay === barangay.name ? 5 : 4,
            dashArray: '10 6',
            fillColor: '#93C5FD',
            fillOpacity: form.pin?.barangay === barangay.name ? 0.26 : 0.18,
          }}
        >
          <Tooltip direction="center" permanent sticky>
            {barangay.name}
          </Tooltip>
        </Polygon>
      ))}

      <Step2FitToBoundaryBounds />
      <Step2MapClickCapture onMapClick={placePin} />

      {form.pin && (
        <CircleMarker center={[form.pin.lat, form.pin.lng]} radius={8} pathOptions={{ color: 'var(--severity-critical)', fillColor: 'var(--severity-critical)', fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -8]} permanent>
            {t('citizen.report.step2.incidentPin')}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-lg px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step2.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          {t('citizen.report.step2.heading')}
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          {t('citizen.report.step2.desc')}
        </p>
      </div>

      <div
        className={[
          'incident-step2-map-shell relative overflow-hidden rounded-xl mb-3 border-2 transition-all duration-300',
          form.pin
            ? 'border-[#3B82F6] shadow-[0_8px_16px_rgba(15,23,42,0.14)]'
            : 'border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => setMapExpanded(true)}
          className="absolute top-2.5 right-2.5 z-[11] border border-white/70 bg-[#0F172AB8] text-white rounded-[10px] py-1.5 px-2.5 text-[11px] font-bold"
        >
          {t('citizen.report.step2.expandMap')}
        </button>

        {!form.pin && (
          <div className="incident-step2-map-hint absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0F172AE0] text-white rounded-lg py-2 px-3.5 text-xs font-semibold pointer-events-none z-10 flex max-w-[calc(100%-20px)] items-center justify-center gap-[7px] text-center shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
            <MapPin size={13} /> {t('citizen.report.step2.tapHint')}
          </div>
        )}
        {renderMap(320)}
      </div>

      {mapExpanded ? (
        <div className="fixed inset-0 z-[250] bg-[#0B1220] flex flex-col">
          <div className="flex items-center justify-between gap-3 px-[14px] py-3 text-white border-b border-white/[0.15]">
            <div className="text-[13px] font-bold">{t('citizen.report.step2.expandedMapTitle')}</div>
            <button
              type="button"
              onClick={() => setMapExpanded(false)}
              className="border border-white/25 bg-white/[0.08] text-white rounded-[10px] py-1.5 px-3 text-xs font-bold cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
          <div className="flex-1">{renderMap('100%')}</div>
          <div className="px-[14px] py-2.5 text-[#BFDBFE] text-xs">
            {t('citizen.report.step2.expandedMapTip')}
          </div>
        </div>
      ) : null}

      {/* Pin confirmation chip */}
      {form.pin ? (
        <div className="incident-step2-pin-chip bg-[#EFF6FF] rounded-[10px] p-[12px_14px] border-[1.5px] border-[#93C5FD] mb-3 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-[10px] bg-[#DBEAFE] flex items-center justify-center text-primary shrink-0">
            <MapPin size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[13px] text-[#1E293B]">{form.pin.barangay}</div>
            <div className="text-[11px] text-[#3B82F6] mt-px font-medium">
              {t('citizen.report.step2.pinCoords', { district: form.pin.district, lat: form.pin.lat.toFixed(6), lng: form.pin.lng.toFixed(6) })}
            </div>
          </div>
          <button
            onClick={() => setForm(p => ({ ...p, pin: null }))}
            aria-label="Remove selected incident pin"
            className="icon-btn-square icon-btn-sm incident-step2-pin-clear bg-black/5 text-[#64748B] rounded-lg inline-flex items-center justify-center shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Use registered location button */
        <button
          onClick={() => placePin(assignedBarangayCenter[0], assignedBarangayCenter[1])}
          disabled={!hasBarangayProfile}
          className={[
            'w-full mb-3 rounded-[13px] border-[1.5px] border-[#BFDBFE] bg-[#EFF6FF] text-primary font-bold text-[13px] flex items-center justify-center gap-2 p-[13px] transition-all duration-150',
            !hasBarangayProfile ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
        >
          <Navigation size={15} /> {t('citizen.report.step2.useRegisteredLocation')}
        </button>
      )}

      {!hasBarangayProfile ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {t('citizen.report.step2.noBarangayProfile')}
        </div>
      ) : null}

      {form.pin && hasBarangayProfile && !pinInSupportedArea ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {t('citizen.report.step2.pinOutsideBoundary')}
        </div>
      ) : null}

      {pinValidationInFlight ? (
        <div className="mb-3 text-xs text-primary">
          {t('citizen.report.step2.validatingPin')}
        </div>
      ) : null}

      {pinValidationError ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {pinValidationError}
        </div>
      ) : null}

      {form.pin && hasBarangayProfile && pinInSupportedArea && form.pin.isCrossBarangay ? (
        <div className="mb-3 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] text-xs p-[9px_11px]">
          {t('citizen.report.step2.crossBarangayNotice', { barangay: form.pin.barangay })}
        </div>
      ) : null}

      {/* Address text input */}
      <div>
        <label className="text-[11px] font-bold text-[#475569] block mb-[7px] uppercase tracking-[0.07em]">
          {t('citizen.report.step2.addressLabel')}
        </label>
        <input
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          placeholder={t('citizen.report.step2.addressPlaceholder')}
          className="incident-step2-address-input"
        />
      </div>

      {validationError ? (
        <div className="mt-2.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP 3 - DESCRIPTION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Step3({
  form,
  setForm,
  validationError,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
}) {
  const { t } = useTranslation();
  const MAX = 500;
  const QUICK_TAGS = [
    { key: 'citizen.report.tag.peopleDanger',    en: 'People in danger' },
    { key: 'citizen.report.tag.propertyDamage',  en: 'Property damage' },
    { key: 'citizen.report.tag.roadBlocked',     en: 'Road blocked' },
    { key: 'citizen.report.tag.spreadingRapidly',en: 'Spreading rapidly' },
    { key: 'citizen.report.tag.multipleVictims', en: 'Multiple victims' },
    { key: 'citizen.report.tag.ongoingSituation',en: 'Ongoing situation' },
    { key: 'citizen.report.tag.needsEvacuation', en: 'Needs evacuation' },
    { key: 'citizen.report.tag.structuralDamage',en: 'Structural damage' },
    { key: 'citizen.report.tag.childrenInvolved',en: 'Children involved' },
    { key: 'citizen.report.tag.elderlyAtRisk',   en: 'Elderly at risk' },
  ];

  const toggleTag = (tag: string) => {
    setForm((p) => {
      if (p.quickTags.includes(tag)) {
        return {
          ...p,
          quickTags: p.quickTags.filter((item) => item !== tag),
        };
      }
      return { ...p, quickTags: [...p.quickTags, tag] };
    });
  };

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-[18px]">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-[20px] px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step3.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          {t('citizen.report.step3.heading')}
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          {t('citizen.report.step3.desc')}
        </p>
      </div>

      {/* Tip box */}
      <div className="bg-[#FFFBEB] rounded-xl p-[12px_14px] border border-[#FDE68A] mb-[18px] flex gap-2.5 items-start">
        <Info size={14} color="var(--severity-medium)" className="shrink-0 mt-px" />
        <div className="text-xs text-[#92400E] leading-relaxed">
          <strong>{t('citizen.report.step3.tipLabel')}</strong> {t('citizen.report.step3.tipBody')}
        </div>
      </div>

      {/* Main textarea */}
      <div className="mb-[18px]">
        <div className="flex justify-between mb-[7px]">
          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.07em]">
            {t('citizen.report.step3.fieldLabel')}
          </label>
          <span
            className={[
              'text-[11px] font-semibold tabular-nums',
              form.description.length >= MAX * 0.9
                ? 'text-[var(--severity-critical)]'
                : form.description.length >= MAX * 0.7
                  ? 'text-[var(--severity-medium)]'
                  : 'text-[#94A3B8]',
            ].join(' ')}
          >
            {form.description.length}/{MAX}
          </span>
        </div>
        <textarea
          value={form.description}
          onChange={e => { if (e.target.value.length <= MAX) setForm(p => ({ ...p, description: e.target.value })); }}
          placeholder={t('citizen.report.step3.textareaPlaceholder')}
          rows={6}
          className={[
            'w-full p-[13px_14px] rounded-[14px] border-[1.5px] text-[13px] font-roboto outline-none resize-none box-border text-[#1E293B] leading-[1.65] transition-colors bg-white focus:border-[#3B82F6]',
            form.description.length >= MAX * 0.9 ? 'border-[#FCA5A5]' : 'border-[#E2E8F0]',
          ].join(' ')}
        />
      </div>

      {/* Quick tags */}
      <div className="mb-5">
        <div className="text-[11px] font-bold text-[#475569] mb-2 uppercase tracking-[0.07em]">
          {t('citizen.report.step3.quickTagsLabel')}
        </div>
        <div className="flex flex-wrap gap-[7px]">
          {QUICK_TAGS.map(tag => {
            const added = form.quickTags.includes(tag.en);
            return (
              <button
                key={tag.en}
                onClick={() => toggleTag(tag.en)}
                className={[
                  'py-1.5 px-[11px] rounded-[20px] border-[1.5px] text-[11px] font-semibold transition-all duration-200',
                  added
                    ? 'border-primary bg-[#EFF6FF] text-primary shadow-[0_1px_4px_rgba(30,58,138,0.12)]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]',
                ].join(' ')}
              >
                {added ? 'Selected ' : '+ '}{t(tag.key)}
              </button>
            );
          })}
        </div>

        {form.quickTags.length > 0 ? (
          <div className="mt-2.5 text-[11px] text-primary font-semibold">
            {t('citizen.report.step3.selectedTags', { tags: form.quickTags.join(', ') })}
          </div>
        ) : null}
      </div>

      {validationError ? (
        <div className="mb-3.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}

      {/* Affected persons */}
      <div>
        <label className="text-[11px] font-bold text-[#475569] block mb-2 uppercase tracking-[0.07em]">
          {t('citizen.report.step3.affectedLabel')}
        </label>
        <div className="incident-affected-grid grid grid-cols-4 gap-2">
          {[
            { val: '1-5', label: '1-5', sublabelKey: 'citizen.report.step3.affected.few' },
            { val: '6-20', label: '6-20', sublabelKey: 'citizen.report.step3.affected.several' },
            { val: '21-50', label: '21-50', sublabelKey: 'citizen.report.step3.affected.many' },
            { val: '50+', label: '50+', sublabelKey: 'citizen.report.step3.affected.large' },
          ].map(opt => {
            const sel = form.affectedCount === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => setForm(p => ({ ...p, affectedCount: sel ? null : opt.val }))}
                className={[
                  'py-3 px-1 rounded-xl border-2 text-center transition-all duration-200',
                  sel
                    ? 'border-primary bg-[#EFF6FF] shadow-[0_2px_8px_rgba(30,58,138,0.15)]'
                    : 'border-[#E2E8F0] bg-white',
                ].join(' ')}
              >
                <div className={['text-sm font-extrabold', sel ? 'text-primary' : 'text-[#1E293B]'].join(' ')}>{opt.label}</div>
                <div className={['mt-0.5 text-[9px] font-semibold', sel ? 'text-[#3B82F6]' : 'text-[#94A3B8]'].join(' ')}>{t(opt.sublabelKey)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .incident-affected-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP 4 - EVIDENCE UPLOAD
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Step4({
  form,
  setForm,
  validationError,
  showVoiceRecorder,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
  showVoiceRecorder: boolean;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [micError, setMicError] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef   = useRef<HTMLAudioElement | null>(null);
  const formRef      = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (previewIndex === null) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewIndex]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - form.photoPreviews.length);
    const previews = files.map(f => URL.createObjectURL(f));
    setForm(p => ({
      ...p,
      photoFiles: [...p.photoFiles, ...files],
      photoPreviews: [...p.photoPreviews, ...previews],
    }));
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setForm(p => ({
      ...p,
      photoFiles: p.photoFiles.filter((_, i) => i !== idx),
      photoPreviews: p.photoPreviews.filter((_, i) => i !== idx),
    }));
  };

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setForm(p => ({ ...p, audioBlob: blob, audioUrl: url }));
        stream.getTracks().forEach(t => t.stop());
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(prev => prev + 1), 1000);
    } catch {
      setMicError(t('citizen.report.step4.micError'));
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-[18px]">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-[20px] px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step4.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          {t('citizen.report.step4.heading')}
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          {t('citizen.report.step4.desc')}
        </p>
      </div>

      {validationError ? (
        <div className="mb-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}

      {/* â"€ Photo Upload â"€ */}
      <div className="bg-white rounded-[18px] border border-[#E2E8F0] p-[18px] mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-primary">
            <Camera size={17} />
          </div>
          <div>
            <div className="font-bold text-[14px] text-[#1E293B]">{t('citizen.report.step4.photoTitle')}</div>
            <div className="text-[11px] text-[#94A3B8]">{t('citizen.report.step4.photoSubtitle')}</div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          id="incident-photo-upload"
          type="file"
          accept="image/*"
          multiple
          title="Upload photo evidence"
          aria-label="Upload photo evidence"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        <div className="flex flex-wrap gap-2.5">
          {form.photoPreviews.map((src, i) => (
            <div key={i} className="w-[84px] h-[84px] rounded-[14px] overflow-hidden relative border-2 border-[#E2E8F0] shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.10)]">
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                className="p-0 m-0 w-full h-full border-none bg-transparent cursor-zoom-in"
              >
                <img src={src} alt={`evidence-${i}`} className="w-full h-full object-cover" />
              </button>
              <button
                onClick={() => removePhoto(i)}
                className="incident-step4-photo-remove-btn"
                aria-label={`Remove photo ${i + 1}`}
                title={`Remove photo ${i + 1}`}
              >
                <X size={11} />
              </button>
              <div className="incident-step4-photo-index-badge">
                {i + 1}
              </div>
            </div>
          ))}

          {form.photoPreviews.length < 4 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="incident-step4-photo-add-btn"
            >
              <Camera size={24} color="#94A3B8" />
              <span className="incident-step4-photo-add-text">
                {form.photoPreviews.length === 0 ? t('citizen.report.step4.addPhoto') : t('citizen.report.step4.addMore')}
              </span>
            </button>
          )}
        </div>

        {form.photoPreviews.length > 0 && (
          <div className="mt-2.5 text-[11px] text-[#64748B] flex items-center gap-[5px]">
            <CheckCircle2 size={12} color="#059669" />
            {form.photoPreviews.length > 1
              ? t('citizen.report.step4.photosAttachedPlural', { count: form.photoPreviews.length })
              : t('citizen.report.step4.photosAttached', { count: form.photoPreviews.length })}
            {form.photoPreviews.length < 4 && ` - ${t('citizen.report.step4.photosRemaining', { count: 4 - form.photoPreviews.length })}`}
          </div>
        )}

      </div>

        {/* â"€ Voice Recording â"€ */}
        {showVoiceRecorder ? (
        <div className="bg-white rounded-[18px] border border-[#E2E8F0] p-[18px] shadow-sm">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
            <Mic size={17} />
          </div>
          <div>
            <div className="font-bold text-[14px] text-[#1E293B]">{t('citizen.report.step4.voiceTitle')}</div>
            <div className="text-[11px] text-[#94A3B8]">{t('citizen.report.step4.voiceSubtitle')}</div>
          </div>
        </div>

        {micError && (
          <div className="bg-[#FEF2F2] rounded-[10px] p-[10px_12px] mb-3 flex gap-2 items-start">
            <MicOff size={14} color="var(--severity-critical)" className="incident-step4-mic-error-icon" />
            <span className="text-xs text-severity-critical leading-[1.5]">{micError}</span>
          </div>
        )}

        {!form.audioUrl ? (
          /* Recording UI */
          <div className={`incident-step4-recorder-shell ${recording ? 'is-recording' : 'is-idle'}`}>
            {recording ? (
              <>
                {/* Waveform visual */}
                <div className="incident-step4-waveform">
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i} className="incident-step4-wavebar" />
                  ))}
                </div>

                <div className="text-center">
                  <div className="text-[28px] font-black text-severity-critical tabular-nums tracking-[0.04em] font-mono">
                    {fmt(recTime)}
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-[5px]">
                    <span className="incident-step4-recording-dot" />
                    {t('citizen.report.step4.recordingInProgress')}
                  </div>
                </div>

                <button
                  onClick={stopRecording}
                  className="incident-step4-rec-stop-btn"
                >
                  <Square size={14} fill="white" /> {t('citizen.report.step4.stopRecording')}
                </button>
              </>
            ) : (
              <>
                <div className="w-[60px] h-[60px] rounded-full bg-[#F1F5F9] flex items-center justify-center">
                  <Mic size={26} color="#94A3B8" />
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-bold text-[#1E293B]">{t('citizen.report.step4.recordVoiceNote')}</div>
                  <div className="text-xs text-[#94A3B8] mt-[3px]">{t('citizen.report.step4.tapToRecord')}</div>
                </div>
                <button
                  onClick={startRecording}
                  className="incident-step4-rec-start-btn"
                >
                  <Mic size={14} /> {t('citizen.report.step4.startRecording')}
                </button>
              </>
            )}
          </div>
        ) : (
          /* Playback UI */
          <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-[14px] p-[14px_16px] border-[1.5px] border-[#93C5FD] flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-primary shrink-0">
              <Mic size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] text-[#1E293B] mb-1.5">
                {t('citizen.report.step4.voiceAttached')}
              </div>
              <audio
                ref={audioElRef}
                src={form.audioUrl}
                controls
                className="incident-step4-audio-player"
              />
            </div>
            <button
              onClick={() => setForm(p => ({ ...p, audioBlob: null, audioUrl: null }))}
              className="bg-[#FEE2E2] border-none rounded-lg p-2 cursor-pointer text-severity-critical shrink-0 flex items-center"
              aria-label="Remove voice recording"
              title="Remove voice recording"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
      ) : (
        <div className="bg-[#F8FAFC] rounded-[14px] border border-[#E2E8F0] p-[12px_14px] text-[#475569] text-xs leading-relaxed">
          {t('citizen.report.step4.voiceUnavailable')}
        </div>
      )}

      {previewIndex !== null ? (
        <div
          className="citizen-photo-preview-overlay"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            className="citizen-photo-preview-close"
            type="button"
            onClick={() => setPreviewIndex(null)}
            aria-label="Close photo preview"
          >
            <X size={16} />
          </button>
          <div
            className="citizen-photo-preview-stage"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              className="citizen-photo-preview-image"
              src={form.photoPreviews[previewIndex]}
              alt={`preview-${previewIndex + 1}`}
            />
            <div className="citizen-photo-preview-count">
              {t('citizen.report.step4.photoPreviewCount', { current: previewIndex + 1, total: form.photoPreviews.length })}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes wave-bar {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.2); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP 5 - REVIEW & SUBMIT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Step5({
  form,
  reporterName,
  reporterBarangayCode,
}: {
  form: ReportForm;
  reporterName: string;
  reporterBarangayCode: string | null;
}) {
  const { t } = useTranslation();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const cat = CATEGORIES.find(c => c.type === form.category);
  const Icon = cat?.icon ?? MoreHorizontal;
  const categoryClass =
    form.category === 'Pollution'
      ? 'is-pollution'
      : form.category === 'Noise'
        ? 'is-noise'
        : form.category === 'Crime'
          ? 'is-crime'
          : form.category === 'Road Hazard'
            ? 'is-road-hazard'
            : 'is-other';

  const details = [
    {
      label: t('citizen.report.step5.fieldCategory'),
      icon: <Icon size={14} />,
      value: cat ? `${cat.label} - ${form.subcategory ?? t('citizen.report.step5.subcategoryNotSet')}` : t('citizen.report.step5.categoryNotSet'),
      accentClass: 'is-category',
    },
    {
      label: t('citizen.report.step5.fieldLocation'),
      icon: <MapPin size={14} />,
      value: form.address || (form.pin ? `${form.pin.barangay}, ${form.pin.district}` : t('citizen.report.step5.locationNotSet')),
      accentClass: 'is-location',
    },
    {
      label: t('citizen.report.step5.fieldDescription'),
      icon: <FileText size={14} />,
      value: form.description || t('citizen.report.step5.noDescription'),
      accentClass: 'is-description',
    },
    {
      label: t('citizen.report.step5.fieldAffected'),
      icon: <User size={14} />,
      value: form.affectedCount ? t('citizen.report.step5.affectedValue', { count: form.affectedCount }) : t('citizen.report.step5.affectedNotSpecified'),
      accentClass: 'is-affected',
    },
    {
      label: t('citizen.report.step5.fieldEvidence'),
      icon: <Camera size={14} />,
      value: [
        form.photoPreviews.length > 0
          ? (form.photoPreviews.length > 1
            ? t('citizen.report.step5.photoCountPlural', { count: form.photoPreviews.length })
            : t('citizen.report.step5.photoCount', { count: form.photoPreviews.length }))
          : null,
        form.audioUrl ? t('citizen.report.step5.voiceRecording') : null,
      ].filter(Boolean).join(' - ') || t('citizen.report.step5.noEvidence'),
      accentClass: 'is-evidence',
    },
    {
      label: t('citizen.report.step5.fieldReporter'),
      icon: <User size={14} />,
      value: `${reporterName} - ${reporterBarangayCode ? `Barangay ${reporterBarangayCode}` : t('citizen.report.step5.barangayNotSet')}`,
      accentClass: 'is-neutral',
    },
    {
      label: t('citizen.report.step5.fieldDateTime'),
      icon: <Clock size={14} />,
      value: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
      accentClass: 'is-neutral',
    },
  ];

  useEffect(() => {
    if (previewIndex === null) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewIndex]);

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 bg-[#FEF3C7] rounded-[20px] px-3 py-1 text-[#92400E] text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step5.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          {t('citizen.report.step5.heading')}
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          {t('citizen.report.step5.desc')}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-[20px] border-[1.5px] border-[#E2E8F0] overflow-hidden mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        {/* Card header with type color accent */}
        <div className={`incident-step5-card-head ${categoryClass}`}>
          <div className={`incident-step5-card-icon ${categoryClass}`}>
            <Icon size={24} />
          </div>
          <div>
            <div className="font-extrabold text-[17px] text-[#1E293B] leading-tight">
              {(cat?.label ?? t('citizen.report.step5.categoryNotSet'))} {t('citizen.report.step5.reportSuffix')}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              {t('citizen.report.step5.submittedBy', { name: reporterName, date: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) })}
            </div>
          </div>
          {/* Severity pill */}
          {form.severity && (
            <div
              className={[
                'incident-step5-severity-pill',
                form.severity === 'critical'
                  ? 'is-critical'
                  : form.severity === 'high'
                    ? 'is-high'
                    : form.severity === 'medium'
                      ? 'is-medium'
                      : 'is-low',
              ].join(' ')}
            >
              {form.severity}
            </div>
          )}
        </div>

        {/* Detail rows */}
        {details.map(({ label, icon, value, accentClass }, idx, arr) => (
          <div key={label} className={`incident-step5-detail-row${idx < arr.length - 1 ? ' has-divider' : ''}`}>
            <div className={`incident-step5-detail-icon ${accentClass}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.07em] mb-[3px]">
                {label}
              </div>
              <div className="text-[13px] text-[#1E293B] font-medium leading-[1.5] break-words">
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo thumbnails */}
      {form.photoPreviews.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-bold text-[#475569] mb-2 uppercase tracking-[0.07em]">
            {t('citizen.report.step5.attachedPhotos')}
          </div>
          <div className="flex gap-2">
            {form.photoPreviews.map((src, i) => (
              <div key={i} className="w-[68px] h-[68px] rounded-xl overflow-hidden border-2 border-[#E2E8F0] shrink-0 relative">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  className="w-full h-full border-none p-0 m-0 bg-transparent cursor-zoom-in"
                  aria-label={`Preview attached photo ${i + 1}`}
                  title={`Preview attached photo ${i + 1}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
                <div className="incident-step5-photo-overlay" />
                <div className="incident-step5-photo-badge">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal disclaimer */}
      <div className="bg-[#FFFBEB] rounded-[14px] p-3.5 border border-[#FDE68A] mb-1 flex gap-2.5 items-start">
        <Info size={15} color="var(--severity-medium)" className="incident-step5-disclaimer-icon" />
        <p className="text-xs text-[#78350F] leading-[1.65] m-0">
          {t('citizen.report.step5.disclaimer')}
        </p>
      </div>

      {previewIndex !== null ? (
        <div
          className="citizen-photo-preview-overlay"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            className="citizen-photo-preview-close"
            type="button"
            onClick={() => setPreviewIndex(null)}
            aria-label="Close photo preview"
          >
            <X size={16} />
          </button>
          <div
            className="citizen-photo-preview-stage"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              className="citizen-photo-preview-image"
              src={form.photoPreviews[previewIndex]}
              alt={`review-preview-${previewIndex + 1}`}
            />
            <div className="citizen-photo-preview-count">
              {t('citizen.report.step5.photoPreviewCount', { current: previewIndex + 1, total: form.photoPreviews.length })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SUCCESS SCREEN
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function SuccessScreen({ onDone, reportId }: { onDone: () => void; reportId: string }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); onDone(); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onDone]);

  const steps = [
    { labelKey: 'citizen.report.success.step1', done: true },
    { labelKey: 'citizen.report.success.step2', done: true },
    { labelKey: 'citizen.report.success.step3', done: true },
    { labelKey: 'citizen.report.success.step4', done: false },
  ];

  return (
    <div className="incident-success-overlay">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="incident-success-blob incident-success-blob-primary" />
        <div className="incident-success-blob incident-success-blob-alert" />
      </div>

      <div className="incident-success-content w-full max-w-[420px] flex flex-col items-center">
        {/* Success icon */}
        <div className="incident-success-icon-wrap">
          <CheckCircle2 size={54} color="#4ADE80" strokeWidth={1.5} />
        </div>

        <div className="font-black text-[28px] text-white mb-2 text-center leading-[1.15]">
          {t('citizen.report.success.heading')}
        </div>
        <div className="text-[14px] text-[#93C5FD] mb-6 text-center leading-[1.65] max-w-[320px]">
          {t('citizen.report.success.subtext')}
        </div>

        {/* Report ID card */}
        <div className="w-full bg-white/[0.08] border-[1.5px] border-white/[0.18] rounded-[18px] p-[18px_20px] mb-[22px] text-center backdrop-blur-[10px]">
          <div className="text-[10px] text-[#93C5FD] font-bold tracking-[0.12em] uppercase mb-1.5">
            {t('citizen.report.success.reportIdLabel')}
          </div>
          <div className="text-[28px] font-black text-white tracking-[0.06em] tabular-nums">
            {reportId}
          </div>
          <div className="text-[11px] text-white/50 mt-1.5">
            {t('citizen.report.success.reportIdHint')}
          </div>
        </div>

        {/* Response timeline */}
        <div className="w-full bg-white/[0.06] rounded-2xl p-4 mb-[22px] border border-white/[0.10]">
          <div className="text-[11px] font-bold text-[#93C5FD] tracking-[0.08em] uppercase mb-3">
            {t('citizen.report.success.responseStatusLabel')}
          </div>
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-2.5${i < steps.length - 1 ? ' mb-2.5' : ''}`}>
              <div className={`incident-success-step-dot ${s.done ? 'is-done' : 'is-pending'}`}>
                {s.done
                  ? <Check size={12} color="#4ADE80" strokeWidth={3} />
                  : <Clock size={11} color="rgba(255,255,255,0.3)" />
                }
              </div>
              <span className={`incident-success-step-label ${s.done ? 'is-done' : 'is-pending'}`}>
                {t(s.labelKey)}
              </span>
            </div>
          ))}
        </div>

        {/* Emergency note */}
        <div className="w-full bg-[rgba(185,28,28,0.15)] border border-[rgba(185,28,28,0.3)] rounded-xl p-[12px_14px] mb-[22px] flex items-center gap-2.5">
          <Phone size={16} color="#FCA5A5" className="incident-success-note-icon" />
          <span className="text-xs text-[#FCA5A5] leading-[1.5]">
            {t('citizen.report.success.emergencyNote')}
          </span>
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className="w-full bg-white border-none rounded-2xl p-4 text-primary font-extrabold text-[15px] cursor-pointer transition-opacity duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
        >
          {t('citizen.report.success.backBtn', { countdown })}
        </button>
      </div>

      <style>{`
        @keyframes successPop {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SubmissionLoadingOverlay() {
  const { t } = useTranslation();
  return (
    <div
      className="incident-submit-overlay"
      aria-live="polite"
      aria-busy="true"
      aria-label="Submitting report"
    >
      <div className="grid gap-3 justify-items-center text-center">
        <div
          role="status"
          aria-label="Submitting report"
          className="w-[108px] h-[108px] rounded-full bg-white/[0.92] shadow-[0_18px_40px_rgba(15,23,42,0.24)] relative flex items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="incident-submit-spinner-ring"
          />
          <img
            src="/favicon.svg"
            alt="TUGON"
            className="w-[42px] h-[42px] block drop-shadow-[0_2px_3px_rgba(15,23,42,0.15)]"
          />
        </div>
        <p className="m-0 text-[#DBEAFE] text-[13px] font-bold tracking-[0.02em]">
          {t('citizen.report.submitting')}
        </p>
      </div>
      <style>{`@keyframes incidentSubmitSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN EXPORT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const STEP_REQUIREMENTS: Record<number, (f: ReportForm) => string | null> = {
  1: (f) => {
    if (!f.category) return 'Select an incident category to continue.';
    if (!f.subcategory) return 'Select a subcategory to continue.';
    if (!f.severity) return 'Select incident severity to continue.';
    return null;
  },
  2: (f) => {
    if (!f.pin) return 'Drop a map pin inside a supported barangay boundary to continue.';
    if (!isPinWithinSupportedBarangay(f.pin)) {
      return 'Your pin must be inside a supported barangay boundary (251, 252, or 256).';
    }
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

export default function IncidentReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = getAuthSession();
  const fullName = session?.user.fullName?.trim() || 'Citizen User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CU';
  const [step, setStep]         = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { notificationItems: reportNotificationItems } = useCitizenReportNotifications();
  const contentRef              = useRef<HTMLDivElement>(null);

  const handleNotificationClick = React.useCallback((item: { action?: 'open-my-reports' | 'open-home'; reportId?: string }) => {
    if (item.action === 'open-my-reports') {
      if (item.reportId) {
        navigate(`/citizen/my-reports?reportId=${encodeURIComponent(item.reportId)}`);
      } else {
        navigate('/citizen/my-reports');
      }
    } else {
      navigate('/citizen');
    }

    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [navigate]);

  const handleSignOut = React.useCallback(() => {
    clearAuthSession();
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  const [form, setForm] = useState<ReportForm>({
    category: null, subcategory: null, requiresMediation: false, mediationWarning: null,
    severity: null, pin: null, address: '',
    description: '', quickTags: [], affectedCount: null,
    photoPreviews: [], photoFiles: [],
    audioUrl: null, audioBlob: null,
  });

  // Scroll content area to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const notificationItems = useMemo(() => {
    if (submitted) {
      const submittedItem = {
        icon: <FileText size={14} />,
        color: 'var(--primary)',
        bg: '#DBEAFE',
        title: 'Report submitted',
        desc: submittedReportId ? `Ticket ${submittedReportId} has been created.` : 'Your incident report was submitted successfully.',
        time: 'Just now',
        unread: true,
        action: 'open-my-reports' as const,
        reportId: submittedReportId || undefined,
      };

      return [submittedItem, ...reportNotificationItems].slice(0, 4);
    }

    return reportNotificationItems;
  }, [reportNotificationItems, submitted, submittedReportId]);

  const unreadNotificationCount = notificationItems.filter((item) => item.unread).length;

  useEffect(() => {
    const handleOutsideHeaderTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.citizen-web-header')) {
        return;
      }

      setNotifOpen(false);
      setProfileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsideHeaderTap);
    document.addEventListener('scroll', handleAnyScroll, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideHeaderTap);
      document.removeEventListener('scroll', handleAnyScroll, true);
    };
  }, []);

  const stepValidationMessage = STEP_REQUIREMENTS[step]?.(form) ?? null;
  const canProceed = !stepValidationMessage;
  const voiceAllowed = (form.category === 'Noise') || (form.subcategory?.toLowerCase().includes('noise') ?? false);
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const enableInlineEvidenceUpload = String(viteEnv?.VITE_ENABLE_EVIDENCE_INLINE_UPLOAD ?? '1') !== '0';

  useEffect(() => {
    if (voiceAllowed) {
      return;
    }

    setForm((prev) => {
      if (!prev.audioBlob && !prev.audioUrl) {
        return prev;
      }
      return {
        ...prev,
        audioBlob: null,
        audioUrl: null,
      };
    });
  }, [voiceAllowed]);

  const submitReport = async () => {
    if (!form.category || !form.subcategory) {
      setSubmitError('Category and subcategory are required.');
      return;
    }

    if (!form.pin) {
      setSubmitError('Drop a map pin inside a supported barangay boundary to continue.');
      setStep(2);
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const pinValidation = await citizenReportsApi.validateReportPin(form.pin.lat, form.pin.lng);
      if (!pinValidation.isAllowed) {
        setStep(2);
        throw new Error(
          pinValidation.message || 'Your pin must be inside a supported barangay boundary (251, 252, or 256).',
        );
      }

      const photoPayloads: Array<{ fileName: string; mimeType: string; dataUrl: string }> = [];
      let encodedAudio: { fileName: string; mimeType: string; dataUrl: string } | null = null;

      if (enableInlineEvidenceUpload) {
        const MAX_EVIDENCE_PAYLOAD_BYTES = 450_000;
        let runningEvidenceBytes = 0;

        for (const file of form.photoFiles.slice(0, 2)) {
          const compressedDataUrl = await compressImageToDataUrl(file);
          const candidateSize = compressedDataUrl.length;
          if (runningEvidenceBytes + candidateSize > MAX_EVIDENCE_PAYLOAD_BYTES) {
            continue;
          }

          photoPayloads.push({
            fileName: file.name,
            mimeType: 'image/jpeg',
            dataUrl: compressedDataUrl,
          });
          runningEvidenceBytes += candidateSize;
        }

        if (photoPayloads.length === 0) {
          throw new Error('Selected photos are too large to upload. Please attach at least one smaller photo.');
        }

        if (form.audioBlob) {
          const audioDataUrl = await blobToDataUrl(form.audioBlob);
          if (runningEvidenceBytes + audioDataUrl.length <= MAX_EVIDENCE_PAYLOAD_BYTES) {
            encodedAudio = {
              fileName: 'voice-note.webm',
              mimeType: form.audioBlob.type || 'audio/webm',
              dataUrl: audioDataUrl,
            };
          }
        }
      }

      const selectedPhotoCount = form.photoFiles.length;

      const response = await citizenReportsApi.submitReport({
        category: form.category,
        subcategory: form.subcategory,
        type: toLegacyIncidentType(form.category),
        requiresMediation: form.requiresMediation,
        mediationWarning: form.mediationWarning,
        latitude: form.pin?.lat ?? Number.NaN,
        longitude: form.pin?.lng ?? Number.NaN,
        location: form.address.trim() || `${form.pin?.barangay ?? 'Unknown location'}`,
        description: form.description.trim(),
        severity: form.severity ?? 'medium',
        affectedCount: form.affectedCount,
        photoCount: enableInlineEvidenceUpload ? photoPayloads.length : selectedPhotoCount,
        hasAudio: Boolean(form.audioBlob),
        photos: enableInlineEvidenceUpload ? photoPayloads : undefined,
        audio: enableInlineEvidenceUpload ? encodedAudio : null,
      });

      setSubmittedReportId(response.report.id);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit report right now.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = async () => {
    if (!canProceed && step < 5) {
      return;
    }

    if (step < 5) {
      setSubmitError('');
      setStep(s => s + 1);
      return;
    }

    await submitReport();
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigate('/citizen');
  };

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1WithValidation form={form} setForm={setForm} validationError={step === 1 ? stepValidationMessage || undefined : undefined} />,
    2: <Step2 form={form} setForm={setForm} validationError={step === 2 ? stepValidationMessage || undefined : undefined} />,
    3: <Step3 form={form} setForm={setForm} validationError={step === 3 ? stepValidationMessage || undefined : undefined} />,
    4: <Step4 form={form} setForm={setForm} showVoiceRecorder={voiceAllowed} validationError={step === 4 ? stepValidationMessage || undefined : undefined} />,
    5: <Step5 form={form} reporterName={fullName} reporterBarangayCode={session?.user.barangayCode ?? null} />,
  };

  return (
    <>
      {submitted && <SuccessScreen reportId={submittedReportId} onDone={() => navigate('/citizen')} />}
      {submitting && !submitted ? <SubmissionLoadingOverlay /> : null}

      <CitizenPageLayout
        header={
          <header className="citizen-report-header">
            <div className="citizen-report-header-inner">
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />

              <div className="flex items-center gap-2.5">
                <CitizenMobileMenu
                  activeKey="report"
                  onNavigate={(key) => {
                    if (key === 'report') navigate('/citizen/report');
                    else if (key === 'myreports') navigate('/citizen/my-reports');
                    else if (key === 'map') navigate('/citizen?tab=map');
                    else if (key === 'profile') navigate('/citizen?tab=profile');
                    else navigate('/citizen');
                  }}
                />
                <CitizenNotificationBellTrigger
                  unreadCount={unreadNotificationCount}
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                  }}
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                    }}
                    aria-label="Open profile actions"
                    aria-haspopup="menu"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#B4730A] to-[#F59E0B] text-xs font-bold text-white border-none"
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      className="absolute right-0 top-11 z-[200] w-[220px] overflow-hidden rounded-xl border border-[var(--outline-variant)]/45 bg-[var(--surface-container-lowest)] shadow-elevated divide-y divide-[var(--outline-variant)]/30"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/citizen?tab=profile');
                        }}
                        className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-semibold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)] focus-visible:bg-[var(--surface-container-high)] focus-visible:outline-none active:bg-[var(--surface-container)]"
                      >
                        {t('citizen.dashboard.openProfilePage')}
                      </button>
                      <div className="flex items-center justify-between gap-3 bg-[var(--surface-container-low)] px-3 py-2.5">
                        <div className="text-[11px] font-semibold text-[var(--outline)]">{t('common.language')}</div>
                        <LanguageToggle compact />
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full cursor-pointer border-none bg-transparent px-3 py-[11px] text-left text-[13px] font-bold text-destructive transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none active:bg-red-100/70"
                      >
                        {t('common.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <CitizenNotificationsPanel
                open={notifOpen}
                unreadCount={unreadNotificationCount}
                items={notificationItems}
                onItemClick={handleNotificationClick}
              />
            </div>
          </header>
        }
        sidebar={<CitizenDesktopNav activeKey="report" />}
        beforeMain={<StepIndicator current={step} />}
        afterMain={
          <>
            <div className="citizen-report-footer">
              <div className="flex gap-2.5">
              {step > 1 && (
                <button
                  onClick={goBack}
                  className="flex-1 p-[14px] rounded-[14px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] font-bold text-[14px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft size={16} /> {t('common.back')}
                </button>
              )}

              <button
                onClick={goNext}
                disabled={submitting || (!canProceed && step < 5)}
                className={[
                  'citizen-report-next-btn',
                  step === 1 ? 'is-single' : 'is-wide',
                  submitting || (!canProceed && step < 5)
                    ? 'is-disabled'
                    : step === 5
                      ? 'is-submit'
                      : 'is-default',
                ].join(' ')}
              >
                {submitting ? (
                  <>{t('citizen.report.submitting')}</>
                ) : step === 5 ? (
                  <>{t('citizen.report.step5.confirm')}</>
                ) : step === 4 ? (
                  <>{t('citizen.report.footer.continueToReview')} {'->'}</>
                ) : (
                  <>{t('citizen.report.footer.continue')} {'->'}</>
                )}
              </button>
              </div>
            </div>
            <style>{`
              @media (max-width: 900px) {
                .citizen-report-footer {
                  position: fixed !important;
                  left: 50% !important;
                  transform: translateX(-50%) !important;
                  max-width: 520px !important;
                }
              }

              @media (min-width: 901px) {
                .citizen-report-footer {
                  position: sticky !important;
                  left: 0 !important;
                  transform: none !important;
                  max-width: none !important;
                }
              }
            `}</style>
          </>
        }
        mobileMainPaddingBottom={96}
        desktopMainPaddingBottom={24}
        desktopMainMaxWidth={1320}
        mainOnClick={() => {
          if (notifOpen) {
            setNotifOpen(false);
          }
        }}
        mainOnScroll={() => {
          if (notifOpen) {
            setNotifOpen(false);
          }
        }}
      >
        {submitError && (
          <div className="citizen-content-shell mt-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-severity-critical text-xs p-[10px_12px]">
            {submitError}
          </div>
        )}
        <div className="citizen-report-content-wrap">
          {stepContent[step]}
        </div>
        <style>{`
          @media (min-width: 901px) {
            .citizen-report-content-wrap {
              max-width: 980px;
              margin: 0 auto;
            }
          }
        `}</style>
      </CitizenPageLayout>
    </>
  );
}

