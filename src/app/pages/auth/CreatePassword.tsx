import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Eye, EyeOff, CheckCircle2, Shield, ArrowLeft, UserCheck, House } from 'lucide-react';
import { AuthLayout, AuthProgressStepper, InputField, PrimaryButton } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';
import { clearAuthSession, saveAuthSession } from '../../utils/authSession';
import { useTranslation } from '../../i18n';

interface StrengthRule {
  key: string;
  test: (pw: string) => boolean;
}

const PENDING_REGISTRATION_KEY = 'tugon.pending.registration';

const RULES: StrengthRule[] = [
  { key: 'auth.createPassword.rule.length', test: pw => pw.length >= 8 },
  { key: 'auth.createPassword.rule.upper', test: pw => /[A-Z]/.test(pw) },
  { key: 'auth.createPassword.rule.lower', test: pw => /[a-z]/.test(pw) },
  { key: 'auth.createPassword.rule.number', test: pw => /\d/.test(pw) },
];

function getStrength(pw: string): { level: number; key: string; color: string } {
  const passed = RULES.filter(r => r.test(pw)).length;
  if (pw.length === 0) return { level: 0, key: '', color: '#E2E8F0' };
  if (passed <= 1) return { level: 1, key: 'auth.createPassword.strength.weak', color: 'var(--severity-critical)' };
  if (passed === 2) return { level: 2, key: 'auth.createPassword.strength.fair', color: 'var(--severity-medium)' };
  if (passed === 3) return { level: 3, key: 'auth.createPassword.strength.good', color: '#0891B2' };
  return { level: 4, key: 'auth.createPassword.strength.strong', color: '#059669' };
}

export default function CreatePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
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
    else if (password !== confirm) e.confirm = t('auth.createPassword.noMatch');
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
        title={flow === 'password-reset' ? t('auth.createPassword.titleReset') : t('auth.createPassword.title')}
        subtitle={flow === 'password-reset' ? t('auth.createPassword.subtitleReset') : t('auth.createPassword.subtitleRegister')}
        topAction={(
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary"
          >
            <ArrowLeft size={14} />
            <House size={14} />
            {t('auth.backToHome')}
          </button>
        )}
      >
        <AuthProgressStepper
          steps={[
            { label: t('auth.steps.details'), status: 'done' },
            { label: t('auth.steps.verify'), status: 'done' },
            { label: t('auth.steps.password'), status: 'active' },
          ]}
        />

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
            <div className="text-emerald-900 text-lg font-extrabold mb-1.5">
              {flow === 'password-reset' ? t('auth.createPassword.successReset') : t('auth.createPassword.success')}
            </div>
            <div className="text-emerald-600 text-[13px] mb-1">{t('auth.createPassword.redirecting')}</div>
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
              label={t('auth.createPassword.newPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.createPassword.newPasswordPlaceholder')}
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
                  <span className="text-[11px] text-slate-400">{t('auth.createPassword.strengthLabel')}</span>
                  <span className="text-[11px] font-bold" style={{ color: strength.color }}>{strength.key ? t(strength.key) : ''}</span>
                </div>

                {/* Rules checklist */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {RULES.map(rule => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.key} className="flex items-center gap-[5px]">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          passed ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}>
                          <CheckCircle2 size={10} className={passed ? 'text-emerald-600' : 'text-slate-300'} />
                        </div>
                        <span className={`text-[10px] transition-colors ${passed ? 'text-emerald-900' : 'text-slate-400'}`}>{t(rule.key)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm password */}
            <InputField
              label={t('auth.createPassword.confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('auth.createPassword.confirmPlaceholder')}
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
                  {password === confirm ? t('auth.createPassword.match') : t('auth.createPassword.noMatch')}
                </span>
              </div>
            )}

            {/* Security notice */}
            <div className="rounded-[var(--radius-lg)] border border-orange-200 bg-orange-50 p-3 mb-6 flex gap-2.5">
              <Shield size={15} className="text-amber-700 shrink-0 mt-px" />
              <div className="text-[11px] text-amber-900 leading-[1.55]">
                {t('auth.createPassword.securityNotice')}
              </div>
            </div>

            <PrimaryButton loading={loading} type="submit" color="#059669">
              {!loading && <><CheckCircle2 size={16} /> {flow === 'password-reset' ? t('auth.createPassword.resetButton') : t('auth.createPassword.createButton')}</>}
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
              <ArrowLeft size={13} /> {t('auth.createPassword.backToVerify')}
            </button>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
