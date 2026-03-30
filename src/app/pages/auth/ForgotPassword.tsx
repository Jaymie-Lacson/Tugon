import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthLayout, AuthProgressStepper, InputField, PrimaryButton } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';
import { useTranslation } from '../../i18n';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0,4)}-${digits.slice(4)}`;
    return `${digits.slice(0,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
  };

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!phone) { setError('Phone number is required.'); return; }
    if (digits.length < 10) { setError('Enter a valid Philippine phone number.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.requestPasswordResetOtp({
        phoneNumber: phone,
      });
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send reset OTP.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.forgotPassword.title')}
      subtitle={t('auth.forgotPassword.subtitle')}
    >
      <AuthProgressStepper
        steps={[
          { label: t('auth.forgotPassword.step.requestCode'), status: sent ? 'done' : 'active' },
          { label: t('auth.forgotPassword.step.verifyCode'), status: sent ? 'active' : 'upcoming' },
          { label: t('auth.forgotPassword.step.newPassword'), status: 'upcoming' },
        ]}
      />

      {sent ? (
        <div className="text-center py-2">
          <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} color="#059669" />
          </div>
          <div className="text-emerald-800 text-[17px] font-extrabold mb-2">{t('auth.forgotPassword.codeSentTitle')}</div>
          <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
            {t('auth.forgotPassword.codeSentDesc', { phone })}
          </p>

          <button
            onClick={() => navigate('/auth/verify', { state: { phone, flow: 'password-reset' } })}
            className="w-full py-3.5 bg-primary border-none rounded-[var(--radius-lg)] text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2 font-[inherit] mb-3"
          >
            <ArrowRight size={15} /> {t('auth.forgotPassword.enterCode')}
          </button>

          <button
            onClick={() => setSent(false)}
            className="w-full py-3 bg-blue-50 border-[1.5px] border-blue-200 rounded-[var(--radius-lg)] text-primary text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 font-[inherit]"
          >
            <RefreshCw size={13} /> {t('auth.forgotPassword.differentNumber')}
          </button>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
          <InputField
            label={t('auth.forgotPassword.phoneLabel')}
            type="tel"
            placeholder={t('auth.forgotPassword.phonePlaceholder')}
            value={phone}
            onChange={v => { setPhone(formatPhone(v)); setError(''); }}
            icon={<Phone size={17} />}
            error={error}
            hint={t('auth.forgotPassword.phoneHint')}
            inputMode="tel"
            autoComplete="tel"
            autoFocus
          />

          <div className="rounded-[var(--radius-lg)] border border-orange-200 bg-orange-50 p-3 mb-6 text-xs text-amber-800 leading-relaxed">
            {t('auth.forgotPassword.notRegistered')}
          </div>

          <PrimaryButton loading={loading} type="submit" color="#B4730A">
            {!loading && <><ArrowRight size={16} /> {t('auth.forgotPassword.sendResetCode')}</>}
          </PrimaryButton>
        </form>
      )}

      <div className="text-center mt-5">
        <button
          onClick={() => navigate('/auth/login')}
          className="bg-transparent border-none text-slate-500 text-sm cursor-pointer inline-flex items-center gap-1.5 font-[inherit]"
        >
          <ArrowLeft size={14} /> {t('auth.forgotPassword.backToLogin')} <span className="text-primary font-bold ml-0.5">{t('auth.login.submit')}</span>
        </button>
      </div>
    </AuthLayout>
  );
}
