import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Eye, EyeOff, CheckCircle2, Shield, ArrowLeft, UserCheck, House } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton } from '../../components/AuthLayout';
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
  const state = (location.state as { phone?: string; fullName?: string; barangay?: string; flow?: 'registration' | 'password-reset' }) || {};
  const flow = state.flow === 'password-reset' ? 'password-reset' : 'registration';

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
      if (flow === 'password-reset') {
        await authApi.resetPassword({
          phoneNumber: state.phone,
          password,
        });
        sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
        setDone(true);
        await new Promise(r => setTimeout(r, 1000));
        navigate('/auth/login', { replace: true });
        return;
      }

      const session = await authApi.createPassword({
        phoneNumber: state.phone,
        password,
      });
      saveAuthSession(session);

      try {
        await authApi.me();
      } catch {
        clearAuthSession();
        throw new Error(
          'Account created, but the authenticated session is not usable yet. Please contact support to check backend auth cookie/CORS and CSRF configuration.',
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
      <style>{`
        @keyframes checkPop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <AuthLayout
        title={flow === 'password-reset' ? 'Set A New Password' : 'Create Your Password'}
        subtitle={flow === 'password-reset'
          ? 'Set a new password to regain access to your TUGON account.'
          : 'Almost done! Set a strong password to secure your TUGON account.'}
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
        <div className="flex items-center gap-0 mb-7">
          {[
            { n: 1, label: 'Details', done: true },
            { n: 2, label: 'Verify', done: true },
            { n: 3, label: 'Password', active: true },
          ].flatMap((step, idx) => {
            const items = [
              <div key={`step-${step.n}`} className="flex flex-col items-center flex-1">
                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold mb-1 ${
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
                      ? 'text-primary font-bold'
                      : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            ];
            if (idx < 2) {
              items.push(
                <div key={`connector-${idx}`} className={`flex-1 h-0.5 mb-[18px] ${step.done ? 'bg-emerald-600' : 'bg-slate-200'}`} />
              );
            }
            return items;
          })}
        </div>

        {/* Account summary pill */}
        {flow !== 'password-reset' && state.fullName && (
          <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-green-200 bg-green-50 p-3 mb-6">
            <div className="w-[34px] h-[34px] bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <UserCheck size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900">{state.fullName}</div>
              <div className="text-[11px] text-emerald-600">{barangayLabel} · {state.phone || ''}</div>
            </div>
            <CheckCircle2 size={16} className="text-emerald-600 ml-auto shrink-0" />
          </div>
        )}

        {done ? (
          /* Success state */
          <div className="text-center py-4" style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            <div className="w-[72px] h-[72px] bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4" style={{ animation: 'checkPop 0.4s ease' }}>
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <div className="text-emerald-900 text-lg font-extrabold mb-1.5">Account Created!</div>
            <div className="text-emerald-600 text-[13px] mb-1">Redirecting to your dashboard…</div>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleCreate(); }}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5 text-red-700 text-xs mb-3.5">
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
                  className="flex items-center bg-transparent border-none p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              ) : null}
            />

            {/* Strength meter */}
            {password.length > 0 && (
              <div className="-mt-2.5 mb-[18px]" style={{ animation: 'fadeSlideUp 0.25s ease' }}>
                {/* Bar */}
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className="flex-1 h-1 rounded-sm transition-colors"
                      style={{ backgroundColor: strength.level >= level ? strength.color : '#E2E8F0' }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[11px] text-slate-400">Password strength:</span>
                  <span className="text-[11px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
                </div>

                {/* Rules checklist */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {RULES.map(rule => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.label} className="flex items-center gap-[5px]">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          passed ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}>
                          <CheckCircle2 size={10} className={passed ? 'text-emerald-600' : 'text-slate-300'} />
                        </div>
                        <span className={`text-[10px] transition-colors ${passed ? 'text-emerald-900' : 'text-slate-400'}`}>{rule.label}</span>
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
                  className="flex items-center bg-transparent border-none p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              ) : null}
            />

            {/* Match indicator */}
            {confirm.length > 0 && password.length > 0 && (
              <div className="flex items-center gap-1.5 -mt-2.5 mb-[18px]">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                  password === confirm ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  <CheckCircle2 size={10} className={password === confirm ? 'text-emerald-600' : 'text-red-700'} />
                </div>
                <span className={`text-[11px] font-medium ${password === confirm ? 'text-emerald-600' : 'text-red-700'}`}>
                  {password === confirm ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}

            {/* Security notice */}
            <div className="rounded-[var(--radius-lg)] border border-orange-200 bg-orange-50 p-3 mb-6 flex gap-2.5">
              <Shield size={15} className="text-amber-700 shrink-0 mt-px" />
              <div className="text-[11px] text-amber-900 leading-[1.55]">
                Your password is encrypted and never stored in plain text. Never share your password with anyone, including barangay officials.
              </div>
            </div>

            <PrimaryButton loading={loading} type="submit" color="#059669">
              {!loading && <><CheckCircle2 size={16} /> {flow === 'password-reset' ? 'Reset Password' : 'Create Account'}</>}
            </PrimaryButton>
          </form>
        )}

        {/* Back */}
        {!done && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/auth/verify', { state })}
              className="bg-transparent border-none text-slate-400 text-xs cursor-pointer inline-flex items-center gap-1 font-[inherit]"
            >
              <ArrowLeft size={13} /> Back to OTP Verification
            </button>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
