import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, ChevronLeft, Check, MapPin, Navigation,
  Flame, Wind, Volume2, AlertCircle, AlertTriangle, MoreHorizontal,
  Camera, Mic, MicOff, Square, Trash2,
  FileText, User, Clock, CheckCircle2, Info, X, Phone,
} from 'lucide-react';
import { citizenReportsApi } from '../services/citizenReportsApi';

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
type IncidentCategory = 'fire' | 'pollution' | 'noise' | 'crime' | 'road_hazard' | 'other';
type Severity = 'low' | 'medium' | 'high' | 'critical';
interface PinData { x: number; y: number; barangay: string; district: string; }
interface ReportForm {
  category: IncidentCategory | null;
  severity: Severity | null;
  pin: PinData | null;
  address: string;
  description: string;
  affectedCount: string | null;
  photoPreviews: string[];
  photoFiles: File[];
  audioUrl: string | null;
  audioBlob: Blob | null;
}

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════ */
const CATEGORIES: {
  type: IncidentCategory; label: string; icon: React.FC<{ size?: number }>;
  color: string; bg: string; desc: string; emoji: string;
}[] = [
  { type: 'fire',       label: 'Fire',        icon: Flame,         color: '#B91C1C', bg: '#FEE2E2', desc: 'Building, vehicle, or grass fire', emoji: '🔥' },
  { type: 'pollution',  label: 'Pollution',   icon: Wind,          color: '#0F766E', bg: '#CCFBF1', desc: 'Air, water, or soil contamination', emoji: '💨' },
  { type: 'noise',      label: 'Noise',       icon: Volume2,       color: '#7C3AED', bg: '#EDE9FE', desc: 'Excessive noise disturbance',        emoji: '🔊' },
  { type: 'crime',      label: 'Crime',       icon: AlertCircle,   color: '#1E3A8A', bg: '#DBEAFE', desc: 'Robbery, vandalism, suspicion',      emoji: '🚨' },
  { type: 'road_hazard',label: 'Road Hazard', icon: AlertTriangle, color: '#B4730A', bg: '#FEF3C7', desc: 'Potholes, accidents, obstructions',  emoji: '⚠️' },
  { type: 'other',      label: 'Other',       icon: MoreHorizontal,color: '#475569', bg: '#F1F5F9', desc: 'Other community concern',           emoji: '📋' },
];

const STEP_LABELS = ['Type', 'Location', 'Details', 'Evidence', 'Review'];

const DISTRICTS_MAP = [
  { id: 'D1', label: 'District I',   x: 90,  y: 10,  w: 190, h: 230, fill: '#EFF6FF', stroke: '#93C5FD', sw: 1.5 },
  { id: 'D2', label: 'District II',  x: 285, y: 10,  w: 210, h: 230, fill: '#DBEAFE', stroke: '#3B82F6', sw: 2.5 },
  { id: 'D3', label: 'District III', x: 500, y: 10,  w: 210, h: 230, fill: '#F0FDF4', stroke: '#86EFAC', sw: 1.5 },
  { id: 'D4', label: 'District IV',  x: 90,  y: 245, w: 620, h: 230, fill: '#FDF4FF', stroke: '#D8B4FE', sw: 1.5 },
];

const MAP_BUILDINGS = [
  {x:100,y:20,w:70,h:65},{x:190,y:20,w:75,h:65},{x:300,y:20,w:90,h:65},
  {x:410,y:20,w:60,h:90},{x:515,y:20,w:70,h:65},{x:615,y:20,w:60,h:65},
  {x:100,y:115,w:70,h:55},{x:515,y:115,w:75,h:55},{x:615,y:120,w:60,h:60},
  {x:190,y:270,w:70,h:65},{x:300,y:265,w:80,h:65},{x:510,y:265,w:75,h:65},
  {x:615,y:265,w:65,h:65},{x:100,y:360,w:70,h:80},{x:190,y:365,w:90,h:70},
  {x:300,y:355,w:80,h:80},{x:405,y:360,w:80,h:75},{x:510,y:360,w:80,h:75},
];

