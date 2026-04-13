import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Phone, MapPin, ChevronDown, ArrowRight, CheckCircle2, ArrowLeft, House } from 'lucide-react';
import { AuthLayout, AuthProgressStepper, InputField, PrimaryButton } from '../../components/AuthLayout';
import { Button } from '../../components/ui/button';
import { authApi } from '../../services/authApi';
import { useTranslation } from '../../i18n';

const BARANGAYS = [
  { value: '251', label: 'Barangay 251', sub: 'Zone 24 — Tondo I/II' },
  { value: '252', label: 'Barangay 252', sub: 'Zone 25 — Tondo I/II' },
  { value: '256', label: 'Barangay 256', sub: 'Zone 26 — Tondo I/II' },
];

const PENDING_REGISTRATION_KEY = 'tugon.pending.registration';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; barangay?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) e.fullName = t('auth.register.error.fullName');
    const digits = phone.replace(/\D/g, '');
    if (!phone) e.phone = t('auth.register.error.phoneRequired');
    else if (digits.length < 10) e.phone = t('auth.register.error.phoneInvalid');
    if (!barangay) e.barangay = t('auth.register.error.barangayRequired');
    return e;
  };

  const handleSend = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.register({
        fullName,
        phoneNumber: phone,
        barangayCode: barangay,
      });

      const pendingRegistration = {
        phone,
        fullName,
        barangay,
      };
      sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pendingRegistration));
      navigate('/auth/verify', { state: pendingRegistration });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.register.error.sendOtpFailed');
      setErrors((prev) => ({ ...prev, general: message }));
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

  const selectedBarangay = BARANGAYS.find(b => b.value === barangay);

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      logoSrc="/tugon-header-logo.svg"
      topAction={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={14} />
          <House size={14} />
          {t('auth.backToHome')}
        </Button>
      }
    >
      <AuthProgressStepper
        steps={[
          { label: t('auth.steps.details'), status: 'active' },
          { label: t('auth.steps.verify'), status: 'upcoming' },
          { label: t('auth.steps.password'), status: 'upcoming' },
        ]}
      />

      <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
        {errors.general && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {errors.general}
          </div>
        )}

        <InputField
          label={t('auth.register.fullName')}
          placeholder={t('auth.register.fullNamePlaceholder')}
          value={fullName}
          onChange={setFullName}
          icon={<User size={17} />}
          error={errors.fullName}
          hint={t('auth.register.fullNameHint')}
          autoComplete="name"
          autoFocus
        />

        <InputField
          label={t('auth.register.phone')}
          type="tel"
          placeholder={t('auth.register.phonePlaceholder')}
          value={phone}
          onChange={v => setPhone(formatPhone(v))}
          icon={<Phone size={17} />}
          error={errors.phone}
          hint={t('auth.register.phoneHint')}
          inputMode="tel"
          maxLength={13}
          autoComplete="tel"
        />

        {/* Barangay selector */}
        <div className="mb-5 relative">
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {t('auth.register.barangay')}
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border bg-muted/50 px-3.5 py-3 text-left font-[inherit] transition-all ${
              errors.barangay
                ? 'border-destructive'
                : dropdownOpen
                  ? 'border-ring ring-[3px] ring-ring/50'
                  : 'border-input hover:border-ring/50'
            } focus-visible:outline-none`}
          >
            <MapPin size={17} className={`shrink-0 ${dropdownOpen ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              {selectedBarangay ? (
                <div>
                  <div className="text-sm font-medium text-foreground">{selectedBarangay.label}</div>
                  <div className="mt-px text-[10px] text-muted-foreground">{selectedBarangay.sub}</div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">{t('auth.register.selectBarangayPlaceholder')}</span>
              )}
            </div>
            <ChevronDown
              size={17}
              className={`shrink-0 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border bg-popover shadow-lg">
              {BARANGAYS.map(b => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setBarangay(b.value); setDropdownOpen(false); if (errors.barangay) setErrors(p => ({ ...p, barangay: undefined })); }}
                  className={`flex w-full cursor-pointer items-center gap-3 border-none px-4 py-3.5 text-left font-[inherit] transition-colors hover:bg-accent ${
                    b.value === barangay ? 'bg-accent' : 'bg-transparent'
                  } ${b.value !== '256' ? 'border-b border-solid border-border' : ''}`}
                >
                  <div className={`flex size-[34px] shrink-0 items-center justify-center rounded-lg ${
                    b.value === barangay ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <MapPin size={15} className={b.value === barangay ? 'text-primary-foreground' : 'text-primary'} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{b.label}</div>
                    <div className="mt-px text-[11px] text-muted-foreground">{b.sub}</div>
                  </div>
                  {b.value === barangay && <CheckCircle2 size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          )}

          {errors.barangay && <div className="mt-1.5 text-[11px] font-semibold text-destructive">! {errors.barangay}</div>}
        </div>

        {/* Info box */}
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border bg-muted/50 p-3">
          <Phone size={15} className="mt-px shrink-0 text-primary" />
          <div>
            <div className="mb-0.5 text-xs font-semibold text-foreground">{t('auth.register.smsTitle')}</div>
            <div className="text-[11px] leading-relaxed text-muted-foreground">
              {t('auth.register.smsDesc')}
            </div>
          </div>
        </div>

        <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
          {!loading && <><ArrowRight size={16} /> {t('auth.register.sendCode')}</>}
        </PrimaryButton>
      </form>

      <div className="mt-5 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/auth/login')}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft size={14} /> {t('auth.register.backToLogin')} <span className="font-bold text-primary">{t('auth.register.login')}</span>
        </Button>
      </div>
    </AuthLayout>
  );
}
