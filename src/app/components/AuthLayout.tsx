import React from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Radio } from 'lucide-react';
import '../../styles/auth-layout.css';

const BG_IMAGE = 'https://images.unsplash.com/photo-1598258710957-db8614c2881e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b25kbyUyMG1hbmlsYSUyMHBoaWxpcHBpbmVzJTIwYWVyaWFsJTIwbmVpZ2hib3Job29kfGVufDF8fHx8MTc3Mjc4MjE4MXww&ixlib=rb-4.1.0&q=80&w=1080';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="auth-layout-root">
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div
        className="auth-panel"
      >
        {/* Background photo */}
        <img
          src={BG_IMAGE}
          alt="Tondo aerial"
          className="auth-bg-image"
        />
        {/* Gradient overlay */}
        <div className="auth-bg-gradient" />
        {/* Grid lines */}
        <div className="auth-bg-grid" />

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
              className="auth-panel-logo-img"
            />
          </button>

          {/* Middle content */}
          <div className="auth-panel-middle">
            {/* Live badge */}
            <div className="auth-live-badge">
              <Radio size={11} color="#F87171" />
              <span className="auth-live-badge-text">Live Monitoring Active</span>
            </div>

            <h2 className="auth-panel-heading">
              Community Safety<br />
              <span className="auth-panel-heading-highlight">Powered by Data.</span>
            </h2>
            <p className="auth-panel-copy">
              Report incidents, track emergency response, and keep Barangays 251, 252, and 256 in Tondo safe — in real time.
            </p>

          </div>

          {/* Footer */}
          <div className="auth-panel-footer">
            <div className="auth-panel-footer-location">
              <MapPin size={11} color="#93C5FD" />
              <span className="auth-panel-footer-location-text">Barangays 251, 252, 256 — Tondo, Manila</span>
            </div>
            <div className="auth-panel-footer-copy">
              © 2026 TUGON Incident Management System
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="auth-form-panel"
      >
        <div className="auth-form-wrap">
          {/* Mobile logo (only visible on small screens) */}
          <div className="auth-mobile-logo">
            <button
              onClick={() => navigate('/')}
              className="auth-mobile-logo-btn"
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                className="auth-mobile-logo-img"
              />
            </button>
          </div>

          {/* Card */}
          <div className="auth-form-card">
            {/* Form heading */}
            <div className="auth-form-heading">
              <h1 className="auth-form-title">{title}</h1>
              <p className="auth-form-subtitle">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
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
  autoComplete?: React.HTMLInputAutoCompleteAttribute;
  autoFocus?: boolean;
}

export function InputField({
  label, type = 'text', placeholder, value, onChange,
  icon, rightElement, error, hint, maxLength, inputMode, autoComplete, autoFocus,
}: InputFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const autoCompleteProps = autoComplete ? { autoComplete } : {};
  const inputContainerClass = [
    'auth-input-container',
    focused ? 'is-focused' : '',
    error ? 'is-error' : '',
  ].filter(Boolean).join(' ');
  const inputIconClass = [
    'auth-input-icon',
    focused ? 'is-focused' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="auth-input-field">
      <label className="auth-input-label">
        {label}
      </label>
      <div className={inputContainerClass}>
        {icon && (
          <div className={inputIconClass}>
            {icon}
          </div>
        )}
        <input
          className="auth-input-control"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          inputMode={inputMode}
          name={autoComplete ?? label.toLowerCase().replace(/\s+/g, '-')}
          autoFocus={autoFocus}
          {...autoCompleteProps}
        />
        {rightElement && (
          <div className="auth-input-right">{rightElement}</div>
        )}
      </div>
      {error && <div className="auth-input-error">⚠ {error}</div>}
      {hint && !error && <div className="auth-input-hint">{hint}</div>}
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
  const colorClass = getButtonColorClass(color);

  return (
    <button
      className={`auth-primary-button ${colorClass}`}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

function getButtonColorClass(color: string): string {
  const normalized = color.toLowerCase();
  if (normalized === '#059669') return 'auth-primary-button-green';
  if (normalized === '#b4730a') return 'auth-primary-button-gold';
  if (normalized === '#b91c1c') return 'auth-primary-button-red';
  return 'auth-primary-button-blue';
}

function Spinner() {
  return <span className="auth-spinner" />;
}

export const AUTH_SPIN_STYLE = `@keyframes spin { to { transform: rotate(360deg); } }`;
