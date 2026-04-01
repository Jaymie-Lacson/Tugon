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
    <div className="flex min-h-dvh w-full bg-gradient-to-br from-blue-100 via-blue-50 to-slate-100">
      {/* Left branding panel (hidden on mobile) */}
      <aside className="relative hidden w-[440px] shrink-0 overflow-hidden lg:block">
        <img
          src={BG_IMAGE}
          alt="Tondo aerial"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/85 via-primary/75 to-[#0F172A]/90" />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-8">
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

          {/* Middle content */}
          <div>
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Radio size={11} className="text-red-400" />
              <span className="text-[11px] font-semibold tracking-wide text-white/80">Live Monitoring Active</span>
            </div>

            <h2 className="text-[28px] font-bold leading-tight text-white">
              Community Safety<br />
              <span className="text-blue-300">Powered by Data.</span>
            </h2>
            <p className="mt-4 max-w-[340px] text-[13px] leading-relaxed text-white/70">
              Report incidents, track emergency response, and keep Barangays 251, 252, and 256 in Tondo safe — in real time.
            </p>
          </div>

          {/* Footer */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin size={11} className="text-blue-300" />
              <span className="text-[11px] text-white/60">Barangays 251, 252, 256 — Tondo, Manila</span>
            </div>
            <div className="text-[10px] text-white/40">
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

          {/* Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_40px_rgba(30,58,138,0.08)] sm:p-8 lg:p-10">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
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
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-[var(--radius-md)] border-[1.5px] bg-slate-50 px-3.5 py-3 transition-all ${
          error
            ? 'border-red-500 bg-red-50'
            : focused
              ? 'border-primary shadow-[0_0_0_3px_rgba(30,58,138,0.10)]'
              : 'border-slate-200'
        }`}
      >
        {icon && (
          <div className={`shrink-0 transition-colors ${focused ? 'text-primary' : 'text-slate-400'}`}>
            {icon}
          </div>
        )}
        <input
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
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
      {hint && !error && <div className="mt-1.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

const BUTTON_COLORS: Record<string, string> = {
  '#1e3a8a': 'bg-primary hover:bg-[#1E40AF] shadow-[0_2px_8px_rgba(30,58,138,0.18)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.28)]',
  '#059669': 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_2px_8px_rgba(5,150,105,0.18)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.28)]',
  '#b4730a': 'bg-severity-medium hover:bg-[#A16309] shadow-[0_2px_8px_rgba(180,115,10,0.18)] hover:shadow-[0_6px_20px_rgba(180,115,10,0.28)]',
  '#b91c1c': 'bg-red-700 hover:bg-red-800 shadow-[0_2px_8px_rgba(185,28,28,0.18)] hover:shadow-[0_6px_20px_rgba(185,28,28,0.28)]',
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

  return (
    <button
      className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] px-5 py-3.5 text-sm font-bold text-white transition-all ${colorClasses} disabled:cursor-not-allowed disabled:opacity-50`}
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
      {steps.flatMap((step, idx) => {
        const isDone = step.status === 'done';
        const isActive = step.status === 'active';

        const items = [
          <div key={`step-${idx}`} className="flex flex-1 flex-col items-center">
            <div
              className={`mb-1 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold ${
                isDone
                  ? 'bg-emerald-600 text-white'
                  : isActive
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-400'
              }`}
            >
              {isDone ? <CheckCircle2 size={15} /> : idx + 1}
            </div>
            <span
              className={`text-[10px] ${
                isDone
                  ? 'text-emerald-600'
                  : isActive
                    ? 'font-bold text-primary'
                    : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>,
        ];

        if (idx < steps.length - 1) {
          items.push(
            <div
              key={`connector-${idx}`}
              className={`mb-[18px] h-0.5 flex-1 ${isDone ? 'bg-emerald-600' : 'bg-slate-200'}`}
            />,
          );
        }

        return items;
      })}
    </div>
  );
}

export const AUTH_SPIN_STYLE = '';
