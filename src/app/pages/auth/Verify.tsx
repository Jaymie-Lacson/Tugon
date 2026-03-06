import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle2, RefreshCw, Phone, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AuthLayout, PrimaryButton, AUTH_SPIN_STYLE } from '../../components/AuthLayout';

const OTP_LENGTH = 6;

export default function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { phone?: string; fullName?: string; barangay?: string }) || {};
  const displayPhone = state.phone || '0917-xxx-xxxx';

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
    if (!allFilled) { setError('Please enter all 6 digits of your OTP.'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    // Simulate: wrong code check (anything other than 123456)
    if (digits.join('') !== '123456') {
      setError('Incorrect OTP. Please check your SMS and try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }
    setVerified(true);
    await new Promise(r => setTimeout(r, 700));
    navigate('/auth/create-password', { state: { ...state } });
  };

  const handleResend = async () => {
    setResending(true);
    await new Promise(r => setTimeout(r, 1000));
    setResending(false);
    setResendCountdown(60);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    inputRefs.current[0]?.focus();
  };

  return (
    <>
      <style>{AUTH_SPIN_STYLE}{`
        @keyframes pop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        .otp-box:focus { border-color: #1E3A8A !important; box-shadow: 0 0 0 3px rgba(30,58,138,0.12) !important; }
        .otp-box.filled { border-color: #1E3A8A; background: #EFF6FF; }
        .otp-box.error { border-color: #B91C1C !important; background: #FEF2F2 !important; }
      `}</style>
      <AuthLayout
        title="Verify Your Number"
        subtitle={`We sent a 6-digit OTP to ${displayPhone}. Enter it below to continue.`}
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {[
            { n: 1, label: 'Details', done: true },
            { n: 2, label: 'Verify', active: true },
            { n: 3, label: 'Password' },
          ].flatMap((step, idx) => {
            const items = [
              <div key={`step-${step.n}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: step.done ? '#059669' : step.active ? '#1E3A8A' : '#E2E8F0',
                  color: step.done || step.active ? 'white' : '#94A3B8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, marginBottom: 4,
                }}>
                  {step.done ? <CheckCircle2 size={15} /> : step.n}
                </div>
                <span style={{ fontSize: 10, color: step.done ? '#059669' : step.active ? '#1E3A8A' : '#94A3B8', fontWeight: step.active ? 700 : 400 }}>
                  {step.label}
                </span>
              </div>
            ];
            if (idx < 2) {
              items.push(
                <div key={`connector-${idx}`} style={{ flex: 1, height: 2, background: step.done ? '#059669' : '#E2E8F0', marginBottom: 18 }} />
              );
            }
            return items;
          })}
        </div>

        {/* Phone info pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 14px', marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: '#DBEAFE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={16} color="#1E3A8A" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{displayPhone}</div>
            <div style={{ fontSize: 11, color: '#0369A1' }}>OTP sent via SMS</div>
          </div>
        </div>

        {/* OTP boxes */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
            6-Digit Verification Code
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }} onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}
                className={`otp-box${digit ? ' filled' : ''}${error ? ' error' : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                style={{
                  width: 52, height: 60, textAlign: 'center',
                  fontSize: 24, fontWeight: 700, color: '#1E293B',
                  border: `2px solid ${error ? '#B91C1C' : digit ? '#1E3A8A' : '#E2E8F0'}`,
                  borderRadius: 12,
                  background: error ? '#FEF2F2' : digit ? '#EFF6FF' : '#F8FAFF',
                  outline: 'none', cursor: 'text',
                  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                  animation: digit ? 'pop 0.2s ease' : 'none',
                  caretColor: 'transparent',
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ textAlign: 'center', color: '#B91C1C', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>
              ⚠ {error}
            </div>
          )}

          {/* Hint */}
          {!error && (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, marginBottom: 8 }}>
              Tip: For testing, enter <strong>1 2 3 4 5 6</strong>
            </div>
          )}
        </div>

        {/* Verify button */}
        <div style={{ marginTop: 20 }}>
          {verified ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#D1FAE5', border: '1.5px solid #6EE7B7', borderRadius: 10, padding: '15px', color: '#059669', fontWeight: 700, fontSize: 15 }}>
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
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {resendCountdown > 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 12 }}>
              Resend code in <span style={{ color: '#1E3A8A', fontWeight: 700 }}>{resendCountdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none', border: 'none', color: '#1E3A8A', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: 'inherit', opacity: resending ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} className={resending ? 'spinning' : ''} />
              {resending ? 'Sending…' : "Didn't receive a code? Resend"}
            </button>
          )}
        </div>

        {/* Back */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={() => navigate('/auth/register')}
            style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={13} /> Back to Registration
          </button>
        </div>
      </AuthLayout>
    </>
  );
}