import React from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Radio } from 'lucide-react';

const BG_IMAGE = 'https://images.unsplash.com/photo-1598258710957-db8614c2881e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b25kbyUyMG1hbmlsYSUyMHBoaWxpcHBpbmVzJTIwYWVyaWFsJTIwbmVpZ2hib3Job29kfGVufDF8fHx8MTc3Mjc4MjE4MXww&ixlib=rb-4.1.0&q=80&w=1080';

const STATS = [
  { value: '3', label: 'Barangays' },
  { value: '1,247+', label: 'Reports Resolved' },
  { value: '24/7', label: 'Monitoring' },
];

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      height: '100dvh',
      display: 'flex',
      fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
      background: '#F0F4FF',
    }}>
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div
        className="auth-panel"
        style={{
          width: 440,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Background photo */}
        <img
          src={BG_IMAGE}
          alt="Tondo aerial"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(15,23,42,0.88) 0%, rgba(30,58,138,0.82) 55%, rgba(15,23,42,0.92) 100%)',
        }} />
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: `linear-gradient(rgba(147,197,253,1) 1px,transparent 1px),linear-gradient(90deg,rgba(147,197,253,1) 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 40px' }}>
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 'auto' }}
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ height: 42, width: 'auto', display: 'block' }}
            />
          </button>

          {/* Middle content */}
          <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: 60 }}>
            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(185,28,28,0.2)', border: '1px solid rgba(185,28,28,0.35)', borderRadius: 20, padding: '5px 12px', marginBottom: 24 }}>
              <Radio size={11} color="#F87171" />
              <span style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Monitoring Active</span>
            </div>

            <h2 style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
              Community Safety<br />
              <span style={{ color: '#60A5FA' }}>Powered by Data.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.7, maxWidth: 300, marginBottom: 32 }}>
              Report incidents, track emergency response, and keep Barangays 251, 252, and 256 in Tondo safe — in real time.
            </p>

            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 20 }}>
              {STATS.map(s => (
                <div key={s.label} style={{ textAlign: 'left' }}>
                  <div style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MapPin size={11} color="#93C5FD" />
              <span style={{ color: '#93C5FD', fontSize: 10 }}>Barangays 251, 252, 256 — Tondo, Manila</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
              © 2026 TUGON Incident Management System
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="auth-form-panel"
        style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        minHeight: '100vh',
        height: '100dvh',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo (only visible on small screens) */}
          <div className="auth-mobile-logo" style={{ display: 'none', justifyContent: 'center', marginBottom: 28 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
                border: '1px solid rgba(30,58,138,0.25)',
                borderRadius: 12,
                boxShadow: '0 6px 18px rgba(30,58,138,0.22)',
                cursor: 'pointer',
                padding: '9px 14px',
              }}
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ height: 34, width: 'auto', display: 'block' }}
              />
            </button>
          </div>

          {/* Card */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: '36px 32px',
            boxShadow: '0 8px 40px rgba(30,58,138,0.1), 0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid rgba(30,58,138,0.07)',
          }}>
            {/* Form heading */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ color: '#1E293B', fontSize: 22, fontWeight: 800, marginBottom: 6, lineHeight: 1.2 }}>{title}</h1>
              <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.55 }}>{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-panel { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
          .auth-form-panel {
            align-items: flex-start !important;
            padding-top: max(14px, env(safe-area-inset-top)) !important;
            padding-bottom: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Shared form primitives ─────────────────────────────────── */

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  hint?: string;
  maxLength?: number;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  autoFocus?: boolean;
}

export function InputField({
  label, type = 'text', placeholder, value, onChange,
  icon, rightElement, error, hint, maxLength, inputMode, autoComplete, autoFocus,
}: InputFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? '#B91C1C' : focused ? '#1E3A8A' : '#E2E8F0';
  const shadowColor = error ? 'rgba(185,28,28,0.12)' : focused ? 'rgba(30,58,138,0.12)' : 'transparent';

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.01em' }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        background: error ? '#FEF2F2' : '#F8FAFF',
        boxShadow: `0 0 0 3px ${shadowColor}`,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
      }}>
        {icon && (
          <div style={{ paddingLeft: 14, paddingRight: 4, display: 'flex', alignItems: 'center', flexShrink: 0, color: focused ? '#1E3A8A' : '#94A3B8' }}>
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            padding: '14px 14px 14px',
            fontSize: 15,
            color: '#1E293B',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        {rightElement && (
          <div style={{ paddingRight: 12, flexShrink: 0 }}>{rightElement}</div>
        )}
      </div>
      {error && <div style={{ color: '#B91C1C', fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>⚠ {error}</div>}
      {hint && !error && <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  color?: string;
}

export function PrimaryButton({ children, onClick, loading = false, disabled = false, type = 'button', color = '#1E3A8A' }: PrimaryButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '15px',
        background: disabled || loading ? '#CBD5E1' : hovered ? adjustColor(color, -15) : color,
        color: 'white',
        border: 'none',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background 0.15s, transform 0.1s',
        transform: hovered && !disabled && !loading ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered && !disabled && !loading ? `0 6px 20px ${color}44` : `0 2px 8px ${color}22`,
        letterSpacing: '0.01em',
        fontFamily: 'inherit',
      }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

function adjustColor(hex: string, amount: number): string {
  // Simple darken/lighten
  return hex; // fallback — color transitions handled via hover state opacity
}

function Spinner() {
  return (
    <span style={{
      width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)',
      borderTop: '2.5px solid white', borderRadius: '50%',
      display: 'inline-block', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

export const AUTH_SPIN_STYLE = `@keyframes spin { to { transform: rotate(360deg); } }`;
