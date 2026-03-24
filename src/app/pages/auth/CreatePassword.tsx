import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Eye, EyeOff, CheckCircle2, Shield, ArrowLeft, UserCheck, House } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton, AUTH_SPIN_STYLE } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';
import { clearAuthSession, saveAuthSession } from '../../utils/authSession';

interface StrengthRule {
  label: string;
  test: (pw: string) => boolean;
}

const PENDING_REGISTRATION_KEY = 'tugon.pending.registration';

const RULES: StrengthRule[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter (A–Z)', test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter (a–z)', test: pw => /[a-z]/.test(pw) },
  { label: 'One number (0–9)', test: pw => /\d/.test(pw) },
];

function getStrength(pw: string): { level: number; label: string; color: string } {
  const passed = RULES.filter(r => r.test(pw)).length;
  if (pw.length === 0) return { level: 0, label: '', color: '#E2E8F0' };
  if (passed <= 1) return { level: 1, label: 'Weak', color: '#B91C1C' };
  if (passed === 2) return { level: 2, label: 'Fair', color: '#B4730A' };
  if (passed === 3) return { level: 3, label: 'Good', color: '#0891B2' };
  return { level: 4, label: 'Strong', color: '#059669' };
}

export default function CreatePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { phone?: string; fullName?: string; barangay?: string }) || {};

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({});

  const strength = getStrength(password);

  const validate = () => {
    const e: typeof errors = {};
    if (!password) e.password = 'Please create a password.';
    else if (strength.level < 2) e.password = 'Password is too weak. Please follow the strength requirements.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleCreate = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!state.phone) {
      setErrors({ general: 'Registration phone number is missing. Please restart registration.' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const session = await authApi.createPassword({
        phoneNumber: state.phone,
        password,
      });
      saveAuthSession(session);

      try {
        await authApi.me(session.token);
      } catch {
        clearAuthSession();
        if (!session.token) {
          throw new Error(
            'Account created but no bearer token was returned, so cookie auth must work. Verify Railway env: AUTH_COOKIE_SAME_SITE=none, AUTH_COOKIE_SECURE_MODE=always, NODE_ENV=production, CORS_ALLOWED_ORIGINS=<exact frontend origin>.',
          );
        }

        throw new Error(
          'Account created, but the authenticated session is not usable yet. Please contact support to check backend auth cookie/CORS configuration.',
        );
      }

      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      setDone(true);
      await new Promise(r => setTimeout(r, 1200));
      navigate('/citizen', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create password.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const barangayLabel = state.barangay ? `Barangay ${state.barangay}` : 'your barangay';

  return (
    <>
      <style>{AUTH_SPIN_STYLE}{`
        @keyframes checkPop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <AuthLayout
        title="Create Your Password"
        subtitle="Almost done! Set a strong password to secure your TUGON account."
        topAction={(
          <button
            type="button"
            onClick={() => navigate('/')}
            className="auth-home-link-btn"
          >
            <ArrowLeft size={14} />
            <House size={14} />
            Back to Homepage
          </button>
        )}
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {[
            { n: 1, label: 'Details', done: true },
            { n: 2, label: 'Verify', done: true },
            { n: 3, label: 'Password', active: true },
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

        {/* Account summary pill */}
        {state.fullName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 24 }}>
            <div style={{ width: 34, height: 34, background: '#DCFCE7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCheck size={16} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>{state.fullName}</div>
              <div style={{ fontSize: 11, color: '#059669' }}>{barangayLabel} · {state.phone || ''}</div>
            </div>
            <CheckCircle2 size={16} color="#059669" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </div>
        )}

        {done ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '16px 0', animation: 'fadeSlideUp 0.4s ease' }}>
            <div style={{ width: 72, height: 72, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'checkPop 0.4s ease' }}>
              <CheckCircle2 size={36} color="#059669" />
            </div>
            <div style={{ color: '#065F46', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Account Created!</div>
            <div style={{ color: '#059669', fontSize: 13, marginBottom: 4 }}>Redirecting to your dashboard…</div>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleCreate(); }}>
            {errors.general && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#B91C1C',
                fontSize: 12,
                marginBottom: 14,
              }}>
                {errors.general}
              </div>
            )}

            {/* New password */}
            <InputField
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={password}
              onChange={v => { setPassword(v); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
              icon={<Lock size={17} />}
              error={errors.password}
              autoComplete="new-password"
              autoFocus
              rightElement={password.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              ) : null}
            />

            {/* Strength meter */}
            {password.length > 0 && (
              <div style={{ marginTop: -10, marginBottom: 18, animation: 'fadeSlideUp 0.25s ease' }}>
                {/* Bar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: strength.level >= level ? strength.color : '#E2E8F0',
                        transition: 'background 0.25s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>Password strength:</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: strength.color }}>{strength.label}</span>
                </div>

                {/* Rules checklist */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
                  {RULES.map(rule => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: passed ? '#D1FAE5' : '#F1F5F9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.2s',
                        }}>
                          <CheckCircle2 size={10} color={passed ? '#059669' : '#CBD5E1'} />
                        </div>
                        <span style={{ fontSize: 10, color: passed ? '#065F46' : '#94A3B8', transition: 'color 0.2s' }}>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm password */}
            <InputField
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={confirm}
              onChange={v => { setConfirm(v); if (errors.confirm) setErrors(p => ({ ...p, confirm: undefined })); }}
              icon={<Lock size={17} />}
              error={errors.confirm}
              autoComplete="new-password"
              rightElement={confirm.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                >
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              ) : null}
            />

            {/* Match indicator */}
            {confirm.length > 0 && password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -10, marginBottom: 18 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: password === confirm ? '#D1FAE5' : '#FEE2E2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={10} color={password === confirm ? '#059669' : '#B91C1C'} />
                </div>
                <span style={{ fontSize: 11, color: password === confirm ? '#059669' : '#B91C1C', fontWeight: 500 }}>
                  {password === confirm ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}

            {/* Security notice */}
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', marginBottom: 24, display: 'flex', gap: 10 }}>
              <Shield size={15} color="#B4730A" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11, color: '#92400E', lineHeight: 1.55 }}>
                Your password is encrypted and never stored in plain text. Never share your password with anyone, including barangay officials.
              </div>
            </div>

            <PrimaryButton loading={loading} type="submit" color="#059669">
              {!loading && <><CheckCircle2 size={16} /> Create Account</>}
            </PrimaryButton>
          </form>
        )}

        {/* Back */}
        {!done && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => navigate('/auth/verify', { state })}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
            >
              <ArrowLeft size={13} /> Back to OTP Verification
            </button>
          </div>
        )}
      </AuthLayout>
    </>
  );
}