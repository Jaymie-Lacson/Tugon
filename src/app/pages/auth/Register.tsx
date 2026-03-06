import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Phone, MapPin, ChevronDown, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton, AUTH_SPIN_STYLE } from '../../components/AuthLayout';

const BARANGAYS = [
  { value: '251', label: 'Barangay 251', sub: 'Zone 24 — Tondo I/II' },
  { value: '252', label: 'Barangay 252', sub: 'Zone 25 — Tondo I/II' },
  { value: '256', label: 'Barangay 256', sub: 'Zone 26 — Tondo I/II' },
];

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; barangay?: string }>({});

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
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    navigate('/auth/verify', { state: { phone, fullName, barangay } });
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0,4)}-${digits.slice(4)}`;
    return `${digits.slice(0,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
  };

  const selectedBarangay = BARANGAYS.find(b => b.value === barangay);

  return (
    <>
      <style>{AUTH_SPIN_STYLE}{`
        .brgy-option:hover { background: #EFF6FF !important; }
      `}</style>
      <AuthLayout
        title="Create Your Account"
        subtitle="Register to start reporting incidents and protecting your community in Tondo."
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {[
            { n: 1, label: 'Details' },
            { n: 2, label: 'Verify' },
            { n: 3, label: 'Password' },
          ].flatMap((step, idx) => {
            const items = [
              <div key={`step-${step.n}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: step.n === 1 ? '#1E3A8A' : '#E2E8F0',
                  color: step.n === 1 ? 'white' : '#94A3B8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, marginBottom: 4,
                }}>
                  {step.n}
                </div>
                <span style={{ fontSize: 10, color: step.n === 1 ? '#1E3A8A' : '#94A3B8', fontWeight: step.n === 1 ? 700 : 400 }}>
                  {step.label}
                </span>
              </div>
            ];
            if (idx < 2) {
              items.push(
                <div key={`connector-${idx}`} style={{ flex: 1, height: 2, background: '#E2E8F0', marginBottom: 18 }} />
              );
            }
            return items;
          })}
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
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
          <div style={{ marginBottom: 18, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Barangay
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                border: `1.5px solid ${errors.barangay ? '#B91C1C' : dropdownOpen ? '#1E3A8A' : '#E2E8F0'}`,
                borderRadius: 10, background: errors.barangay ? '#FEF2F2' : '#F8FAFF',
                padding: '14px', cursor: 'pointer', textAlign: 'left',
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(30,58,138,0.12)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <MapPin size={17} color={dropdownOpen ? '#1E3A8A' : '#94A3B8'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                {selectedBarangay ? (
                  <div>
                    <div style={{ fontSize: 15, color: '#1E293B', fontWeight: 500 }}>{selectedBarangay.label}</div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{selectedBarangay.sub}</div>
                  </div>
                ) : (
                  <span style={{ fontSize: 15, color: '#94A3B8' }}>Select your barangay…</span>
                )}
              </div>
              <ChevronDown
                size={17}
                color="#94A3B8"
                style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'white', border: '1.5px solid #1E3A8A', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(30,58,138,0.15)', zIndex: 50, overflow: 'hidden',
              }}>
                {BARANGAYS.map(b => (
                  <button
                    key={b.value}
                    type="button"
                    className="brgy-option"
                    onClick={() => { setBarangay(b.value); setDropdownOpen(false); if (errors.barangay) setErrors(p => ({ ...p, barangay: undefined })); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', background: b.value === barangay ? '#EFF6FF' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      borderBottom: b.value !== '256' ? '1px solid #F1F5F9' : 'none',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: b.value === barangay ? '#1E3A8A' : '#EFF6FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <MapPin size={15} color={b.value === barangay ? 'white' : '#1E3A8A'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 600 }}>{b.label}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{b.sub}</div>
                    </div>
                    {b.value === barangay && <CheckCircle2 size={16} color="#1E3A8A" />}
                  </button>
                ))}
              </div>
            )}

            {errors.barangay && <div style={{ color: '#B91C1C', fontSize: 11, marginTop: 5 }}>⚠ {errors.barangay}</div>}
          </div>

          {/* Info box */}
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 14px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Phone size={15} color="#0284C7" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0C4A6E', marginBottom: 2 }}>Verification via SMS</div>
              <div style={{ fontSize: 11, color: '#0369A1', lineHeight: 1.55 }}>
                A 6-digit One-Time Password (OTP) will be sent to your phone number. Standard SMS rates may apply.
              </div>
            </div>
          </div>

          <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
            {!loading && <><ArrowRight size={16} /> Send Verification Code</>}
          </PrimaryButton>
        </form>

        {/* Back to login */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate('/auth/login')}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} /> Already have an account? <span style={{ color: '#1E3A8A', fontWeight: 700 }}>Sign In</span>
          </button>
        </div>
      </AuthLayout>
    </>
  );
}