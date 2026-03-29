import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
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
  color: string; bg: string; desc: string; emoji: string;
}[] = [
  { type: 'Pollution', label: 'Pollution', icon: Wind, color: '#0F766E', bg: '#CCFBF1', desc: 'Air, water, and waste pollution concerns', emoji: 'P' },
  { type: 'Noise', label: 'Noise', icon: Volume2, color: '#7C3AED', bg: '#EDE9FE', desc: 'Public noise disturbance incidents', emoji: 'N' },
  { type: 'Crime', label: 'Crime', icon: AlertCircle, color: 'var(--primary)', bg: '#DBEAFE', desc: 'Criminal and suspicious activity reports', emoji: 'C' },
  { type: 'Road Hazard', label: 'Road Hazard', icon: AlertTriangle, color: 'var(--severity-medium)', bg: '#FEF3C7', desc: 'Road, sidewalk, and street safety hazards', emoji: 'R' },
  { type: 'Other', label: 'Other', icon: MoreHorizontal, color: '#475569', bg: '#F1F5F9', desc: 'Unlisted general issues', emoji: 'O' },
];

const STEP_LABELS = ['Type', 'Location', 'Details', 'Evidence', 'Review'];

type LatLng = [number, number];
type LngLat = [number, number];

const EDGE_EPSILON = 1e-6;

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
  return (
    <div
      className="citizen-web-strip bg-white border-b border-slate-200"
      style={{ position: 'sticky', top: 60, zIndex: 40, paddingTop: 12, paddingBottom: 10 }}
    >
      <div className="citizen-web-strip-inner flex items-start">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const done = s < current;
          const active = s === current;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1">
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: done ? 'var(--primary)' : active ? 'var(--primary)' : '#F1F5F9',
                  color: done || active ? '#fff' : '#94A3B8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  border: active ? '2.5px solid #60A5FA' : done ? '2.5px solid var(--primary)' : '2px solid #E2E8F0',
                  boxShadow: 'none',
                  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                }}>
                  {done ? <Check size={14} strokeWidth={3} /> : s}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
                  color: active ? 'var(--primary)' : done ? '#64748B' : '#CBD5E1',
                  letterSpacing: '0.02em',
                }}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-[2.5px] mt-[14px] mx-[3px] rounded overflow-hidden bg-slate-200">
                  <div style={{
                    height: '100%', width: done ? '100%' : '0%',
                    background: 'var(--primary)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP 1 - INCIDENT TYPE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Step1({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
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
          Step 1 of 5
        </div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          What type of incident?
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          Select the category that best describes the situation you are reporting to the barangay.
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-[10px] mb-3.5">
        {CATEGORIES.map(({ type, label, icon: Icon, color, bg, desc, emoji }) => {
          const sel = form.category === type;
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
              style={{
                background: sel ? color : '#fff',
                border: `2px solid ${sel ? color : '#E8EEF4'}`,
                borderRadius: 12, padding: '14px 12px 12px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', gap: 10, textAlign: 'left',
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: sel ? '0 8px 16px rgba(15,23,42,0.14)' : '0 1px 3px rgba(0,0,0,0.06)',
                position: 'relative', overflow: 'hidden', minHeight: 124,
              }}
            >
              {/* Subtle bg pattern for unselected */}
              {!sel && (
                <div style={{
                  position: 'absolute', top: -20, right: -20, width: 70, height: 70,
                  borderRadius: 12, background: bg, opacity: 0.35,
                }} />
              )}
              {/* Checkmark badge */}
              {sel && (
                <div style={{
                  position: 'absolute', top: 10, right: 10, width: 22, height: 22,
                  borderRadius: 7, background: 'rgba(255,255,255,0.26)',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
              {/* Icon */}
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: sel ? 'rgba(255,255,255,0.22)' : bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: sel ? '#fff' : color, flexShrink: 0,
              }}>
                <Icon size={22} />
              </div>
              {/* Label & desc */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: sel ? '#fff' : '#1E293B', marginBottom: 3, lineHeight: 1.2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 10, color: sel ? 'rgba(255,255,255,0.78)' : '#94A3B8', lineHeight: 1.45 }}>
                  {desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Severity Row - appears after selecting a type */}
      <div ref={severitySectionRef} style={{
        overflow: 'hidden', maxHeight: form.category ? 200 : 0,
        transition: 'max-height 0.4s ease', opacity: form.category ? 1 : 0,
        transitionProperty: 'max-height, opacity',
      }}>
        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
          <div className="font-bold text-[13px] text-[#1E293B] mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} color="var(--severity-medium)" /> How severe is this incident?
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: 'low' as Severity,      label: 'Minor',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
              { k: 'medium' as Severity,   label: 'Moderate', color: 'var(--severity-medium)', bg: '#FEF3C7', border: '#FCD34D' },
              { k: 'high' as Severity,     label: 'Serious',  color: '#C2410C', bg: '#FFEDD5', border: '#FB923C' },
              { k: 'critical' as Severity, label: 'Critical', color: 'var(--severity-critical)', bg: '#FEE2E2', border: '#FCA5A5' },
            ].map(s => {
              const sel = form.severity === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => {
                    setForm(p => ({ ...p, severity: s.k }));
                    scrollToSection(subcategorySectionRef);
                  }}
                  style={{
                    padding: '10px 4px', borderRadius: 12,
                    border: `2px solid ${sel ? s.color : s.border}`,
                    background: sel ? s.bg : '#fff',
                    color: s.color, fontWeight: 700, fontSize: 10,
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s',
                    boxShadow: sel ? `0 2px 10px ${s.color}30` : 'none',
                    letterSpacing: '0.01em',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {form.category ? (
        <div ref={subcategorySectionRef} className="mt-3 bg-white border border-[#E2E8F0] rounded-[14px] p-3.5">
          <label className="block font-bold text-xs text-[#1E293B] mb-2">
            Select Subcategory
          </label>
          <select
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
  const session = getAuthSession();
  const userBarangayCode = session?.user.barangayCode ?? null;
  const allowedBarangays = userBarangayCode
    ? BARANGAY_BOUNDARIES.filter((barangay) => barangay.code === userBarangayCode)
    : [];
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pinValidationInFlight, setPinValidationInFlight] = useState(false);
  const [pinValidationError, setPinValidationError] = useState<string | null>(null);
  const hasBarangayProfile = allowedBarangays.length > 0;
  const assignedBarangayLabel = allowedBarangays[0]?.name ?? (userBarangayCode ? `Barangay ${userBarangayCode}` : 'your registered barangay');
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
      className="incident-step2-map"
      center={TONDO_MAP_CENTER}
      zoom={18}
      minZoom={17}
      maxZoom={22}
      maxBounds={TONDO_MAP_BOUNDS}
      maxBoundsViscosity={1}
      style={{ display: 'block', height, width: '100%' }}
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
            Incident Pin
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-lg px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">Step 2 of 5</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          Where did it happen?
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          Tap on OpenStreetMap to drop a pin inside the supported barangay boundaries.
        </p>
      </div>

      <div className="incident-step2-map-shell" style={{
        borderRadius: 12, overflow: 'hidden', marginBottom: 12,
        border: `2px solid ${form.pin ? '#3B82F6' : '#E2E8F0'}`,
        boxShadow: form.pin ? '0 8px 16px rgba(15,23,42,0.14)' : '0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        <button
          type="button"
          onClick={() => setMapExpanded(true)}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 11,
            border: '1px solid rgba(255,255,255,0.7)',
            background: 'rgba(15,23,42,0.72)',
            color: '#fff',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Expand Map
        </button>

        {!form.pin && (
          <div className="incident-step2-map-hint" style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.88)', color: '#fff',
            borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
            pointerEvents: 'none', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}>
            <MapPin size={13} /> Tap map to pin location
          </div>
        )}
        {renderMap(320)}
      </div>

      {mapExpanded ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            background: '#0B1220',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex items-center justify-between gap-3 px-[14px] py-3 text-white border-b border-white/[0.15]">
            <div className="text-[13px] font-bold">Expanded Map Pinning</div>
            <button
              type="button"
              onClick={() => setMapExpanded(false)}
              className="border border-white/25 bg-white/[0.08] text-white rounded-[10px] py-1.5 px-3 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex-1">{renderMap('100%')}</div>
          <div className="px-[14px] py-2.5 text-[#BFDBFE] text-xs">
            Tip: pinch or zoom in for precise pinning, then tap to place your incident pin.
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
              Pin: {form.pin.district} - lat {form.pin.lat.toFixed(6)}, lng {form.pin.lng.toFixed(6)}
            </div>
          </div>
          <button
            className="icon-btn-square icon-btn-sm incident-step2-pin-clear"
            onClick={() => setForm(p => ({ ...p, pin: null }))}
            aria-label="Remove selected incident pin"
            style={{
              background: 'rgba(0,0,0,0.06)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Use registered location button */
        <button
          onClick={() => placePin(assignedBarangayCenter[0], assignedBarangayCenter[1])}
          disabled={!hasBarangayProfile}
          style={{
            width: '100%', padding: '13px', borderRadius: 13,
            border: '1.5px solid #BFDBFE', background: '#EFF6FF',
            color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 12, transition: 'all 0.15s', opacity: !hasBarangayProfile ? 0.6 : 1,
          }}
        >
          <Navigation size={15} /> Use My Registered Location
        </button>
      )}

      {!hasBarangayProfile ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          Your account has no assigned barangay profile. Please contact barangay staff or super admin before submitting a report.
        </div>
      ) : null}

      {form.pin && hasBarangayProfile && !pinInSupportedArea ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          Pin is outside supported barangay boundaries. Please place the pin within Barangay 251, 252, or 256.
        </div>
      ) : null}

      {pinValidationInFlight ? (
        <div className="mb-3 text-xs text-primary">
          Validating selected pin against official barangay boundaries...
        </div>
      ) : null}

      {pinValidationError ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {pinValidationError}
        </div>
      ) : null}

      {form.pin && hasBarangayProfile && pinInSupportedArea && form.pin.isCrossBarangay ? (
        <div className="mb-3 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] text-xs p-[9px_11px]">
          This location is outside your registered barangay. Submission is allowed and will be classified as a cross-barangay incident routed to {form.pin.barangay}.
        </div>
      ) : null}

      {/* Address text input */}
      <div>
        <label className="text-[11px] font-bold text-[#475569] block mb-[7px] uppercase tracking-[0.07em]">
          Specific Address / Landmark
        </label>
        <input
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          placeholder="e.g. Near the church, Purok 3, beside the basketball court"
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 13,
            border: '1.5px solid #E2E8F0', fontSize: 13,
            fontFamily: 'Roboto, sans-serif', outline: 'none',
            boxSizing: 'border-box', color: '#1E293B', background: '#fff',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = '#3B82F6')}
          onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
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
  const MAX = 500;
  const charColor = form.description.length >= MAX * 0.9 ? 'var(--severity-critical)' : form.description.length >= MAX * 0.7 ? 'var(--severity-medium)' : '#94A3B8';

  const QUICK_TAGS = [
    'People in danger', 'Property damage', 'Road blocked', 'Spreading rapidly',
    'Multiple victims', 'Ongoing situation', 'Needs evacuation', 'Structural damage',
    'Children involved', 'Elderly at risk',
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
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-[20px] px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">Step 3 of 5</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          Describe the Incident
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          Provide as much detail as possible to help responders act quickly and effectively.
        </p>
      </div>

      {/* Tip box */}
      <div className="bg-[#FFFBEB] rounded-xl p-[12px_14px] border border-[#FDE68A] mb-[18px] flex gap-2.5 items-start">
        <Info size={14} color="var(--severity-medium)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div className="text-xs text-[#92400E] leading-relaxed">
          <strong>Good description:</strong> What is happening, how many people are involved, any immediate danger, and what has already been done.
        </div>
      </div>

      {/* Main textarea */}
      <div className="mb-[18px]">
        <div className="flex justify-between mb-[7px]">
          <label className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.07em]">
            Incident Description *
          </label>
          <span style={{ fontSize: 11, color: charColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {form.description.length}/{MAX}
          </span>
        </div>
        <textarea
          value={form.description}
          onChange={e => { if (e.target.value.length <= MAX) setForm(p => ({ ...p, description: e.target.value })); }}
          placeholder="Describe clearly what you can see or hear. Include any urgent details that responders should know immediately..."
          rows={6}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 14,
            border: `1.5px solid ${form.description.length >= MAX * 0.9 ? '#FCA5A5' : '#E2E8F0'}`,
            fontSize: 13, fontFamily: 'Roboto, sans-serif', outline: 'none',
            resize: 'none', boxSizing: 'border-box', color: '#1E293B', lineHeight: 1.65,
            transition: 'border-color 0.2s', background: '#fff',
          }}
          onFocus={e => { if (form.description.length < MAX * 0.9) e.target.style.borderColor = '#3B82F6'; }}
          onBlur={e => { e.target.style.borderColor = form.description.length >= MAX * 0.9 ? '#FCA5A5' : '#E2E8F0'; }}
        />
      </div>

      {/* Quick tags */}
      <div className="mb-5">
        <div className="text-[11px] font-bold text-[#475569] mb-2 uppercase tracking-[0.07em]">
          Quick Tags - tap to add
        </div>
        <div className="flex flex-wrap gap-[7px]">
          {QUICK_TAGS.map(tag => {
            const added = form.quickTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '6px 11px', borderRadius: 20,
                  border: `1.5px solid ${added ? 'var(--primary)' : '#E2E8F0'}`,
                  background: added ? '#EFF6FF' : '#F8FAFC',
                  color: added ? 'var(--primary)' : '#64748B',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
                  boxShadow: added ? '0 1px 4px rgba(30,58,138,0.12)' : 'none',
                }}
              >
                {added ? 'Selected ' : '+ '}{tag}
              </button>
            );
          })}
        </div>

        {form.quickTags.length > 0 ? (
          <div className="mt-2.5 text-[11px] text-primary font-semibold">
            Selected tags: {form.quickTags.join(', ')}
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
          Estimated People Affected
        </label>
        <div className="incident-affected-grid grid grid-cols-4 gap-2">
          {[
            { val: '1-5', label: '1-5', sublabel: 'Few' },
            { val: '6-20', label: '6-20', sublabel: 'Several' },
            { val: '21-50', label: '21-50', sublabel: 'Many' },
            { val: '50+', label: '50+', sublabel: 'Large' },
          ].map(opt => {
            const sel = form.affectedCount === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => setForm(p => ({ ...p, affectedCount: sel ? null : opt.val }))}
                style={{
                  padding: '12px 4px', borderRadius: 12,
                  border: `2px solid ${sel ? 'var(--primary)' : '#E2E8F0'}`,
                  background: sel ? '#EFF6FF' : '#fff',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s',
                  boxShadow: sel ? '0 2px 8px rgba(30,58,138,0.15)' : 'none',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, color: sel ? 'var(--primary)' : '#1E293B' }}>{opt.label}</div>
                <div style={{ fontSize: 9, color: sel ? '#3B82F6' : '#94A3B8', marginTop: 2, fontWeight: 600 }}>{opt.sublabel}</div>
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
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch {
      setMicError('Microphone access denied. Please allow microphone access in your browser settings to record audio.');
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
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-[20px] px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">Step 4 of 5 - Optional</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          Add Evidence
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          Photo evidence is required. Voice recording is only available for noise-related incidents.
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
            <div className="font-bold text-[14px] text-[#1E293B]">Photo Evidence</div>
            <div className="text-[11px] text-[#94A3B8]">Up to 4 photos - JPG, PNG</div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />

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
                style={{
                  position: 'absolute', top: 4, right: 4, width: 22, height: 22,
                  borderRadius: '50%', background: 'rgba(15,23,42,0.75)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={11} />
              </button>
              <div style={{
                position: 'absolute', bottom: 4, left: 4, background: 'rgba(15,23,42,0.6)',
                borderRadius: 4, padding: '1px 5px', color: '#fff', fontSize: 8, fontWeight: 700,
              }}>
                {i + 1}
              </div>
            </div>
          ))}

          {form.photoPreviews.length < 4 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 84, height: 84, borderRadius: 14,
                border: '2px dashed #CBD5E1', background: '#F8FAFC',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 5, cursor: 'pointer',
                transition: 'all 0.18s', flexShrink: 0,
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#3B82F6';
                (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1';
                (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
              }}
            >
              <Camera size={24} color="#94A3B8" />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textAlign: 'center', lineHeight: 1.3 }}>
                {form.photoPreviews.length === 0 ? 'Add\nPhoto' : 'Add\nMore'}
              </span>
            </button>
          )}
        </div>

        {form.photoPreviews.length > 0 && (
          <div className="mt-2.5 text-[11px] text-[#64748B] flex items-center gap-[5px]">
            <CheckCircle2 size={12} color="#059669" />
            {form.photoPreviews.length} photo{form.photoPreviews.length > 1 ? 's' : ''} attached
            {form.photoPreviews.length < 4 && ` - ${4 - form.photoPreviews.length} remaining`}
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
            <div className="font-bold text-[14px] text-[#1E293B]">Voice Recording</div>
            <div className="text-[11px] text-[#94A3B8]">Describe the situation verbally</div>
          </div>
        </div>

        {micError && (
          <div className="bg-[#FEF2F2] rounded-[10px] p-[10px_12px] mb-3 flex gap-2 items-start">
            <MicOff size={14} color="var(--severity-critical)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span className="text-xs text-severity-critical leading-[1.5]">{micError}</span>
          </div>
        )}

        {!form.audioUrl ? (
          /* Recording UI */
          <div style={{
            borderRadius: 14, padding: '20px 16px',
            border: `2px ${recording ? 'solid' : 'dashed'} ${recording ? '#FECACA' : '#E2E8F0'}`,
            background: recording ? '#FFF5F5' : '#FAFBFC',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            transition: 'all 0.3s',
          }}>
            {recording ? (
              <>
                {/* Waveform visual */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 40 }}>
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i} style={{
                      width: 3, borderRadius: 2,
                      background: 'var(--severity-critical)',
                      opacity: 0.7 + Math.sin(i * 0.8) * 0.3,
                      animation: `wave-bar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.06}s`,
                      height: `${20 + Math.abs(Math.sin(i * 1.2)) * 20}px`,
                    }} />
                  ))}
                </div>

                <div className="text-center">
                  <div className="text-[28px] font-black text-severity-critical tabular-nums tracking-[0.04em] font-mono">
                    {fmt(recTime)}
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-[5px]">
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: 'var(--severity-critical)',
                      display: 'inline-block', animation: 'blink 1s step-start infinite',
                    }} />
                    Recording in progress
                  </div>
                </div>

                <button
                  onClick={stopRecording}
                  style={{
                    background: 'linear-gradient(135deg, #B91C1C, #991B1B)',
                    border: 'none', borderRadius: 14, padding: '13px 28px',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(185,28,28,0.4)',
                  }}
                >
                  <Square size={14} fill="white" /> Stop Recording
                </button>
              </>
            ) : (
              <>
                <div className="w-[60px] h-[60px] rounded-full bg-[#F1F5F9] flex items-center justify-center">
                  <Mic size={26} color="#94A3B8" />
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-bold text-[#1E293B]">Record a Voice Note</div>
                  <div className="text-xs text-[#94A3B8] mt-[3px]">Tap to start recording</div>
                </div>
                <button
                  onClick={startRecording}
                  style={{
                    background: 'linear-gradient(135deg, #1E3A8A, #1e40af)',
                    border: 'none', borderRadius: 14, padding: '13px 28px',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(30,58,138,0.35)',
                  }}
                >
                  <Mic size={14} /> Start Recording
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
                Voice Recording Attached
              </div>
              <audio
                ref={audioElRef}
                src={form.audioUrl}
                controls
                style={{ width: '100%', height: 34 }}
              />
            </div>
            <button
              onClick={() => setForm(p => ({ ...p, audioBlob: null, audioUrl: null }))}
              className="bg-[#FEE2E2] border-none rounded-lg p-2 cursor-pointer text-severity-critical shrink-0 flex items-center"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
      ) : (
        <div className="bg-[#F8FAFC] rounded-[14px] border border-[#E2E8F0] p-[12px_14px] text-[#475569] text-xs leading-relaxed">
          Voice recording is only available for noise-related incidents.
        </div>
      )}

      {previewIndex !== null ? (
        <div
          className="citizen-photo-preview-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 260,
            background: 'rgba(2,6,23,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setPreviewIndex(null)}
        >
          <button
            className="citizen-photo-preview-close"
            type="button"
            onClick={() => setPreviewIndex(null)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(15,23,42,0.7)',
              color: '#fff',
              borderRadius: 999,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close photo preview"
          >
            <X size={16} />
          </button>
          <div
            className="citizen-photo-preview-stage"
            onClick={(event) => event.stopPropagation()}
            style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <img
              className="citizen-photo-preview-image"
              src={form.photoPreviews[previewIndex]}
              alt={`preview-${previewIndex + 1}`}
              style={{ maxWidth: '100%', maxHeight: 'calc(100dvh - 96px)', borderRadius: 12 }}
            />
            <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>
              Photo {previewIndex + 1} of {form.photoPreviews.length}
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const cat = CATEGORIES.find(c => c.type === form.category);
  const Icon = cat?.icon ?? MoreHorizontal;

  const details = [
    {
      label: 'Category',
      icon: <Icon size={14} />,
      value: cat ? `${cat.label} - ${form.subcategory ?? 'Subcategory not set'}` : 'Not set',
      accent: cat?.color ?? '#475569',
    },
    {
      label: 'Location',
      icon: <MapPin size={14} />,
      value: form.address || (form.pin ? `${form.pin.barangay}, ${form.pin.district}` : 'Location not set'),
      accent: 'var(--primary)',
    },
    {
      label: 'Description',
      icon: <FileText size={14} />,
      value: form.description || 'No description provided',
      accent: '#7C3AED',
    },
    {
      label: 'Affected Persons',
      icon: <User size={14} />,
      value: form.affectedCount ? `Approx. ${form.affectedCount} persons` : 'Not specified',
      accent: 'var(--severity-medium)',
    },
    {
      label: 'Evidence',
      icon: <Camera size={14} />,
      value: [
        form.photoPreviews.length > 0 ? `${form.photoPreviews.length} photo${form.photoPreviews.length > 1 ? 's' : ''}` : null,
        form.audioUrl ? '1 voice recording' : null,
      ].filter(Boolean).join(' - ') || 'None attached',
      accent: '#059669',
    },
    {
      label: 'Reporter',
      icon: <User size={14} />,
      value: `${reporterName} - ${reporterBarangayCode ? `Barangay ${reporterBarangayCode}` : 'Registered barangay not set'}`,
      accent: '#475569',
    },
    {
      label: 'Date & Time',
      icon: <Clock size={14} />,
      value: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
      accent: '#475569',
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
        <div className="inline-flex items-center gap-1.5 bg-[#FEF3C7] rounded-[20px] px-3 py-1 text-[#92400E] text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">Step 5 of 5 - Final Review</div>
        <h2 className="text-[20px] font-extrabold text-[#1E293B] mb-1.5 leading-tight">
          Review & Submit
        </h2>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          Please verify all details before submitting. You can go back to make changes.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-[20px] border-[1.5px] border-[#E2E8F0] overflow-hidden mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        {/* Card header with type color accent */}
        <div style={{
          background: cat ? `linear-gradient(135deg, ${cat.color}14, ${cat.color}08)` : '#F8FAFC',
          borderBottom: `3px solid ${cat?.color ?? '#E2E8F0'}`,
          padding: '18px 18px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: cat?.bg ?? '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cat?.color ?? '#475569', flexShrink: 0,
            boxShadow: `0 2px 8px ${cat?.color ?? '#000'}20`,
          }}>
            <Icon size={24} />
          </div>
          <div>
            <div className="font-extrabold text-[17px] text-[#1E293B] leading-tight">
              {cat?.label ?? 'Incident'} Report
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Submitted by {reporterName} - {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {/* Severity pill */}
          {form.severity && (
            <div style={{
              marginLeft: 'auto',
              background: form.severity === 'critical' ? '#FEE2E2' : form.severity === 'high' ? '#FFEDD5' : form.severity === 'medium' ? '#FEF3C7' : '#D1FAE5',
              color: form.severity === 'critical' ? 'var(--severity-critical)' : form.severity === 'high' ? '#C2410C' : form.severity === 'medium' ? 'var(--severity-medium)' : '#059669',
              borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {form.severity}
            </div>
          )}
        </div>

        {/* Detail rows */}
        {details.map(({ label, icon, value, accent }, idx, arr) => (
          <div key={label} style={{
            padding: '13px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
            borderBottom: idx < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: `${accent}14`, color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
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
            Attached Photos
          </div>
          <div className="flex gap-2">
            {form.photoPreviews.map((src, i) => (
              <div key={i} className="w-[68px] h-[68px] rounded-xl overflow-hidden border-2 border-[#E2E8F0] shrink-0 relative">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  className="w-full h-full border-none p-0 m-0 bg-transparent cursor-zoom-in"
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4))',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: 3, right: 3,
                  background: 'rgba(0,0,0,0.6)', borderRadius: 4,
                  padding: '1px 4px', color: '#fff', fontSize: 8, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal disclaimer */}
      <div className="bg-[#FFFBEB] rounded-[14px] p-3.5 border border-[#FDE68A] mb-1 flex gap-2.5 items-start">
        <Info size={15} color="var(--severity-medium)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs text-[#78350F] leading-[1.65] m-0">
          By submitting this report, you certify that the information provided is <strong>true and accurate</strong> to the best of your knowledge. Filing a false incident report is a punishable offense under Philippine law (RA 10173, LGU ordinances).
        </p>
      </div>

      {previewIndex !== null ? (
        <div
          className="citizen-photo-preview-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 260,
            background: 'rgba(2,6,23,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setPreviewIndex(null)}
        >
          <button
            className="citizen-photo-preview-close"
            type="button"
            onClick={() => setPreviewIndex(null)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(15,23,42,0.7)',
              color: '#fff',
              borderRadius: 999,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close photo preview"
          >
            <X size={16} />
          </button>
          <div
            className="citizen-photo-preview-stage"
            onClick={(event) => event.stopPropagation()}
            style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <img
              className="citizen-photo-preview-image"
              src={form.photoPreviews[previewIndex]}
              alt={`review-preview-${previewIndex + 1}`}
              style={{ maxWidth: '100%', maxHeight: 'calc(100dvh - 96px)', borderRadius: 12 }}
            />
            <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>
              Photo {previewIndex + 1} of {form.photoPreviews.length}
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
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onDone(); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDone]);

  const steps = [
    { label: 'Report received by system', done: true },
    { label: 'Forwarded to barangay officials', done: true },
    { label: 'Response unit notified', done: true },
    { label: 'On-site assessment pending', done: false },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 55%, #1e40af 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px',
      fontFamily: "'Roboto', sans-serif",
    }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(185,28,28,0.08)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }} className="w-full max-w-[420px] flex flex-col items-center">
        {/* Success icon */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(74,222,128,0.15)',
          border: '2.5px solid rgba(74,222,128,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22, animation: 'successPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275)',
        }}>
          <CheckCircle2 size={54} color="#4ADE80" strokeWidth={1.5} />
        </div>

        <div className="font-black text-[28px] text-white mb-2 text-center leading-[1.15]">
          Report Submitted!
        </div>
        <div className="text-[14px] text-[#93C5FD] mb-6 text-center leading-[1.65] max-w-[320px]">
          Your incident report has been received and routed to the appropriate response units in your barangay.
        </div>

        {/* Report ID card */}
        <div className="w-full bg-white/[0.08] border-[1.5px] border-white/[0.18] rounded-[18px] p-[18px_20px] mb-[22px] text-center backdrop-blur-[10px]">
          <div className="text-[10px] text-[#93C5FD] font-bold tracking-[0.12em] uppercase mb-1.5">
            Your Report ID
          </div>
          <div className="text-[28px] font-black text-white tracking-[0.06em] tabular-nums">
            {reportId}
          </div>
          <div className="text-[11px] text-white/50 mt-1.5">
            Use this ID to track your report under "My Reports"
          </div>
        </div>

        {/* Response timeline */}
        <div className="w-full bg-white/[0.06] rounded-2xl p-4 mb-[22px] border border-white/[0.10]">
          <div className="text-[11px] font-bold text-[#93C5FD] tracking-[0.08em] uppercase mb-3">
            Response Status
          </div>
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-2.5${i < steps.length - 1 ? ' mb-2.5' : ''}`}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: s.done ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${s.done ? '#4ADE80' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.done
                  ? <Check size={12} color="#4ADE80" strokeWidth={3} />
                  : <Clock size={11} color="rgba(255,255,255,0.3)" />
                }
              </div>
              <span style={{ fontSize: 12, color: s.done ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: s.done ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Emergency note */}
        <div className="w-full bg-[rgba(185,28,28,0.15)] border border-[rgba(185,28,28,0.3)] rounded-xl p-[12px_14px] mb-[22px] flex items-center gap-2.5">
          <Phone size={16} color="#FCA5A5" style={{ flexShrink: 0 }} />
          <span className="text-xs text-[#FCA5A5] leading-[1.5]">
            <strong>In immediate danger?</strong> Call <strong>911</strong> now without waiting for a response.
          </span>
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className="w-full bg-white border-none rounded-2xl p-4 text-primary font-extrabold text-[15px] cursor-pointer transition-opacity duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
        >
          Back to Citizen Portal ({countdown}s)
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
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 290,
        background: 'rgba(15, 23, 42, 0.34)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
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
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 9999,
              border: '4px solid rgba(30, 58, 138, 0.16)',
              borderTopColor: 'var(--severity-critical)',
              borderRightColor: 'var(--primary)',
              animation: 'incidentSubmitSpin 0.9s linear infinite',
            }}
          />
          <img
            src="/favicon.svg"
            alt="TUGON"
            className="w-[42px] h-[42px] block drop-shadow-[0_2px_3px_rgba(15,23,42,0.15)]"
          />
        </div>
        <p className="m-0 text-[#DBEAFE] text-[13px] font-bold tracking-[0.02em]">
          Submitting your incident report...
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
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
      setMobileMenuOpen(false);
    };

    const handleAnyScroll = () => {
      setNotifOpen(false);
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
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
        hideBottomNav
        header={
          <header
            className="citizen-web-header"
            style={{
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            height: 60,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 2px 8px rgba(15,23,42,0.14)',
          }}
          >
            <div
              className="citizen-web-header-inner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '0 var(--citizen-content-gutter)',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <RoleHomeLogo to="/citizen" ariaLabel="Go to citizen home" alt="TUGON Citizen Portal" />

              <div className="flex items-center gap-2.5">
                <CitizenMobileMenu
                  activeKey="report"
                  open={mobileMenuOpen}
                  onToggle={() => {
                    setMobileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                    setProfileMenuOpen(false);
                  }}
                  onNavigate={(key) => {
                    setMobileMenuOpen(false);
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
                    setMobileMenuOpen(false);
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                      setMobileMenuOpen(false);
                    }}
                    aria-label="Open profile actions"
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    className="w-9 h-9 rounded-[10px] bg-severity-medium flex items-center justify-center text-white font-extrabold text-[14px] border-none cursor-pointer"
                  >
                    {initials}
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile actions"
                      style={{
                        position: 'absolute',
                        top: 44,
                        right: 0,
                        width: 190,
                        background: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 8px 18px rgba(15,23,42,0.12)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        zIndex: 110,
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/citizen?tab=profile');
                        }}
                        className="w-full text-left px-3 py-[11px] bg-white border-none border-b border-[#F1F5F9] text-[#1E293B] text-[13px] font-semibold cursor-pointer"
                      >
                        Open profile page
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full text-left px-3 py-[11px] bg-white border-none text-severity-critical text-[13px] font-bold cursor-pointer"
                      >
                        Sign out
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
        beforeMain={
          <>
            <CitizenDesktopNav activeKey="report" />
            <StepIndicator current={step} />
          </>
        }
        afterMain={
          <>
            <div className="citizen-report-footer" style={{
              position: 'sticky', bottom: 0, left: 0, transform: 'none',
              width: '100%', maxWidth: 'var(--citizen-desktop-main-max)', margin: '0 auto', background: '#fff',
              borderTop: '1px solid #E2E8F0', padding: '12px var(--citizen-content-gutter)',
              display: 'block', zIndex: 50,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
              boxSizing: 'border-box',
            }}>
              <div className="flex gap-2.5">
              {step > 1 && (
                <button
                  onClick={goBack}
                  className="flex-1 p-[14px] rounded-[14px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] font-bold text-[14px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              <button
                onClick={goNext}
                disabled={submitting || (!canProceed && step < 5)}
                style={{
                  flex: step === 1 ? 1 : 2,
                  padding: '14px', borderRadius: 14, border: 'none',
                  background: (!canProceed && step < 5) || submitting
                    ? '#E2E8F0'
                    : step === 5
                      ? 'var(--severity-critical)'
                      : 'var(--primary)',
                  color: (canProceed || step === 5) && !submitting ? '#fff' : '#94A3B8',
                  fontWeight: 700, fontSize: 14,
                  cursor: (canProceed || step === 5) && !submitting ? 'pointer' : 'not-allowed',
                  boxShadow: (canProceed || step === 5) && !submitting
                    ? '0 4px 12px rgba(15,23,42,0.16)'
                    : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? (
                  <>Submitting...</>
                ) : step === 5 ? (
                  <>Submit Report</>
                ) : step === 4 ? (
                  <>Continue to Review {'->'}</>
                ) : (
                  <>Continue {'->'}</>
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
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
        }}
        mainOnScroll={() => {
          if (notifOpen) {
            setNotifOpen(false);
          }
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
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

