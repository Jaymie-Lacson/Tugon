import React from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Radio, AlertTriangle, FileText, Clock3 } from 'lucide-react';

const BG_IMAGE = 'https://images.unsplash.com/photo-1598258710957-db8614c2881e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b25kbyUyMG1hbmlsYSUyMHBoaWxpcHBpbmVzJTIwYWVyaWFsJTIwbmVpZ2hib3Job29kfGVufDF8fHx8MTc3Mjc4MjE4MXww&ixlib=rb-4.1.0&q=80&w=1080';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const PANEL_FEATURES = [
  {
    icon: AlertTriangle,
    title: 'Report hazards quickly',
    description: 'Submit fire, noise, crime, pollution, and road hazard incidents in guided steps.',
  },
  {
    icon: FileText,
    title: 'Track your report status',
    description: 'Follow updates from Submitted to Resolved with transparent progress from officials.',
  },
  {
    icon: Clock3,
    title: 'Stay response-ready',
    description: 'Response teams stay aligned through real-time routing and barangay alert visibility.',
  },
];

const INCIDENT_TYPES = ['Fire', 'Pollution', 'Noise', 'Crime', 'Road Hazard', 'Other'];

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
        <div className="auth-panel-content">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="auth-panel-logo-btn"
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ height: 42, width: 'auto', display: 'block' }}
            />
          </button>

          {/* Middle content */}
          <div className="auth-panel-main">
            {/* Live badge */}
            <div className="auth-panel-live-badge">
              <Radio size={11} color="#F87171" />
              <span style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Monitoring Active</span>
            </div>

            <h2 className="auth-panel-title">
              Community Safety<br />
              <span style={{ color: '#60A5FA' }}>Powered by Data.</span>
            </h2>
            <p className="auth-panel-description">
              Report incidents, track emergency response, and keep Barangays 251, 252, and 256 in Tondo safe — in real time.
            </p>

            <div className="auth-panel-features">
              {PANEL_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="auth-panel-feature-item">
                    <div className="auth-panel-feature-icon">
                      <Icon size={15} color="#BFDBFE" strokeWidth={2.1} />
                    </div>
                    <div>
                      <div className="auth-panel-feature-title">{feature.title}</div>
                      <div className="auth-panel-feature-description">{feature.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="auth-panel-types-wrap">
              <div className="auth-panel-types-label">Supported Incident Types</div>
              <div className="auth-panel-types-list">
                {INCIDENT_TYPES.map((type) => (
                  <span key={type} className="auth-panel-type-chip">{type}</span>
                ))}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="auth-panel-footer">
            <div className="auth-panel-location">
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
          <div className="auth-mobile-strip" style={{ display: 'none' }}>
            <button
              onClick={() => navigate('/')}
              className="auth-mobile-strip-logo"
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ height: 30, width: 'auto', display: 'block' }}
              />
            </button>
            <div className="auth-mobile-strip-text">
              <div className="auth-mobile-strip-title">Barangays 251, 252, 256</div>
              <div className="auth-mobile-strip-subtitle">Community safety monitoring active</div>
            </div>
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
        .auth-panel-content {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 40px 38px 34px;
        }

        .auth-panel-logo-btn {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-bottom: auto;
        }

        .auth-panel-main {
          margin-top: auto;
          margin-bottom: auto;
          padding-top: 44px;
        }

        .auth-panel-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(185, 28, 28, 0.2);
          border: 1px solid rgba(185, 28, 28, 0.35);
          border-radius: 999px;
          padding: 5px 12px;
          margin-bottom: 24px;
        }

        .auth-panel-title {
          color: #ffffff;
          font-size: 30px;
          font-weight: 800;
          line-height: 1.16;
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }

        .auth-panel-description {
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.72;
          max-width: 320px;
          margin-bottom: 20px;
        }

        .auth-panel-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 350px;
        }

        .auth-panel-feature-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          padding: 10px;
          background: rgba(15, 23, 42, 0.25);
        }

        .auth-panel-feature-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          background: rgba(30, 58, 138, 0.55);
          border: 1px solid rgba(191, 219, 254, 0.45);
        }

        .auth-panel-feature-title {
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.3;
        }

        .auth-panel-feature-description {
          color: rgba(255, 255, 255, 0.64);
          font-size: 11px;
          line-height: 1.45;
          margin-top: 3px;
        }

        .auth-panel-types-wrap {
          margin-top: 12px;
          max-width: 350px;
        }

        .auth-panel-types-label {
          color: rgba(255, 255, 255, 0.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .auth-panel-types-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .auth-panel-type-chip {
          font-size: 10px;
          font-weight: 600;
          color: #dbeafe;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(191, 219, 254, 0.34);
          background: rgba(15, 23, 42, 0.3);
        }

        .auth-panel-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding-top: 18px;
          margin-top: 8px;
        }

        .auth-panel-location {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .auth-mobile-strip {
          display: none;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          border: 1px solid #bfdbfe;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .auth-mobile-strip-logo {
          display: flex;
          align-items: center;
          background: #1e3a8a;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          padding: 6px 9px;
          flex-shrink: 0;
        }

        .auth-mobile-strip-text {
          min-width: 0;
        }

        .auth-mobile-strip-title {
          color: #1e3a8a;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: 0.02em;
        }

        .auth-mobile-strip-subtitle {
          color: #1e40af;
          font-size: 11px;
          margin-top: 3px;
          line-height: 1.3;
        }

        @media (max-width: 768px) {
          .auth-panel { display: none !important; }
          .auth-mobile-strip { display: flex !important; }
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
