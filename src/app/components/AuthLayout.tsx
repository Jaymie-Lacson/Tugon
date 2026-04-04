import React from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { LanguageToggle } from '../i18n';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from './ui/utils';

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
    <div className="flex min-h-dvh w-full bg-background">
      {/* Left branding panel */}
      <aside className="relative hidden w-[46%] min-w-[430px] overflow-hidden bg-[linear-gradient(150deg,#00194f_0%,#00236f_40%,#1e3a8a_100%)] lg:flex">
        <div className="absolute -left-24 top-[-72px] h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 right-[-80px] h-72 w-72 rounded-full bg-[#90a8ff]/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_40%)]" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between px-10 py-8 text-white">
          <button onClick={() => navigate('/')} className="w-fit border-none bg-transparent p-0">
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              className="h-9"
            />
          </button>

          <div className="max-w-[380px]">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide">
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
      <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 lg:items-center">
        <div className="absolute right-6 top-6 hidden lg:block">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-[500px]">
          <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
            <button onClick={() => navigate('/')} className="border-none bg-transparent p-0">
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                className="h-9"
              />
            </button>
            <LanguageToggle />
          </div>

          <Card className="shadow-lg border-0 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-[28px] font-black tracking-[-0.03em]">{title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              {children}
            </CardContent>
          </Card>

          {topAction && (
            <div className="mt-4 flex justify-center">{topAction}</div>
          )}

          <div className="mt-5 text-center text-[10px] text-muted-foreground">
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
  const autoCompleteProps = autoComplete ? { autoComplete } : {};

  return (
    <div className="mb-5">
      <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          className={cn(
            'h-11 rounded-xl bg-muted/50',
            icon && 'pl-10',
            rightElement && 'pr-10',
            error && 'border-destructive focus-visible:ring-destructive/20',
          )}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          inputMode={inputMode}
          name={autoComplete ?? label.toLowerCase().replace(/\s+/g, '-')}
          autoFocus={autoFocus}
          {...autoCompleteProps}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && <div className="mt-1.5 text-[11px] font-semibold text-destructive">! {error}</div>}
      {hint && !error && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const BUTTON_VARIANT_MAP: Record<string, string> = {
  '#1e3a8a': 'btn-gradient-primary shadow-ambient',
  '#059669': 'bg-emerald-600 hover:bg-emerald-700',
  '#b4730a': 'bg-severity-medium hover:bg-[#A16309]',
  '#b91c1c': 'bg-red-700 hover:bg-red-800',
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
  const colorClasses = BUTTON_VARIANT_MAP[color.toLowerCase()] || BUTTON_VARIANT_MAP['#1e3a8a'];

  return (
    <Button
      className={cn('w-full h-12 text-sm font-bold gap-2', colorClasses)}
      size="lg"
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : children}
    </Button>
  );
}

interface AuthProgressStepperProps {
  steps: AuthProgressStep[];
  className?: string;
}

export function AuthProgressStepper({ steps, className = 'mb-7' }: AuthProgressStepperProps) {
  return (
    <div className={cn(className, 'flex items-center')}>
      {steps.flatMap((step, idx) => {
        const isDone = step.status === 'done';
        const isActive = step.status === 'active';

        const items = [
          <div key={`step-${idx}`} className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                'mb-1 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px] font-bold',
                isDone && 'bg-emerald-600 text-white',
                isActive && 'bg-primary text-primary-foreground',
                !isDone && !isActive && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <CheckCircle2 size={15} /> : idx + 1}
            </div>
            <span
              className={cn(
                'text-[10px]',
                isDone && 'text-emerald-600',
                isActive && 'font-bold text-primary',
                !isDone && !isActive && 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>,
        ];

        if (idx < steps.length - 1) {
          items.push(
            <div
              key={`connector-${idx}`}
              className={cn('mb-[18px] h-0.5 flex-1', isDone ? 'bg-emerald-600' : 'bg-muted')}
            />,
          );
        }

        return items;
      })}
    </div>
  );
}

export const AUTH_SPIN_STYLE = '';
