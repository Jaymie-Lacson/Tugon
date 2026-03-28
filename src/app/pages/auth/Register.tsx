import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Phone, MapPin, ChevronDown, ArrowRight, CheckCircle2, ArrowLeft, House } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';

const BARANGAYS = [
  { value: '251', label: 'Barangay 251', sub: 'Zone 24 — Tondo I/II' },
  { value: '252', label: 'Barangay 252', sub: 'Zone 25 — Tondo I/II' },
  { value: '256', label: 'Barangay 256', sub: 'Zone 26 — Tondo I/II' },
];

const PENDING_REGISTRATION_KEY = 'tugon.pending.registration';

export default function Register() {
  const navigate = useNavigate();
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
      title="Create Your Account"
      subtitle="Register to start reporting incidents and protecting your community in Tondo."
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
          { n: 1, label: 'Details' },
          { n: 2, label: 'Verify' },
          { n: 3, label: 'Password' },
        ].flatMap((step, idx) => {
          const items = [
            <div key={`step-${step.n}`} className="flex flex-col items-center flex-1">
              <div className={`size-[30px] rounded-full flex items-center justify-center text-[13px] font-bold mb-1 ${
                step.n === 1
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {step.n}
              </div>
              <span className={`text-[10px] ${
                step.n === 1
                  ? 'text-primary font-bold'
                  : 'text-slate-400 font-normal'
              }`}>
                {step.label}
              </span>
            </div>
          ];
          if (idx < 2) {
            items.push(
              <div key={`connector-${idx}`} className="flex-1 h-0.5 bg-slate-200 -mb-[18px]" />
            );
          }
          return items;
        })}
      </div>

      <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
        {errors.general && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-3 text-red-700 text-xs mb-3.5">
            {errors.general}
          </div>
        )}

        {/* Full Name */}
        <InputField
          label="Full Name"
          placeholder="e.g. Juan dela Cruz"
          value={fullName}
          onChange={setFullName}
          icon={<User size={17} />}
          error={errors.fullName}
          hint="Enter your complete legal name."
          autoComplete="name"
          autoFocus
        />

        {/* Phone */}
        <InputField
          label="Phone Number"
          type="tel"
          placeholder="0917-xxx-xxxx"
          value={phone}
          onChange={v => setPhone(formatPhone(v))}
          icon={<Phone size={17} />}
          error={errors.phone}
          hint="A 6-digit verification code will be sent to this number."
          inputMode="tel"
          autoComplete="tel"
        />

        {/* Barangay selector */}
        <div className="mb-[18px] relative">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Barangay
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`w-full flex items-center gap-2.5 rounded-[10px] px-3.5 py-3.5 cursor-pointer text-left font-[inherit] border-[1.5px] transition-[border-color,box-shadow] duration-150 ${
              errors.barangay
                ? 'border-red-700 bg-red-50'
                : dropdownOpen
                  ? 'border-primary bg-[#F8FAFF] shadow-[0_0_0_3px_rgba(30,58,138,0.12)]'
                  : 'border-slate-200 bg-[#F8FAFF]'
            }`}
          >
            <MapPin size={17} className={`shrink-0 ${dropdownOpen ? 'text-primary' : 'text-slate-400'}`} />
            <div className="flex-1">
              {selectedBarangay ? (
                <div>
                  <div className="text-[15px] text-slate-800 font-medium">{selectedBarangay.label}</div>
                  <div className="text-[10px] text-slate-500 mt-px">{selectedBarangay.sub}</div>
                </div>
              ) : (
                <span className="text-[15px] text-slate-400">Select your barangay…</span>
              )}
            </div>
            <ChevronDown
              size={17}
              className={`shrink-0 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-[1.5px] border-primary rounded-xl shadow-[0_8px_24px_rgba(30,58,138,0.15)] z-50 overflow-hidden">
              {BARANGAYS.map(b => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setBarangay(b.value); setDropdownOpen(false); if (errors.barangay) setErrors(p => ({ ...p, barangay: undefined })); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-none cursor-pointer text-left font-[inherit] transition-colors duration-100 hover:bg-blue-50 ${
                    b.value === barangay ? 'bg-blue-50' : 'bg-transparent'
                  } ${b.value !== '256' ? 'border-b border-solid border-slate-100' : ''}`}
                >
                  <div className={`size-[34px] rounded-lg flex items-center justify-center shrink-0 ${
                    b.value === barangay ? 'bg-primary' : 'bg-blue-50'
                  }`}>
                    <MapPin size={15} className={b.value === barangay ? 'text-white' : 'text-primary'} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-800 font-semibold">{b.label}</div>
                    <div className="text-[11px] text-slate-500 mt-px">{b.sub}</div>
                  </div>
                  {b.value === barangay && <CheckCircle2 size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          )}

          {errors.barangay && <div className="text-red-700 text-[11px] mt-1.5">&#9888; {errors.barangay}</div>}
        </div>

        {/* Info box */}
        <div className="rounded-[var(--radius-lg)] border border-sky-200 bg-sky-50 p-3 mb-6 flex items-start gap-2.5">
          <Phone size={15} className="shrink-0 mt-px text-sky-600" />
          <div>
            <div className="text-xs font-semibold text-sky-900 mb-0.5">Verification via SMS</div>
            <div className="text-[11px] text-sky-700 leading-relaxed">
              A 6-digit One-Time Password (OTP) will be sent to your phone number. Standard SMS rates may apply.
            </div>
          </div>
        </div>

        <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
          {!loading && <><ArrowRight size={16} /> Send Verification Code</>}
        </PrimaryButton>
      </form>

      {/* Back to login */}
      <div className="text-center mt-5">
        <button
          onClick={() => navigate('/auth/login')}
          className="bg-transparent border-none text-slate-500 text-sm inline-flex items-center gap-1.5 cursor-pointer font-[inherit]"
        >
          <ArrowLeft size={14} /> Already have an account? <span className="text-primary font-bold">Sign In</span>
        </button>
      </div>
    </AuthLayout>
  );
}
