import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Phone, MapPin, ChevronDown, ArrowRight, CheckCircle2, ArrowLeft, House } from 'lucide-react';
import { AuthLayout, AuthProgressStepper, InputField, PrimaryButton } from '../../components/AuthLayout';
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
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) e.fullName = 'Enter your complete full name (first and last).';
    const digits = phone.replace(/\D/g, '');
    if (!phone) e.phone = 'Phone number is required.';
    else if (digits.length < 10) e.phone = 'Enter a valid Philippine phone number.';
    if (!barangay) e.barangay = 'Please select your barangay.';
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
      const message = error instanceof Error ? error.message : 'Unable to send OTP right now.';
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
      topAction={(
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--outline)] hover:text-primary"
        >
          <ArrowLeft size={14} />
          <House size={14} />
          {t('auth.backToHome')}
        </button>
      )}
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
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-3 text-red-700 text-xs mb-3.5">
            {errors.general}
          </div>
        )}

        {/* Full Name */}
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

        {/* Phone */}
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
          autoComplete="tel"
        />

        {/* Barangay selector */}
        <div className="mb-[18px] relative">
          <label className="mb-1.5 block text-xs font-semibold text-[var(--on-surface-variant)]">
            {t('auth.register.barangay')}
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-3.5 text-left font-[inherit] transition-all duration-150 ${
              errors.barangay
                ? 'bg-red-50 shadow-[inset_0_-2px_0_#dc2626]'
                : dropdownOpen
                  ? 'bg-[var(--surface-container-low)] shadow-[inset_0_-2px_0_var(--primary),0_0_0_2px_rgba(0,35,111,0.12)]'
                  : 'bg-[var(--surface-container-low)] shadow-[inset_0_-1px_0_rgba(68,70,81,0.22)]'
            }`}
          >
            <MapPin size={17} className={`shrink-0 ${dropdownOpen ? 'text-primary' : 'text-[var(--outline)]'}`} />
            <div className="flex-1">
              {selectedBarangay ? (
                <div>
                  <div className="text-[15px] font-medium text-[var(--on-surface)]">{selectedBarangay.label}</div>
                  <div className="mt-px text-[10px] text-[var(--outline)]">{selectedBarangay.sub}</div>
                </div>
              ) : (
                <span className="text-[15px] text-[var(--outline)]">{t('auth.register.selectBarangayPlaceholder')}</span>
              )}
            </div>
            <ChevronDown
              size={17}
              className={`shrink-0 text-[var(--outline)] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-[var(--outline-variant)]/40 bg-[var(--surface-container-lowest)] shadow-[0_10px_30px_rgba(13,28,46,0.16)]">
              {BARANGAYS.map(b => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setBarangay(b.value); setDropdownOpen(false); if (errors.barangay) setErrors(p => ({ ...p, barangay: undefined })); }}
                  className={`flex w-full cursor-pointer items-center gap-3 border-none px-4 py-3.5 text-left font-[inherit] transition-colors duration-100 hover:bg-[var(--surface-container-low)] ${
                    b.value === barangay ? 'bg-[var(--surface-container-low)]' : 'bg-transparent'
                  } ${b.value !== '256' ? 'border-b border-solid border-[var(--outline-variant)]/30' : ''}`}
                >
                  <div className={`flex size-[34px] shrink-0 items-center justify-center rounded-lg ${
                    b.value === barangay ? 'bg-primary' : 'bg-[var(--surface-container-low)]'
                  }`}>
                    <MapPin size={15} className={b.value === barangay ? 'text-white' : 'text-primary'} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--on-surface)]">{b.label}</div>
                    <div className="mt-px text-[11px] text-[var(--outline)]">{b.sub}</div>
                  </div>
                  {b.value === barangay && <CheckCircle2 size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          )}

          {errors.barangay && <div className="text-red-700 text-[11px] mt-1.5">&#9888; {errors.barangay}</div>}
        </div>

        {/* Info box */}
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--outline-variant)]/35 bg-[var(--surface-container-low)] p-3">
          <Phone size={15} className="shrink-0 mt-px text-sky-600" />
          <div>
            <div className="text-xs font-semibold text-sky-900 mb-0.5">{t('auth.register.smsTitle')}</div>
            <div className="text-[11px] text-sky-700 leading-relaxed">
              {t('auth.register.smsDesc')}
            </div>
          </div>
        </div>

        <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
          {!loading && <><ArrowRight size={16} /> {t('auth.register.sendCode')}</>}
        </PrimaryButton>
      </form>

      {/* Back to login */}
      <div className="text-center mt-5">
        <button
          onClick={() => navigate('/auth/login')}
          className="inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent text-sm text-[var(--outline)] font-[inherit]"
        >
          <ArrowLeft size={14} /> {t('auth.register.backToLogin')} <span className="text-primary font-bold">{t('auth.register.login')}</span>
        </button>
      </div>
    </AuthLayout>
  );
}
