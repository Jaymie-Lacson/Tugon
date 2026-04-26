import React from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { LanguageToggle } from '../i18n';
import { usePretextBlockMetrics } from '../hooks/usePretextBlockMetrics';
import { useImmersiveThemeColor } from '../hooks/useImmersiveThemeColor';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  topAction?: React.ReactNode;
  logoSrc?: string;
  mobileLogoSrc?: string;
}

export interface AuthProgressStep {
  label: string;
  status: 'done' | 'active' | 'upcoming';
}

// Free stock image from Pexels (https://www.pexels.com/photo/buildings-near-body-of-water-325185/)
const AUTH_BRAND_IMAGE_640 =
  'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=640&h=880';
const AUTH_BRAND_IMAGE_960 =
  'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=960&h=1320';
const AUTH_BRAND_IMAGE_1280 =
  'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1280&h=1760';

export function AuthLayout({
  children,
  title,
  subtitle,
  topAction,
  logoSrc = '/tugon-header-logo.svg',
  mobileLogoSrc = '/tugon-wordmark-blue.svg',
}: AuthLayoutProps) {
  useImmersiveThemeColor('#f8f9ff');

  const navigate = useNavigate();
  const titleMetrics = usePretextBlockMetrics<HTMLHeadingElement>(title, {
    font: '900 28px "Public Sans"',
    lineHeight: 34,
    maxLines: 3,
  });
  const subtitleMetrics = usePretextBlockMetrics<HTMLParagraphElement>(subtitle, {
    font: '400 14px "IBM Plex Sans"',
    lineHeight: 23,
    maxLines: 4,
  });

  return (
    <div className="auth-root app-shell-height flex w-full bg-[var(--surface)]">
      {/* Left branding panel */}
      <aside className="relative hidden w-[46%] min-w-[430px] overflow-hidden bg-[#1e3a8a] lg:flex">
        <img
          src={AUTH_BRAND_IMAGE_960}
          srcSet={`${AUTH_BRAND_IMAGE_640} 640w, ${AUTH_BRAND_IMAGE_960} 960w, ${AUTH_BRAND_IMAGE_1280} 1280w`}
          sizes="(max-width: 1024px) 100vw, 46vw"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[#0f245e]/78" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a49]/48 via-transparent to-[#183d92]/36" />
        <div className="absolute -left-24 top-[-72px] h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 right-[-80px] h-72 w-72 rounded-full bg-[#90a8ff]/25 blur-3xl" />
        <div className="absolute inset-0 bg-white/6" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between px-10 py-8 text-white">
          <button onClick={() => navigate('/')} className="w-fit border-none bg-transparent p-0">
            <img
              src={logoSrc}
              alt="TUGON Tondo Emergency Response"
              className="h-9"
            />
          </button>

          <div className="max-w-[380px]">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles size={12} />
              Crisis Command Network
            </div>
            <h2 className="text-[38px] font-black leading-[1.05] tracking-[-0.03em]">
              Fast.
              <br />
              Reliable.
              <br />
              Community Focused.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-blue-100">
              Coordinate reports, monitor active incidents, and help every barangay response team move with confidence.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-xs font-semibold text-blue-50">
              <Shield size={14} />
              Verified access keeps emergency operations secure.
            </div>
          </div>

          <div className="text-[11px] text-blue-100">
            <div className="mb-1">
              Copyright 2026 TUGON Incident Management System
            </div>
            <div className="flex gap-3 text-[10px] text-blue-200">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Contact</span>
              <span>Emergency</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:px-8 sm:py-10 lg:items-center">
        <div className="absolute right-6 top-6 hidden lg:block">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-[500px]">
          <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
            <button onClick={() => navigate('/')} className="border-none bg-transparent p-0">
              <img
                src={mobileLogoSrc}
                alt="TUGON Tondo Emergency Response"
                className="h-9"
              />
            </button>
            <LanguageToggle />
          </div>

          <div className="rounded-xl bg-[var(--surface-container-lowest)] p-5 shadow-ambient sm:rounded-2xl sm:p-8 lg:p-10">
            <div className="mb-6">
              <h1
                ref={titleMetrics.ref}
                style={titleMetrics.minHeight ? { minHeight: titleMetrics.minHeight } : undefined}
                className="text-[26px] font-black tracking-[-0.03em] text-[var(--on-surface)] sm:text-[28px]"
              >
                {title}
              </h1>
              <p
                ref={subtitleMetrics.ref}
                style={subtitleMetrics.minHeight ? { minHeight: subtitleMetrics.minHeight } : undefined}
                className="mt-1.5 text-sm leading-relaxed text-[var(--on-surface-variant)]"
              >
                {subtitle}
              </p>
            </div>
            {children}
          </div>

          {topAction && (
            <div className="mt-4 flex justify-center">{topAction}</div>
          )}

          <div className="mt-5 text-center text-[10px] text-[var(--on-surface-variant)]">
            <span>Privacy</span>
            <span className="mx-2">|</span>
            <span>Terms</span>
            <span className="mx-2">|</span>
            <span>Contact</span>
            <span className="mx-2">|</span>
            <span>Emergency</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="mb-4.5 sm:mb-5">
      <label className="mb-1.5 block text-xs font-semibold text-[var(--on-surface-variant)]">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all duration-200 ${
          error
            ? 'bg-[var(--error-container)] shadow-[inset_0_-2px_0_var(--severity-critical)]'
            : focused
              ? 'bg-[var(--surface-container-low)] shadow-[inset_0_-2px_0_var(--primary),0_0_0_2px_rgba(0,35,111,0.12)]'
              : 'bg-[var(--surface-container-low)] shadow-[inset_0_-1px_0_rgba(68,70,81,0.22)]'
        }`}
      >
        {icon && (
          <div className={`shrink-0 transition-colors ${focused ? 'text-primary' : 'text-[var(--on-surface-variant)]'}`}>
            {icon}
          </div>
        )}
        <input
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)] placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      {error && <div className="mt-1.5 text-[11px] font-semibold text-[var(--error)]">! {error}</div>}
      {hint && !error && <div className="mt-1.5 text-[11px] text-[var(--on-surface-variant)]">{hint}</div>}
    </div>
  );
}

const BUTTON_COLORS: Record<string, string> = {
  '#1e3a8a': 'btn-primary-solid shadow-ambient',
  '#059669': 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_16px_rgba(5,150,105,0.24)]',
  '#b4730a': 'bg-severity-medium hover:bg-[#A16309] shadow-[0_4px_16px_rgba(180,115,10,0.24)]',
  '#b91c1c': 'bg-red-700 hover:bg-red-800 shadow-[0_4px_16px_rgba(185,28,28,0.24)]',
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
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition-all duration-200 ${colorClasses} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-fixed)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-55`}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : children}
    </button>
  );
}

