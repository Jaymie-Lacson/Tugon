import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';

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
      title="Forgot Password"
      subtitle="Enter your registered phone number and we'll send you a reset code via SMS."
    >
      {sent ? (
        <div className="text-center py-2">
          <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} color="#059669" />
          </div>
          <div className="text-emerald-800 text-[17px] font-extrabold mb-2">Code Sent!</div>
          <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
            A password reset code has been sent to <strong className="text-slate-800">{phone}</strong>. Check your SMS inbox.
          </p>

          <button
            onClick={() => navigate('/auth/verify', { state: { phone, flow: 'password-reset' } })}
            className="w-full py-3.5 bg-primary border-none rounded-[var(--radius-lg)] text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2 font-[inherit] mb-3"
          >
            <ArrowRight size={15} /> Enter Reset Code
          </button>

          <button
            onClick={() => setSent(false)}
            className="w-full py-3 bg-blue-50 border-[1.5px] border-blue-200 rounded-[var(--radius-lg)] text-primary text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 font-[inherit]"
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

          <div className="rounded-[var(--radius-lg)] border border-orange-200 bg-orange-50 p-3 mb-6 text-xs text-amber-800 leading-relaxed">
            If the number is not registered in TUGON, you will not receive a reset code. Contact your barangay office for assistance.
          </div>

          <PrimaryButton loading={loading} type="submit" color="#B4730A">
            {!loading && <><ArrowRight size={16} /> Send Reset Code</>}
          </PrimaryButton>
        </form>
      )}

      <div className="text-center mt-5">
        <button
          onClick={() => navigate('/auth/login')}
          className="bg-transparent border-none text-slate-500 text-sm cursor-pointer inline-flex items-center gap-1.5 font-[inherit]"
        >
          <ArrowLeft size={14} /> Back to <span className="text-primary font-bold ml-0.5">Sign In</span>
        </button>
      </div>
    </AuthLayout>
  );
}
