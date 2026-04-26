import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle2, RefreshCw, Phone, ArrowLeft, ShieldCheck, House } from 'lucide-react';
import { AuthLayout, AuthProgressStepper, PrimaryButton } from '../../components/AuthLayout';
import { Button } from '../../components/ui/button';
import { authApi } from '../../services/authApi';
import { useTranslation } from '../../i18n';
import { useDocumentHead } from '../../hooks/useDocumentHead';

const OTP_LENGTH = 6;
const PENDING_REGISTRATION_KEY = 'tugon.pending.registration';

type PendingRegistrationState = {
  phone?: string;
  fullName?: string;
  barangay?: string;
  flow?: 'registration' | 'password-reset';
};

export default function Verify() {
  useDocumentHead({
    title: 'Verify Account — TUGON',
    noindex: true,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const locationState = (location.state as PendingRegistrationState | null) ?? null;
  const storedState = useMemo<PendingRegistrationState>(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
      return raw ? (JSON.parse(raw) as PendingRegistrationState) : {};
    } catch {
      return {};
    }
  }, []);

  const pendingState = locationState?.phone ? locationState : storedState;
  const flow = pendingState.flow === 'password-reset' ? 'password-reset' : 'registration';
  const displayPhone = pendingState.phone || '0917-xxx-xxxx';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!pendingState.phone) {
      setError(t('auth.verify.sessionExpired'));
      return;
    }

    sessionStorage.setItem(
      PENDING_REGISTRATION_KEY,
      JSON.stringify({
        phone: pendingState.phone,
        fullName: pendingState.fullName,
        barangay: pendingState.barangay,
        flow,
      }),
    );
  }, [flow, pendingState.barangay, pendingState.fullName, pendingState.phone, t]);

  const handleDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError('');
    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((ch, i) => { if (i < OTP_LENGTH) next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const allFilled = digits.every(d => d !== '');

  const handleVerify = async () => {
    if (!pendingState.phone) {
      setError(t('auth.verify.sessionExpired'));
      return;
    }

    if (!allFilled) { setError(t('auth.verify.allDigits')); return; }
    setError('');
    setLoading(true);
    try {
      if (flow === 'password-reset') {
        await authApi.verifyPasswordResetOtp({
          phoneNumber: pendingState.phone,
          otpCode: digits.join(''),
        });
      } else {
        await authApi.verifyOtp({
          phoneNumber: pendingState.phone,
          otpCode: digits.join(''),
        });
      }
      setVerified(true);
      await new Promise(r => setTimeout(r, 700));
      navigate('/auth/create-password', {
        state: {
          phone: pendingState.phone,
          fullName: pendingState.fullName,
          barangay: pendingState.barangay,
          flow,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.verify.failed');
      setError(message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingState.phone) {
      setError(t('auth.verify.sessionExpired'));
      return;
    }

    setResending(true);
    try {
      if (flow === 'password-reset') {
        await authApi.requestPasswordResetOtp({ phoneNumber: pendingState.phone });
      } else {
        await authApi.resendOtp({ phoneNumber: pendingState.phone });
      }
      setResendCountdown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.verify.resendFailed');
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.verify.title')}
      subtitle={t('auth.verify.subtitle', { phone: displayPhone })}
      logoSrc="/tugon-header-logo.svg"
      topAction={(
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate('/')}
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={14} />
          <House size={14} />
          {t('auth.backToHome')}
        </Button>
      )}
    >
      <AuthProgressStepper
        steps={[
          { label: t('auth.steps.details'), status: 'done' },
          { label: t('auth.steps.verify'), status: 'active' },
          { label: t('auth.steps.password'), status: 'upcoming' },
        ]}
      />

      {/* Phone info pill */}
      <div className="mb-7 flex items-center gap-2.5 rounded-lg border bg-muted/50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Phone size={16} className="text-primary" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-foreground">{displayPhone}</div>
          <div className="text-[11px] text-muted-foreground">{t('auth.verify.otpSent')}</div>
        </div>
      </div>

      {/* OTP boxes */}
      <div>
        <label className="mb-3 block text-xs font-semibold text-muted-foreground">
          {t('auth.verify.codeLabel')}
        </label>
        <div className="mb-2 flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              type="text"
              aria-label={`Verification code digit ${idx + 1}`}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigit(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className={`h-[52px] w-[44px] rounded-xl border-2 text-center text-xl font-bold text-foreground caret-transparent outline-none transition-all sm:h-[60px] sm:w-[52px] sm:text-2xl ${
                error
                  ? 'border-destructive bg-destructive/5'
                  : digit
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/50'
              } focus:border-ring focus:ring-[3px] focus:ring-ring/50`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-2 text-center text-xs font-medium text-destructive" role="status" aria-live="polite">
            ! {error}
          </div>
        )}

        {/* Hint */}
        {!error && (
          <div className="mb-2 text-center text-[11px] text-muted-foreground">
            {t('auth.verify.hint')}
          </div>
        )}
      </div>

      {/* Verify button */}
      <div className="mt-5">
        {verified ? (
          <div className="flex items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-emerald-300 bg-emerald-100 p-[15px] text-[15px] font-bold text-emerald-600">
            <ShieldCheck size={20} /> {t('auth.verify.verified')}
          </div>
        ) : (
          <PrimaryButton
            loading={loading}
            onClick={handleVerify}
            disabled={!allFilled}
            color="#1E3A8A"
          >
            {!loading && <><ShieldCheck size={16} /> {t('auth.verify.verifyCode')}</>}
          </PrimaryButton>
        )}
      </div>

      {/* Resend */}
      <div className="mt-5 text-center">
        {resendCountdown > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('auth.verify.resendCountdown')} <span className="font-bold text-primary">{resendCountdown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border-none bg-transparent px-2 text-[13px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 ${
              resending ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
            {resending ? t('auth.verify.sending') : t('auth.verify.resendPrompt')}
          </button>
        )}
      </div>

      {/* Back */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => navigate(flow === 'password-reset' ? '/auth/forgot-password' : '/auth/register')}
          className="inline-flex min-h-11 items-center gap-1 rounded-md border-none bg-transparent px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
        >
          <ArrowLeft size={13} /> {flow === 'password-reset' ? t('auth.verify.backToForgot') : t('auth.verify.backToRegister')}
        </button>
      </div>
    </AuthLayout>
  );
}
