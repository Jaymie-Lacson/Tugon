import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, House, ArrowLeft } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton, AUTH_SPIN_STYLE } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';
import { clearAuthSession, saveAuthSession } from '../../utils/authSession';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    const digits = phone.replace(/\D/g, '');
    if (!phone) e.phone = 'Phone number is required.';
    else if (digits.length < 10) e.phone = 'Enter a valid Philippine phone number.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    return e;
  };

  const handleLogin = async () => {
    const e = validate();
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
        await authApi.me(session.token);
      } catch {
        clearAuthSession();
        if (!session.token) {
          throw new Error(
            'Login succeeded but no bearer token was returned, so cookie auth must work. Verify Railway env: AUTH_COOKIE_SAME_SITE=none, AUTH_COOKIE_SECURE_MODE=always, NODE_ENV=production, CORS_ALLOWED_ORIGINS=<exact frontend origin>.',
          );
        }

        throw new Error(
          'Login succeeded but your session cannot access protected APIs. Check backend auth cookie/CORS settings (AUTH_COOKIE_SAME_SITE, AUTH_COOKIE_SECURE_MODE, CORS_ALLOWED_ORIGINS).',
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
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
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
    <>
      <style>{AUTH_SPIN_STYLE}</style>
      <AuthLayout
        title="Welcome Back"
        subtitle="Sign in to your TUGON account to access the incident management dashboard."
        topAction={(
          <button
            type="button"
            onClick={() => navigate('/')}
            className="auth-home-link-btn"
          >
            <ArrowLeft size={14} />
            <House size={14} />
            Back to Homepage
          </button>
        )}
      >
        {/* General error */}
        {errors.general && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ShieldAlert size={16} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: '#B91C1C', fontSize: 13 }}>{errors.general}</span>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
          {/* Phone */}
          <InputField
            label="Phone Number"
            type="tel"
            placeholder="0917-xxx-xxxx"
            value={phone}
            onChange={v => setPhone(formatPhone(v))}
            icon={<Phone size={17} />}
            error={errors.phone}
            hint="Use your registered Philippine mobile number."
            inputMode="tel"
            autoComplete="tel"
            autoFocus
          />

          {/* Password */}
          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            icon={<Lock size={17} />}
            error={errors.password}
            autoComplete="current-password"
            rightElement={password.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            ) : null}
          />

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginTop: -10, marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => navigate('/auth/forgot-password')}
              style={{ background: 'none', border: 'none', color: '#1E3A8A', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              Forgot Password?
            </button>
          </div>

          <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
            {!loading && <><ArrowRight size={16} /> Sign In</>}
          </PrimaryButton>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>New to TUGON?</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        {/* Register link */}
        <button
          onClick={() => navigate('/auth/register')}
          style={{
            width: '100%', padding: '14px', background: '#F0F4FF',
            border: '1.5px solid #BFDBFE', borderRadius: 10,
            color: '#1E3A8A', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DBEAFE'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F0F4FF'; }}
        >
          Register a New Account
        </button>

        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 20, lineHeight: 1.6 }}>
          By signing in, you agree to TUGON's terms and confirm you are a resident or official of Barangays 251, 252, or 256.
        </p>
      </AuthLayout>
    </>
  );
}