interface AuthProgressStepperProps {
  steps: AuthProgressStep[];
  className?: string;
}

export function AuthProgressStepper({ steps, className = 'mb-7' }: AuthProgressStepperProps) {
  return (
    <div className={`${className} flex items-start gap-1 sm:gap-0`}>
      {steps.flatMap((step, idx) => {
        const isDone = step.status === 'done';
        const isActive = step.status === 'active';

        const items = [
          <div key={`step-${idx}`} className="flex flex-1 flex-col items-center px-1 text-center">
            <div
              className={`mb-1.5 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px] font-bold ${
                isDone
                  ? 'bg-emerald-600 text-white'
                  : isActive
                    ? 'bg-primary text-white'
                    : 'bg-[var(--surface-container-high)] text-[var(--outline)]'
              }`}
            >
              {isDone ? <CheckCircle2 size={15} /> : idx + 1}
            </div>
            <span
              className={`max-w-[90px] text-[10px] leading-tight sm:max-w-[120px] ${
                isDone
                  ? 'text-emerald-600'
                  : isActive
                    ? 'font-bold text-primary'
                    : 'text-[var(--outline)]'
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
              className={`mt-[15px] h-0.5 flex-1 ${isDone ? 'bg-emerald-600' : 'bg-[var(--surface-container-high)]'}`}
            />,
          );
        }

        return items;
      })}
    </div>
  );
}

export const AUTH_SPIN_STYLE = '';
