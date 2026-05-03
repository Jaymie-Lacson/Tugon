import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthLayout, AuthProgressStepper, InputField, PrimaryButton } from '../../components/AuthLayout';
import { Button } from '../../components/ui/button';
import { authApi } from '../../services/authApi';
import { useTranslation } from '../../i18n';
import { useDocumentHead } from '../../hooks/useDocumentHead';

export default function ForgotPassword() {
  useDocumentHead({
    title: 'Forgot Password — TUGON',
    noindex: true,
  });
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
    if (!phone) { setError(t('auth.forgotPassword.error.phoneRequired')); return; }
    if (digits.length < 10) { setError(t('auth.forgotPassword.error.phoneInvalid')); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.requestPasswordResetOtp({
        phoneNumber: phone,
      });
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.forgotPassword.error.sendFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.forgotPassword.title')}
      subtitle={t('auth.forgotPassword.subtitle')}
      logoSrc="/tugon-header-logo.svg"
      mobileLogoSrc="/tugon-wordmark-blue.svg"
    >
      <AuthProgressStepper
        steps={[
          { label: t('auth.forgotPassword.step.requestCode'), status: sent ? 'done' : 'active' },
          { label: t('auth.forgotPassword.step.verifyCode'), status: sent ? 'active' : 'upcoming' },
          { label: t('auth.forgotPassword.step.newPassword'), status: 'upcoming' },
        ]}
      />

      {sent ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={32} color="#059669" />
          </div>
          <div className="mb-2 text-[17px] font-extrabold text-emerald-800">{t('auth.forgotPassword.codeSentTitle')}</div>
          <p className="mb-6 text-[13px] leading-relaxed text-muted-foreground">
            {t('auth.forgotPassword.codeSentDesc', { phone })}
          </p>

          <PrimaryButton
            onClick={() => navigate('/auth/verify', { state: { phone, flow: 'password-reset' } })}
            color="#1E3A8A"
          >
            <ArrowRight size={15} /> {t('auth.forgotPassword.enterCode')}
          </PrimaryButton>

          <Button
            onClick={() => setSent(false)}
            variant="secondary"
            className="mt-3 h-12 w-full gap-1.5 text-sm font-semibold"
          >
            <RefreshCw size={13} /> {t('auth.forgotPassword.differentNumber')}
          </Button>
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
            maxLength={13}
            autoComplete="tel"
            autoFocus
          />

          <div className="mb-6 rounded-[var(--radius-lg)] border border-orange-200 bg-orange-50 p-3 text-xs leading-relaxed text-amber-800">
            {t('auth.forgotPassword.notRegistered')}
          </div>

          <PrimaryButton loading={loading} type="submit" color="#B4730A">
            {!loading && <><ArrowRight size={16} /> {t('auth.forgotPassword.sendResetCode')}</>}
          </PrimaryButton>
        </form>
      )}

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => navigate('/auth/login')}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border-none bg-transparent px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
        >
          <ArrowLeft size={14} /> {t('auth.forgotPassword.backToLogin')} <span className="text-primary font-bold ml-0.5">{t('auth.login.submit')}</span>
        </button>
      </div>
    </AuthLayout>
  );
}
