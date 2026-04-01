import React from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, MapPin, Radio } from 'lucide-react';
import { LanguageToggle } from '../i18n';

const BG_IMAGE = 'https://images.unsplash.com/photo-1598258710957-db8614c2881e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b25kbyUyMG1hbmlsYSUyMHBoaWxpcHBpbmVzJTIwYWVyaWFsJTIwbmVpZ2hib3Job29kfGVufDF8fHx8MTc3Mjc4MjE4MXww&ixlib=rb-4.1.0&q=80&w=1080';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  topAction?: React.ReactNode;
}

export interface AuthProgressStep {
  label: string;
  status: 'done' | 'active' | 'upcoming';
}

export function AuthLayout({ children, title, subtitle, topAction }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh w-full bg-[#f8f9ff]">
      {/* ── Left branding panel (hidden on mobile) — Stitch "primary_container" weighted panel */}
      <aside className="relative hidden w-[440px] shrink-0 overflow-hidden lg:flex lg:flex-col" style={{ background: 'linear-gradient(160deg, #00236f 0%, #1e3a8a 55%, #0b1c30 100%)' }}>
        <img
          src={BG_IMAGE}
          alt="Tondo aerial"
          className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-20"
        />
        {/* Architectural grid — Stitch signature texture */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-9">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 border-none bg-transparent p-0"
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              className="h-8"
            />
          </button>

          {/* Editorial headline block */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.10] px-4 py-1.5 backdrop-blur-sm">
              <Radio size={11} className="text-[#b6c4ff]" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/75">Live System Active</span>
            </div>

            <h2 className="text-[30px] font-bold leading-[1.2] text-white tracking-[-0.02em]">
              Community Safety<br />
              <span style={{ color: '#b6c4ff' }}>Powered by Data.</span>
            </h2>
            <p className="mt-4 max-w-[340px] text-[13.5px] leading-relaxed text-white/65">
              Report incidents, track emergency response, and keep Barangays 251, 252, and 256 in Tondo safe — in real time.
            </p>

            {/* Tonal stat cluster */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[{ label: 'Reports filed', value: '2,400+' }, { label: 'Resolved', value: '94%' }, { label: 'Avg response', value: '18 min' }].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/[0.08] p-3">
                  <div className="text-[20px] font-bold text-white leading-tight">{s.value}</div>
                  <div className="mt-0.5 text-[10px] text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin size={11} className="text-[#b6c4ff]" />
              <span className="text-[11px] text-white/55">Barangays 251, 252, 256 — Tondo, Manila</span>
            </div>
            <div className="text-[10px] text-white/35">
              &copy; 2026 TUGON Incident Management System
            </div>
          </div>
        </div>
      </aside>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:px-8">
        {/* Desktop language toggle — top-right */}
        <div className="absolute right-6 top-6 hidden lg:block">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
            <button
              onClick={() => navigate('/')}
              className="border-none bg-transparent p-0"
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                className="h-9"
              />
            </button>
            <LanguageToggle />
          </div>

          {/* Card — surface-container-lowest lifted on surface-container-low */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(13,28,46,0.08)] sm:p-8 lg:p-10">
            <div className="mb-6">
              <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em]" style={{ color: '#0d1c2e', fontFamily: 'var(--font-headline)' }}>{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#444651' }}>{subtitle}</p>
            </div>
            {children}
          </div>

          {topAction && (
            <div className="mt-4 flex justify-center">{topAction}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Shared form primitives */

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

  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#444651' }}>
        {label}
      </label>
      {/* Stitch input: surface-container-low fill, 2px primary bottom border on focus, no box border */}
      <div
        className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-3 transition-all ${
          error
            ? 'shadow-[inset_0_-2px_0_0_#ba1a1a]'
            : focused
              ? 'shadow-[inset_0_-2px_0_0_#00236f]'
              : 'shadow-[inset_0_-1px_0_0_rgba(197,197,211,0.5)]'
        }`}
        style={{ background: error ? '#fff1f1' : '#eff4ff' }}
      >
        {icon && (
          <div className={`shrink-0 transition-colors ${focused ? 'text-[#00236f]' : 'text-[#757682]'}`}>
            {icon}
          </div>
        )}
        <input
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] outline-none placeholder:text-[#9099a8]"
          style={{ color: '#0d1c2e' }}
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
        {rightElement && <div className="shrink-0">{rightElement}</div>}
      </div>
      {error && <div className="mt-1.5 text-[11px] font-medium text-red-600">&#9888; {error}</div>}
      {hint && !error && <div className="mt-1.5 text-[11px]" style={{ color: '#757682' }}>{hint}</div>}
    </div>
  );
}

/* Stitch gradient CTA map — primary → primary-container at 135° */
const BUTTON_COLORS: Record<string, string> = {
  '#1e3a8a': 'shadow-[0_4px_16px_rgba(0,35,111,0.22)] hover:shadow-[0_8px_24px_rgba(0,35,111,0.32)]',
  '#059669': 'shadow-[0_4px_16px_rgba(5,150,105,0.20)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.30)]',
  '#b4730a': 'shadow-[0_4px_16px_rgba(134,83,0,0.20)] hover:shadow-[0_8px_24px_rgba(134,83,0,0.30)]',
  '#b91c1c': 'shadow-[0_4px_16px_rgba(186,26,26,0.20)] hover:shadow-[0_8px_24px_rgba(186,26,26,0.30)]',
};

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  color?: string;
}

export function PrimaryButton({ children, onClick, loading = false, disabled = false, type = 'button', color = '#1E3A8A' }: PrimaryButtonProps) {
  const colorClasses = BUTTON_COLORS[color.toLowerCase()] || BUTTON_COLORS['#1e3a8a'];

  const bgGradient = color.toLowerCase() === '#059669'
    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
    : color.toLowerCase() === '#b4730a'
      ? 'linear-gradient(135deg, #865300 0%, #b4730a 100%)'
      : color.toLowerCase() === '#b91c1c'
        ? 'linear-gradient(135deg, #5d0004 0%, #ba1a1a 100%)'
        : 'linear-gradient(135deg, #00236f 0%, #1e3a8a 100%)';

  return (
    <button
      className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] px-5 py-3.5 text-sm font-bold text-white transition-all duration-200 ${colorClasses} disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 active:scale-[0.98]`}
      style={{ background: bgGradient }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : children}
    </button>
  );
}

interface AuthProgressStepperProps {
  steps: AuthProgressStep[];
  className?: string;
}

export function AuthProgressStepper({ steps, className = 'mb-7' }: AuthProgressStepperProps) {
  return (
    <div className={`${className} flex items-center`}>
      {/* Stitch tonal progress bar — no numbered circles */}
      <div className="relative h-1.5 w-full rounded-full" style={{ background: '#d5e3fc' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            background: 'linear-gradient(90deg, #00236f 0%, #1e3a8a 100%)',
            width: `${Math.round((steps.filter(s => s.status === 'done').length / Math.max(steps.length - 1, 1)) * 100)}%`,
          }}
        />
        {steps.map((step, idx) => (
          <div
            key={`node-${idx}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${idx === 0 ? 0 : idx === steps.length - 1 ? 100 : Math.round(idx / (steps.length - 1) * 100)}%` }}
          >
            <div
              className={`size-3 rounded-full border-2 border-white transition-all ${
                step.status === 'done'
                  ? 'bg-[#00236f]'
                  : step.status === 'active'
                    ? 'bg-[#1e3a8a] ring-2 ring-[#b6c4ff]'
                    : 'bg-[#d5e3fc]'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between">
        {steps.map((step, idx) => (
          <span
            key={`label-${idx}`}
            className={`text-[10px] ${
              step.status === 'done' ? 'text-[#00236f] font-semibold'
              : step.status === 'active' ? 'text-[#1e3a8a] font-bold'
              : 'font-normal'
            }`}
            style={{ color: step.status === 'upcoming' ? '#757682' : undefined }}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const AUTH_SPIN_STYLE = '';