function detectLocation(x: number, y: number): { barangay: string; district: string } {
  if (x >= 285 && x <= 495 && y >= 10 && y <= 240)
    return { barangay: y < 130 ? 'Brgy. San Antonio' : 'Brgy. Tumana', district: 'District II' };
  if (x >= 90 && x <= 280 && y >= 10 && y <= 240)
    return { barangay: y < 150 ? 'Brgy. Bagong Silang' : 'Brgy. Riverside', district: 'District I' };
  if (x >= 500 && x <= 710 && y >= 10 && y <= 240)
    return { barangay: y < 150 ? 'Brgy. Makiling' : 'Brgy. Balintawak', district: 'District III' };
  if (y >= 245)
    return { barangay: x < 280 ? 'Brgy. Bagbaguin' : x < 450 ? 'Brgy. Bagumbayan' : 'Brgy. Longos', district: 'District IV' };
  return { barangay: 'Brgy. Poblacion', district: 'District II' };
}

/* ══════════════════════════════════════════════════════════════════
   STEP PROGRESS INDICATOR
══════════════════════════════════════════════════════════════════ */
function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', padding: '12px 20px 10px',
      background: '#fff', borderBottom: '1px solid #E2E8F0',
      position: 'sticky', top: 60, zIndex: 40,
    }}>
      {STEP_LABELS.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: done ? '#1E3A8A' : active ? '#1E3A8A' : '#F1F5F9',
                color: done || active ? '#fff' : '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                border: active ? '2.5px solid #60A5FA' : done ? '2.5px solid #1E3A8A' : '2px solid #E2E8F0',
                boxShadow: active ? '0 0 0 5px rgba(30,58,138,0.10)' : 'none',
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
              }}>
                {done ? <Check size={14} strokeWidth={3} /> : s}
              </div>
              <span style={{
                fontSize: 9, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
                color: active ? '#1E3A8A' : done ? '#64748B' : '#CBD5E1',
                letterSpacing: '0.02em',
              }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: 1, height: 2.5, margin: '14px 3px 0',
                borderRadius: 2, overflow: 'hidden',
                background: '#E2E8F0',
              }}>
                <div style={{
                  height: '100%', width: done ? '100%' : '0%',
                  background: 'linear-gradient(90deg, #1E3A8A, #3B82F6)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STEP 1 — INCIDENT TYPE
══════════════════════════════════════════════════════════════════ */
function Step1({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
  return (
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#EFF6FF', borderRadius: 20, padding: '4px 12px',
          color: '#1E3A8A', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>
          Step 1 of 5
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 6, lineHeight: 1.2 }}>
          What type of incident?
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          Select the category that best describes the situation you are reporting to the barangay.
        </p>
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {CATEGORIES.map(({ type, label, icon: Icon, color, bg, desc, emoji }) => {
          const sel = form.category === type;
          return (
            <button
              key={type}
              onClick={() => setForm(p => ({ ...p, category: type }))}
              style={{
                background: sel ? `linear-gradient(145deg, ${color}, ${color}CC)` : '#fff',
                border: `2px solid ${sel ? color : '#E8EEF4'}`,
                borderRadius: 18, padding: '18px 14px 14px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', gap: 10, textAlign: 'left',
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: sel ? `0 8px 24px ${color}38` : '0 1px 3px rgba(0,0,0,0.06)',
                position: 'relative', overflow: 'hidden', minHeight: 140,
              }}
            >
              {/* Subtle bg pattern for unselected */}
              {!sel && (
                <div style={{
                  position: 'absolute', top: -20, right: -20, width: 70, height: 70,
                  borderRadius: '50%', background: bg, opacity: 0.5,
                }} />
              )}
              {/* Checkmark badge */}
              {sel && (
                <div style={{
                  position: 'absolute', top: 10, right: 10, width: 22, height: 22,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
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

      {/* Severity Row — appears after selecting a type */}
      <div style={{
        overflow: 'hidden', maxHeight: form.category ? 200 : 0,
        transition: 'max-height 0.4s ease', opacity: form.category ? 1 : 0,
        transitionProperty: 'max-height, opacity',
      }}>
        <div style={{
          background: '#F8FAFC', borderRadius: 16, padding: '16px',
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} color="#B4730A" /> How severe is this incident?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { k: 'low' as Severity,      label: 'Minor',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
              { k: 'medium' as Severity,   label: 'Moderate', color: '#B4730A', bg: '#FEF3C7', border: '#FCD34D' },
              { k: 'high' as Severity,     label: 'Serious',  color: '#C2410C', bg: '#FFEDD5', border: '#FB923C' },
              { k: 'critical' as Severity, label: 'Critical', color: '#B91C1C', bg: '#FEE2E2', border: '#FCA5A5' },
            ].map(s => {
              const sel = form.severity === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => setForm(p => ({ ...p, severity: s.k }))}
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
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STEP 2 — LOCATION
══════════════════════════════════════════════════════════════════ */
function Step2({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const getSVGCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const svgW = 800, svgH = 480;
    const cA = rect.width / rect.height;
    const sA = svgW / svgH;
    let offX = 0, offY = 0, scale = 1;
    if (cA > sA) { scale = rect.height / svgH; offX = (rect.width - svgW * scale) / 2; }
    else          { scale = rect.width  / svgW; offY = (rect.height - svgH * scale) / 2; }
    const x = (clientX - rect.left - offX) / scale;
    const y = (clientY - rect.top  - offY) / scale;
    if (x < 0 || x > svgW || y < 0 || y > svgH) return null;
    return { x, y };
  }, []);

  const placePin = useCallback((x: number, y: number) => {
    const { barangay, district } = detectLocation(x, y);
    setForm(p => ({
      ...p,
      pin: { x, y, barangay, district },
      address: p.address || `${barangay}, ${district}`,
    }));
  }, [setForm]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = getSVGCoords(e.clientX, e.clientY);
    if (pt) placePin(pt.x, pt.y);
  };

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    const pt = getSVGCoords(t.clientX, t.clientY);
    if (pt) placePin(pt.x, pt.y);
  };

  const H_ROADS = [245]; const V_ROADS = [285, 500];
  const H_MINOR = [100, 155, 355, 410]; const V_MINOR = [180, 385, 605];

  return (
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF',
          borderRadius: 20, padding: '4px 12px', color: '#1E3A8A',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>Step 2 of 5</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 6, lineHeight: 1.2 }}>
          Where did it happen?
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          Tap anywhere on the map to drop a pin. Your registered barangay boundary is highlighted in blue.
        </p>
      </div>

      {/* Interactive Map */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', marginBottom: 12,
        border: `2.5px solid ${form.pin ? '#3B82F6' : '#E2E8F0'}`,
        boxShadow: form.pin ? '0 6px 24px rgba(59,130,246,0.18)' : '0 2px 10px rgba(0,0,0,0.08)',
        cursor: 'crosshair', position: 'relative',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        {/* Overlay hint when no pin */}
        {!form.pin && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30,58,138,0.9)', backdropFilter: 'blur(8px)', color: '#fff',
            borderRadius: 24, padding: '8px 18px', fontSize: 12, fontWeight: 600,
            pointerEvents: 'none', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}>
            <MapPin size={13} /> Tap map to pin location
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 800 480"
          width="100%"
          style={{ display: 'block', height: 270 }}
          preserveAspectRatio="xMidYMid meet"
          onClick={handleClick}
          onTouchStart={handleTouch}
        >
          {/* Sky/base */}
          <rect width="800" height="480" fill="#E2EDFF" />

          {/* Water / River */}
          <polygon points="0,0 80,0 68,100 82,180 72,245 0,245" fill="#7DD3FC" opacity="0.75" />
          <polygon points="0,245 72,245 82,360 68,480 0,480" fill="#7DD3FC" opacity="0.75" />
          <text x="32" y="120" fill="#0369A1" fontSize="8" fontWeight="700" textAnchor="middle" transform="rotate(-90,32,120)" opacity="0.8">TUGON RIVER</text>

          {/* Districts */}
          {DISTRICTS_MAP.map(d => (
            <g key={d.id}>
              <rect x={d.x} y={d.y} width={d.w} height={d.h} fill={d.fill} stroke={d.stroke} strokeWidth={d.sw} rx="3" opacity="0.95" />
              <text x={d.x + d.w - 8} y={d.y + 14} textAnchor="end"
                fill={d.id === 'D2' ? '#1E40AF' : '#94A3B8'}
                fontSize="8" fontWeight={d.id === 'D2' ? '800' : '600'}
                letterSpacing="0.06em"
              >
                {d.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Major roads */}
          {H_ROADS.map(y => <rect key={y} x="80" y={y-5} width="630" height="10" fill="#F0F4F8" stroke="#CBD5E1" strokeWidth="0.5" />)}
          {V_ROADS.map(x => <rect key={x} x={x-5} y="0" width="10" height="480" fill="#F0F4F8" stroke="#CBD5E1" strokeWidth="0.5" />)}
          {H_MINOR.map(y => <line key={y} x1="80" y1={y} x2="710" y2={y} stroke="#DDE5EF" strokeWidth="3" />)}
          {V_MINOR.map(x => <line key={x} x1={x} y1="0" x2={x} y2="480" stroke="#DDE5EF" strokeWidth="3" />)}
          {H_ROADS.map(y => <line key={`cl-${y}`} x1="80" y1={y} x2="710" y2={y} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="14,8" />)}
          <text x="695" y="238" fill="#94A3B8" fontSize="7" fontWeight="500" textAnchor="end">NATIONAL HWY</text>

          {/* Buildings */}
          {MAP_BUILDINGS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h}
              fill="rgba(255,255,255,0.65)" stroke="#DCE4EF" strokeWidth="0.8" rx="2" />
          ))}

          {/* Parks */}
          <rect x="310" y="120" width="80" height="60" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="1" rx="4" />
          <text x="350" y="154" textAnchor="middle" fill="#065F46" fontSize="7" fontWeight="600">City Park</text>

          {/* Registered barangay boundary — District II dashed highlight */}
          <rect x="285" y="10" width="210" height="230" fill="rgba(59,130,246,0.06)"
            stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="8,5" rx="3" />
          {/* "Your Area" label badge */}
          <rect x="295" y="18" width="190" height="22" fill="rgba(59,130,246,0.18)" rx="3" />
          <text x="390" y="33" textAnchor="middle" fill="#1E40AF" fontSize="9" fontWeight="800" letterSpacing="0.08em">
            YOUR REGISTERED AREA
          </text>

          {/* Home marker */}
          <circle cx="390" cy="90" r="7" fill="#1E3A8A" stroke="white" strokeWidth="2" opacity="0.7" />
          <circle cx="390" cy="90" r="3" fill="white" />
          <text x="390" y="107" textAnchor="middle" fill="#1E40AF" fontSize="7" fontWeight="600">Home</text>

          {/* Dropped Pin */}
          {form.pin && (
            <g>
              {/* Outer pulse rings */}
              <circle cx={form.pin.x} cy={form.pin.y} r="28" fill="none" stroke="#B91C1C" strokeWidth="1.5" opacity="0.2" />
              <circle cx={form.pin.x} cy={form.pin.y} r="20" fill="none" stroke="#B91C1C" strokeWidth="2" opacity="0.3" />
              {/* Ground shadow */}
              <ellipse cx={form.pin.x} cy={form.pin.y + 20} rx="9" ry="4" fill="rgba(0,0,0,0.18)" />
              {/* Pin teardrop body */}
              <path
                d={`M ${form.pin.x} ${form.pin.y + 17}
                    C ${form.pin.x - 7} ${form.pin.y + 8}
                      ${form.pin.x - 14} ${form.pin.y - 1}
                      ${form.pin.x - 14} ${form.pin.y - 7}
                    A 14 14 0 1 1 ${form.pin.x + 14} ${form.pin.y - 7}
                    C ${form.pin.x + 14} ${form.pin.y - 1}
                      ${form.pin.x + 7} ${form.pin.y + 8}
                      ${form.pin.x} ${form.pin.y + 17} Z`}
                fill="#B91C1C"
                stroke="white"
                strokeWidth="2.5"
              />
              <circle cx={form.pin.x} cy={form.pin.y - 7} r="5.5" fill="white" />
            </g>
          )}

          {/* Scale bar */}
          <g>
            <line x1="90" y1="467" x2="190" y2="467" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="90" y1="463" x2="90" y2="471" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="190" y1="463" x2="190" y2="471" stroke="#94A3B8" strokeWidth="1.5" />
            <text x="140" y="477" textAnchor="middle" fill="#94A3B8" fontSize="7">500 m</text>
          </g>
          <text x="710" y="477" fill="#94A3B8" fontSize="6.5" textAnchor="end">© TUGON GIS</text>
        </svg>
      </div>

      {/* Pin confirmation chip */}
      {form.pin ? (
        <div style={{
          background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
          borderRadius: 14, padding: '12px 14px', border: '1.5px solid #93C5FD',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 2px 8px rgba(59,130,246,0.12)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#DBEAFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1E3A8A', flexShrink: 0,
          }}>
            <MapPin size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{form.pin.barangay}</div>
            <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 1, fontWeight: 500 }}>
              📍 {form.pin.district} · Pin placed successfully
            </div>
          </div>
          <button
            onClick={() => setForm(p => ({ ...p, pin: null }))}
            style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#64748B', padding: 6, display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Use registered location button */
        <button
          onClick={() => placePin(390, 100)}
          style={{
            width: '100%', padding: '13px', borderRadius: 13,
            border: '1.5px solid #BFDBFE', background: '#EFF6FF',
            color: '#1E3A8A', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 12, transition: 'all 0.15s',
          }}
        >
          <Navigation size={15} /> Use My Registered Location
        </button>
      )}

      {/* Address text input */}
      <div>
        <label style={{
          fontSize: 11, fontWeight: 700, color: '#475569', display: 'block',
          marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
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
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STEP 3 — DESCRIPTION
══════════════════════════════════════════════════════════════════ */
function Step3({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
  const MAX = 500;
  const charColor = form.description.length >= MAX * 0.9 ? '#B91C1C' : form.description.length >= MAX * 0.7 ? '#B4730A' : '#94A3B8';

  const QUICK_TAGS = [
    'People in danger', 'Property damage', 'Road blocked', 'Spreading rapidly',
    'Multiple victims', 'Ongoing situation', 'Needs evacuation', 'Structural damage',
    'Children involved', 'Elderly at risk',
  ];

  const appendTag = (tag: string) => {
    setForm(p => {
      if (p.description.includes(tag)) return p;
      const sep = p.description.trim().length > 0 ? '. ' : '';
      return { ...p, description: p.description + sep + tag };
    });
  };

  return (
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF',
          borderRadius: 20, padding: '4px 12px', color: '#1E3A8A',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>Step 3 of 5</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 6, lineHeight: 1.2 }}>
          Describe the Incident
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          Provide as much detail as possible to help responders act quickly and effectively.
        </p>
      </div>

      {/* Tip box */}
      <div style={{
        background: '#FFFBEB', borderRadius: 12, padding: '12px 14px',
        border: '1px solid #FDE68A', marginBottom: 18,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Info size={14} color="#B4730A" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
          <strong>Good description:</strong> What is happening, how many people are involved, any immediate danger, and what has already been done.
        </div>
      </div>

      {/* Main textarea */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
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
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Quick Tags — tap to add
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {QUICK_TAGS.map(tag => {
            const added = form.description.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => appendTag(tag)}
                style={{
                  padding: '6px 11px', borderRadius: 20,
                  border: `1.5px solid ${added ? '#1E3A8A' : '#E2E8F0'}`,
                  background: added ? '#EFF6FF' : '#F8FAFC',
                  color: added ? '#1E3A8A' : '#64748B',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
                  boxShadow: added ? '0 1px 4px rgba(30,58,138,0.12)' : 'none',
                }}
              >
                {added ? '✓ ' : '+ '}{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Affected persons */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Estimated People Affected
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { val: '1–5', label: '1–5', sublabel: 'Few' },
            { val: '6–20', label: '6–20', sublabel: 'Several' },
            { val: '21–50', label: '21–50', sublabel: 'Many' },
            { val: '50+', label: '50+', sublabel: 'Large' },
          ].map(opt => {
            const sel = form.affectedCount === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => setForm(p => ({ ...p, affectedCount: sel ? null : opt.val }))}
                style={{
                  padding: '12px 4px', borderRadius: 12,
                  border: `2px solid ${sel ? '#1E3A8A' : '#E2E8F0'}`,
                  background: sel ? '#EFF6FF' : '#fff',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s',
                  boxShadow: sel ? '0 2px 8px rgba(30,58,138,0.15)' : 'none',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, color: sel ? '#1E3A8A' : '#1E293B' }}>{opt.label}</div>
                <div style={{ fontSize: 9, color: sel ? '#3B82F6' : '#94A3B8', marginTop: 2, fontWeight: 600 }}>{opt.sublabel}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STEP 4 — EVIDENCE UPLOAD
══════════════════════════════════════════════════════════════════ */
function Step4({ form, setForm }: { form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [micError, setMicError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef   = useRef<HTMLAudioElement | null>(null);
  const formRef      = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

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
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF',
          borderRadius: 20, padding: '4px 12px', color: '#1E3A8A',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>Step 4 of 5 — Optional</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 6, lineHeight: 1.2 }}>
          Add Evidence
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          Photos and audio help responders assess the situation faster. You can skip this step if you have none.
        </p>
      </div>

      {/* ─ Photo Upload ─ */}
      <div style={{
        background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0',
        padding: '18px', marginBottom: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E3A8A',
          }}>
            <Camera size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>Photo Evidence</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Up to 4 photos · JPG, PNG</div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {form.photoPreviews.map((src, i) => (
            <div key={i} style={{
              width: 84, height: 84, borderRadius: 14, overflow: 'hidden',
              position: 'relative', border: '2px solid #E2E8F0', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
            }}>
              <img src={src} alt={`evidence-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <div style={{ marginTop: 10, fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={12} color="#059669" />
            {form.photoPreviews.length} photo{form.photoPreviews.length > 1 ? 's' : ''} attached
            {form.photoPreviews.length < 4 && ` · ${4 - form.photoPreviews.length} remaining`}
          </div>
        )}
      </div>

      {/* ─ Voice Recording ─ */}
      <div style={{
        background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0',
        padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: '#EDE9FE',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED',
          }}>
            <Mic size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>Voice Recording</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Describe the situation verbally</div>
          </div>
        </div>

        {micError && (
          <div style={{
            background: '#FEF2F2', borderRadius: 10, padding: '10px 12px',
            marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <MicOff size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.5 }}>{micError}</span>
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
                      background: '#B91C1C',
                      opacity: 0.7 + Math.sin(i * 0.8) * 0.3,
                      animation: `wave-bar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.06}s`,
                      height: `${20 + Math.abs(Math.sin(i * 1.2)) * 20}px`,
                    }} />
                  ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 28, fontWeight: 900, color: '#B91C1C',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
                    fontFamily: 'monospace',
                  }}>
                    {fmt(recTime)}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#B91C1C',
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
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', background: '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mic size={26} color="#94A3B8" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>Record a Voice Note</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Tap to start recording</div>
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
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            borderRadius: 14, padding: '14px 16px',
            border: '1.5px solid #93C5FD', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#DBEAFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1E3A8A', flexShrink: 0,
            }}>
              <Mic size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', marginBottom: 6 }}>
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
              style={{
                background: '#FEE2E2', border: 'none', borderRadius: 8,
                padding: 8, cursor: 'pointer', color: '#B91C1C', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

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

/* ══════════════════════════════════════════════════════════════════
   STEP 5 — REVIEW & SUBMIT
══════════════════════════════════════════════════════════════════ */
function Step5({ form }: { form: ReportForm }) {
  const cat = CATEGORIES.find(c => c.type === form.category);
  const Icon = cat?.icon ?? MoreHorizontal;

  const details = [
    {
      label: 'Incident Type',
      icon: <Icon size={14} />,
      value: cat ? `${cat.label} — ${form.severity ? form.severity.charAt(0).toUpperCase() + form.severity.slice(1) : 'Severity not set'}` : 'Not set',
      accent: cat?.color ?? '#475569',
    },
    {
      label: 'Location',
      icon: <MapPin size={14} />,
      value: form.address || (form.pin ? `${form.pin.barangay}, ${form.pin.district}` : 'Location not set'),
      accent: '#1E3A8A',
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
      accent: '#B4730A',
    },
    {
      label: 'Evidence',
      icon: <Camera size={14} />,
      value: [
        form.photoPreviews.length > 0 ? `${form.photoPreviews.length} photo${form.photoPreviews.length > 1 ? 's' : ''}` : null,
        form.audioUrl ? '1 voice recording' : null,
      ].filter(Boolean).join(' · ') || 'None attached',
      accent: '#059669',
    },
    {
      label: 'Reporter',
      icon: <User size={14} />,
      value: 'Juan Dela Cruz · Brgy. San Antonio, District II',
      accent: '#475569',
    },
    {
      label: 'Date & Time',
      icon: <Clock size={14} />,
      value: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
      accent: '#475569',
    },
  ];

  return (
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF3C7',
          borderRadius: 20, padding: '4px 12px', color: '#92400E',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>Step 5 of 5 — Final Review</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 6, lineHeight: 1.2 }}>
          Review & Submit
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          Please verify all details before submitting. You can go back to make changes.
        </p>
      </div>

      {/* Summary Card */}
      <div style={{
        background: '#fff', borderRadius: 20, border: '1.5px solid #E2E8F0',
        overflow: 'hidden', marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
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
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1E293B', lineHeight: 1.2 }}>
              {cat?.label ?? 'Incident'} Report
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Submitted by Juan Dela Cruz · {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {/* Severity pill */}
          {form.severity && (
            <div style={{
              marginLeft: 'auto',
              background: form.severity === 'critical' ? '#FEE2E2' : form.severity === 'high' ? '#FFEDD5' : form.severity === 'medium' ? '#FEF3C7' : '#D1FAE5',
              color: form.severity === 'critical' ? '#B91C1C' : form.severity === 'high' ? '#C2410C' : form.severity === 'medium' ? '#B4730A' : '#059669',
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3,
              }}>
                {label}
              </div>
              <div style={{
                fontSize: 13, color: '#1E293B', fontWeight: 500, lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo thumbnails */}
      {form.photoPreviews.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Attached Photos
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {form.photoPreviews.map((src, i) => (
              <div key={i} style={{
                width: 68, height: 68, borderRadius: 12, overflow: 'hidden',
                border: '2px solid #E2E8F0', flexShrink: 0, position: 'relative',
              }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4))',
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
      <div style={{
        background: '#FFFBEB', borderRadius: 14, padding: '14px',
        border: '1px solid #FDE68A', marginBottom: 4,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Info size={15} color="#B4730A" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.65, margin: 0 }}>
          By submitting this report, you certify that the information provided is <strong>true and accurate</strong> to the best of your knowledge. Filing a false incident report is a punishable offense under Philippine law (RA 10173, LGU ordinances).
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SUCCESS SCREEN
══════════════════════════════════════════════════════════════════ */
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
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(185,28,28,0.08)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

        <div style={{ fontWeight: 900, fontSize: 28, color: '#fff', marginBottom: 8, textAlign: 'center', lineHeight: 1.15 }}>
          Report Submitted!
        </div>
        <div style={{ fontSize: 14, color: '#93C5FD', marginBottom: 24, textAlign: 'center', lineHeight: 1.65, maxWidth: 320 }}>
          Your incident report has been received and routed to the appropriate response units in your barangay.
        </div>

        {/* Report ID card */}
        <div style={{
          width: '100%', background: 'rgba(255,255,255,0.08)',
          border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 18,
          padding: '18px 20px', marginBottom: 22, textAlign: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 10, color: '#93C5FD', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            Your Report ID
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>
            {reportId}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            Use this ID to track your report under "My Reports"
          </div>
        </div>

        {/* Response timeline */}
        <div style={{
          width: '100%', background: 'rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '16px', marginBottom: 22,
          border: '1px solid rgba(255,255,255,0.10)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Response Status
          </div>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < steps.length - 1 ? 10 : 0 }}>
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
        <div style={{
          width: '100%', background: 'rgba(185,28,28,0.15)',
          border: '1px solid rgba(185,28,28,0.3)', borderRadius: 12,
          padding: '12px 14px', marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Phone size={16} color="#FCA5A5" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#FCA5A5', lineHeight: 1.5 }}>
            <strong>In immediate danger?</strong> Call <strong>911</strong> now without waiting for a response.
          </span>
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          style={{
            width: '100%', background: '#fff', border: 'none',
            borderRadius: 16, padding: '16px',
            color: '#1E3A8A', fontWeight: 800, fontSize: 15,
            cursor: 'pointer', transition: 'opacity 0.15s',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}
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

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
const STEP_VALIDATION: Record<number, (f: ReportForm) => boolean> = {
  1: f => f.category !== null,
  2: f => f.pin !== null || f.address.trim().length > 0,
  3: f => f.description.trim().length >= 10,
  4: () => true,
  5: () => true,
};

export default function IncidentReport() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState('');
  const contentRef              = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<ReportForm>({
    category: null, severity: null, pin: null, address: '',
    description: '', affectedCount: null,
    photoPreviews: [], photoFiles: [],
    audioUrl: null, audioBlob: null,
  });

  // Scroll content area to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const canProceed = STEP_VALIDATION[step]?.(form) ?? true;

  const mapTypeForApi = (category: IncidentCategory) => {
    if (category === 'fire') return 'Fire' as const;
    if (category === 'pollution') return 'Pollution' as const;
    if (category === 'noise') return 'Noise' as const;
    if (category === 'crime') return 'Crime' as const;
    if (category === 'road_hazard') return 'Road Hazard' as const;
    return 'Other' as const;
  };

  const submitReport = async () => {
    if (!form.category) {
      setSubmitError('Incident type is required.');
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const response = await citizenReportsApi.submitReport({
        type: mapTypeForApi(form.category),
        latitude: form.pin?.y ?? Number.NaN,
        longitude: form.pin?.x ?? Number.NaN,
        location: form.address.trim() || `${form.pin?.barangay ?? 'Unknown location'}`,
        description: form.description.trim(),
        severity: form.severity ?? 'medium',
        affectedCount: form.affectedCount,
        photoCount: form.photoFiles.length,
        hasAudio: Boolean(form.audioBlob),
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
    if (step < 5) {
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
    1: <Step1 form={form} setForm={setForm} />,
    2: <Step2 form={form} setForm={setForm} />,
    3: <Step3 form={form} setForm={setForm} />,
    4: <Step4 form={form} setForm={setForm} />,
    5: <Step5 form={form} />,
  };

  return (
    <>
      {submitted && <SuccessScreen reportId={submittedReportId} onDone={() => navigate('/citizen')} />}

      <div style={{
        minHeight: '100vh', background: '#F1F5F9',
        display: 'flex', flexDirection: 'column',
        maxWidth: 520, margin: '0 auto',
        fontFamily: "'Roboto', sans-serif",
        position: 'relative',
      }}>

        {/* ── Fixed Header ── */}
        <header style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
          padding: '0 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          height: 60, flexShrink: 0, position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 2px 16px rgba(30,58,138,0.45)',
        }}>
          {/* Back button */}
          <button
            onClick={goBack}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, width: 38, height: 38, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={16} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>Report Incident</div>
              <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                TUGON Citizen Portal
              </div>
            </div>
          </div>

          {/* Step counter badge */}
          <div style={{
            background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '5px 11px',
            color: '#BFDBFE', fontSize: 12, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {step} / 5
          </div>
        </header>

        {/* ── Step Indicator ── */}
        <StepIndicator current={step} />

        {/* ── Scrollable Content ── */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}
        >
          {submitError && step === 5 && (
            <div style={{
              margin: '12px 16px 0',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 12,
              color: '#B91C1C',
              fontSize: 12,
              padding: '10px 12px',
            }}>
              {submitError}
            </div>
          )}
          {stepContent[step]}
        </div>

        {/* ── Fixed Bottom Bar ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 520, background: '#fff',
          borderTop: '1px solid #E2E8F0', padding: '12px 16px',
          display: 'flex', gap: 10, zIndex: 50,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
          boxSizing: 'border-box',
        }}>
          {/* Back */}
          {step > 1 && (
            <button
              onClick={goBack}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: '1.5px solid #E2E8F0', background: '#F8FAFC',
                color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}

          {/* Next / Submit */}
          <button
            onClick={goNext}
            disabled={!canProceed || submitting}
            style={{
              flex: step === 1 ? 1 : 2,
              padding: '14px', borderRadius: 14, border: 'none',
              background: !canProceed || submitting
                ? '#E2E8F0'
                : step === 5
                  ? 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)'
                  : 'linear-gradient(135deg, #1E3A8A 0%, #1e40af 100%)',
              color: canProceed && !submitting ? '#fff' : '#94A3B8',
              fontWeight: 700, fontSize: 14,
              cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: canProceed && !submitting
                ? step === 5
                  ? '0 4px 16px rgba(185,28,28,0.4)'
                  : '0 4px 16px rgba(30,58,138,0.35)'
                : 'none',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting ? (
              <>Submitting...</>
            ) : step === 5 ? (
              <>🚨 Submit Report</>
            ) : step === 4 ? (
              <>Continue to Review →</>
            ) : (
              <>Continue →</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
