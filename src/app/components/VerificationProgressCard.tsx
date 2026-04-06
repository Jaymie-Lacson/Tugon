import React from 'react';
import { ShieldCheck, Clock, AlertTriangle, Upload } from 'lucide-react';
import { getAuthSession } from '../utils/authSession';

type VerificationState = 'not_started' | 'pending' | 'rejected';

interface VerificationConfig {
  state: VerificationState;
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconBgClass: string;
}

function getVerificationConfig(): VerificationConfig | null {
  const session = getAuthSession();
  if (!session || session.user.role !== 'CITIZEN') return null;
  if (session.user.isVerified || session.user.isBanned) return null;

  const status = session.user.verificationStatus;

  if (status === 'PENDING') {
    return {
      state: 'pending',
      icon: <Clock size={18} />,
      title: 'Verification in progress',
      description: 'Your resident ID is under review. You can track your status anytime.',
      ctaLabel: 'View status',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-800',
      iconBgClass: 'bg-amber-100',
    };
  }

  if (status === 'REJECTED' || status === 'REUPLOAD_REQUESTED') {
    const reason = session.user.verificationRejectionReason
      ? ` Reason: ${session.user.verificationRejectionReason}`
      : '';
    return {
      state: 'rejected',
      icon: <AlertTriangle size={18} />,
      title: 'Action needed: re-upload your ID',
      description: `Your verification requires an updated ID image.${reason}`,
      ctaLabel: 'Re-upload ID',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      textClass: 'text-red-800',
      iconBgClass: 'bg-red-100',
    };
  }

  return {
    state: 'not_started',
    icon: <Upload size={18} />,
    title: 'Verify your account',
    description: 'Submit one valid ID photo so officials can verify your account.',
    ctaLabel: 'Start verification',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-primary',
    iconBgClass: 'bg-blue-100',
  };
}

export function hasVerificationProgressPrompt(): boolean {
  return getVerificationConfig() !== null;
}

interface VerificationProgressCardProps {
  className?: string;
}

export function VerificationProgressCard({ className = '' }: VerificationProgressCardProps) {
  const config = getVerificationConfig();
  if (!config) return null;

  const steps = [
    { label: 'Register', done: true },
    { label: 'Upload ID', done: config.state !== 'not_started' },
    { label: 'Verified', done: false },
  ];
  const progress = config.state === 'not_started' ? 33 : config.state === 'pending' ? 66 : 50;

  return (
    <div className={`rounded-xl border ${config.borderClass} ${config.bgClass} p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${config.iconBgClass} ${config.textClass}`}>
          {config.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-bold ${config.textClass}`}>{config.title}</div>
          <div className="mt-0.5 text-xs text-slate-600">{config.description}</div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className="h-full rounded-full bg-current transition-all duration-500"
              style={{ width: `${progress}%`, color: 'currentColor' }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-500">
            {steps.map((step) => (
              <span key={step.label} className={step.done ? config.textClass : ''}>
                {step.done ? <ShieldCheck size={10} className="mr-0.5 inline" /> : null}
                {step.label}
              </span>
            ))}
          </div>
        </div>
        <a
          href="/citizen/verification"
          className={`shrink-0 rounded-lg border ${config.borderClass} bg-white/70 px-3 py-1.5 text-xs font-bold no-underline transition-colors hover:bg-white ${config.textClass}`}
        >
          {config.ctaLabel}
        </a>
      </div>
    </div>
  );
}
