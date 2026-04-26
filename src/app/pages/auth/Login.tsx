import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, House } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton } from '../../components/AuthLayout';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { authApi } from '../../services/authApi';
import { clearAuthSession, saveAuthSession } from '../../utils/authSession';
import { validateLoginForm } from '../../utils/authValidation';
import { useTranslation } from '../../i18n';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});

  const handleLogin = async () => {
    const e = validateLoginForm(phone, password);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const session = await authApi.login({
        phoneNumber: phone,
        password,
      });

      saveAuthSession(session);

      try {
        await authApi.me();
      } catch {
        clearAuthSession();
        throw new Error(
          'Login succeeded but your session cannot access protected APIs. Check backend auth cookie/CORS and CSRF settings (AUTH_COOKIE_SAME_SITE, AUTH_COOKIE_SECURE_MODE, CORS_ALLOWED_ORIGINS).',
        );
      }

      if (session.user.role === 'CITIZEN') {
        navigate('/citizen', { replace: true });
        return;
      }

      if (session.user.role === 'SUPER_ADMIN') {
        navigate('/superadmin', { replace: true });
        return;
      }

      navigate('/app', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.login.unableSignIn');
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0,4)}-${digits.slice(4)}`;
    return `${digits.slice(0,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
  };

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      logoSrc="/tugon-header-logo.svg"
      mobileLogoSrc="/tugon-wordmark-blue.svg"
      topAction={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <House size={14} />
          {t('auth.backToHome')}
        </Button>
      }
    >
      {errors.general && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
        <InputField
          label={t('auth.login.phone')}
          type="tel"
          placeholder={t('auth.login.phonePlaceholder')}
          value={phone}
          onChange={v => setPhone(formatPhone(v))}
          icon={<Phone size={17} />}
          error={errors.phone}
          hint={t('auth.login.phoneHint')}
          inputMode="tel"
          maxLength={13}
          autoComplete="tel"
          autoFocus
        />

        <InputField
          label={t('auth.login.password')}
          type={showPassword ? 'text' : 'password'}
          placeholder={t('auth.login.passwordPlaceholder')}
          value={password}
          onChange={setPassword}
          icon={<Lock size={17} />}
          error={errors.password}
          autoComplete="current-password"
          rightElement={password.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('auth.password.hide') : t('auth.password.show')}
              title={showPassword ? t('auth.password.hide') : t('auth.password.show')}
              className="flex items-center rounded-md border-none bg-transparent p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          ) : null}
        />

        <div className="-mt-2 mb-5 text-right">
          <Button
            variant="link"
            size="sm"
            type="button"
            onClick={() => navigate('/auth/forgot-password')}
            className="h-auto p-0 text-xs font-semibold"
          >
            {t('auth.login.forgotPassword')}
          </Button>
        </div>

        <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
          {!loading && <><ArrowRight size={16} /> {t('auth.login.submit')}</>}
        </PrimaryButton>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t('auth.login.newToTugon')}</span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="secondary"
        className="w-full h-12 font-bold"
        onClick={() => navigate('/auth/register')}
      >
        {t('auth.login.registerNew')}
      </Button>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        {t('auth.login.termsNotice')}
      </p>
    </AuthLayout>
  );
}
