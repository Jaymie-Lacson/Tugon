import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle2, RefreshCw, Phone, ArrowLeft, ShieldCheck, House } from 'lucide-react';
import { AuthLayout, PrimaryButton } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';

const OTP_LENGTH = 6;
const PENDING_REGISTRATION_KEY = 'tugon.pending.registration';

type PendingRegistrationState = {
  phone?: string;
  fullName?: string;
  barangay?: string;
  flow?: 'registration' | 'password-reset';
};

export default function Verify() {
  const navigate = useNavigate();
  const location = useLocation();

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
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  useEffect(() => {
    if (!pendingState.phone) {
      setError('Registration session expired. Please restart registration.');
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
  }, [flow, pendingState.barangay, pendingState.fullName, pendingState.phone]);

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
      setError('Registration session expired. Please restart registration.');
      return;
    }

    if (!allFilled) { setError('Please enter all 6 digits of your OTP.'); return; }
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
      const message = err instanceof Error ? err.message : 'OTP verification failed.';
      setError(message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingState.phone) {
      setError('Registration session expired. Please restart registration.');
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
      const message = err instanceof Error ? err.message : 'Unable to resend OTP.';
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify Your Number"
      subtitle={`We sent a 6-digit OTP to ${displayPhone}. Enter it below to continue.`}
      topAction={(
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft size={14} />
          <House size={14} />
          Back to Homepage
        </button>
      )}
    >
      {/* Step indicator */}
      <div className="mb-7 flex items-center">
        {[
          { n: 1, label: 'Details', done: true },
          { n: 2, label: 'Verify', active: true },
          { n: 3, label: 'Password' },
        ].flatMap((step, idx) => {
          const items = [
            <div key={`step-${step.n}`} className="flex flex-1 flex-col items-center">
              <div className={`mb-1 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold ${
                step.done
                  ? 'bg-emerald-600 text-white'
                  : step.active
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-400'
              }`}>
                {step.done ? <CheckCircle2 size={15} /> : step.n}
              </div>
              <span className={`text-[10px] ${
                step.done
                  ? 'text-emerald-600'
                  : step.active
                    ? 'font-bold text-primary'
                    : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
          ];
          if (idx < 2) {
            items.push(
              <div key={`connector-${idx}`} className={`mb-[18px] h-0.5 flex-1 ${step.done ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            );
          }
          return items;
        })}
      </div>

      {/* Phone info pill */}
      <div className="mb-7 flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-sky-200 bg-sky-50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
          <Phone size={16} className="text-primary" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-slate-800">{displayPhone}</div>
          <div className="text-[11px] text-sky-700">OTP sent via SMS</div>
        </div>
      </div>

      {/* OTP boxes */}
      <div>
        <label className="mb-3 block text-xs font-semibold text-gray-700">
          6-Digit Verification Code
        </label>
        <div className="mb-2 flex justify-center gap-2.5" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigit(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className={`w-[52px] h-[60px] text-center text-2xl font-bold text-slate-900 border-2 rounded-xl outline-none transition-all caret-transparent ${
                error
                  ? 'border-red-700 bg-red-50'
                  : digit
                    ? 'border-primary bg-blue-50'
                    : 'border-slate-200 bg-[#F8FAFF]'
              } focus:border-primary focus:ring-[3px] focus:ring-primary/[0.12]`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-2 text-center text-xs font-medium text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* Hint */}
        {!error && (
          <div className="mb-2 text-center text-[11px] text-slate-400">
            Enter the OTP sent to your phone number.
          </div>
        )}
      </div>

      {/* Verify button */}
      <div className="mt-5">
        {verified ? (
          <div className="flex items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-emerald-300 bg-emerald-100 p-[15px] text-[15px] font-bold text-emerald-600">
            <ShieldCheck size={20} /> Verified! Redirecting…
          </div>
        ) : (
          <PrimaryButton
            loading={loading}
            onClick={handleVerify}
            disabled={!allFilled}
            color="#1E3A8A"
          >
            {!loading && <><ShieldCheck size={16} /> Verify Code</>}
          </PrimaryButton>
        )}
      </div>

      {/* Resend */}
      <div className="mt-5 text-center">
        {resendCountdown > 0 ? (
          <p className="text-xs text-slate-400">
            Resend code in <span className="font-bold text-primary">{resendCountdown}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className={`inline-flex items-center gap-1.5 border-none bg-transparent text-[13px] font-bold text-primary ${
              resending ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Sending…' : "Didn't receive a code? Resend"}
          </button>
        )}
      </div>

      {/* Back */}
      <div className="mt-3 text-center">
        <button
          onClick={() => navigate(flow === 'password-reset' ? '/auth/forgot-password' : '/auth/register')}
          className="inline-flex items-center gap-1 border-none bg-transparent text-xs text-slate-400 hover:text-slate-600"
        >
          <ArrowLeft size={13} /> {flow === 'password-reset' ? 'Back to Forgot Password' : 'Back to Registration'}
        </button>
      </div>
    </AuthLayout>
  );
}
