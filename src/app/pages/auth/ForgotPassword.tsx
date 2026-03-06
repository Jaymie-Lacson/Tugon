import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton, AUTH_SPIN_STYLE } from '../../components/AuthLayout';

export default function ForgotPassword() {
  const navigate = useNavigate();
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
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setSent(true);
  };

  return (
    <>
      <style>{AUTH_SPIN_STYLE}</style>
      <AuthLayout
        title="Forgot Password"
        subtitle="Enter your registered phone number and we'll send you a reset code via SMS."
      >
        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 64, height: 64, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="#059669" />
            </div>
            <div style={{ color: '#065F46', fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Code Sent!</div>
            <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              A password reset code has been sent to <strong style={{ color: '#1E293B' }}>{phone}</strong>. Check your SMS inbox.
            </p>

            <button
              onClick={() => navigate('/auth/verify', { state: { phone } })}
              style={{
                width: '100%', padding: '14px', background: '#1E3A8A', border: 'none',
                borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit', marginBottom: 12,
              }}
            >
              <ArrowRight size={15} /> Enter Reset Code
            </button>

            <button
              onClick={() => setSent(false)}
              style={{
                width: '100%', padding: '13px', background: '#F0F4FF', border: '1.5px solid #BFDBFE',
                borderRadius: 10, color: '#1E3A8A', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <RefreshCw size={13} /> Use a Different Number
            </button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
            <InputField
              label="Registered Phone Number"
              type="tel"
              placeholder="0917-xxx-xxxx"
              value={phone}
              onChange={v => { setPhone(formatPhone(v)); setError(''); }}
              icon={<Phone size={17} />}
              error={error}
              hint="Must match the phone number used during registration."
              inputMode="tel"
              autoComplete="tel"
              autoFocus
            />

            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', marginBottom: 24, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
              If the number is not registered in TUGON, you will not receive a reset code. Contact your barangay office for assistance.
            </div>

            <PrimaryButton loading={loading} type="submit" color="#B4730A">
              {!loading && <><ArrowRight size={16} /> Send Reset Code</>}
            </PrimaryButton>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate('/auth/login')}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} /> Back to <span style={{ color: '#1E3A8A', fontWeight: 700, marginLeft: 3 }}>Sign In</span>
          </button>
        </div>
      </AuthLayout>
    </>
  );
}
