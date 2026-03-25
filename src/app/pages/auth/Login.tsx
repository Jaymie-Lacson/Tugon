import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, Lock, Eye, EyeOff, ArrowRight, ShieldAlert, House, ArrowLeft } from 'lucide-react';
import { AuthLayout, InputField, PrimaryButton, AUTH_SPIN_STYLE } from '../../components/AuthLayout';
import { authApi } from '../../services/authApi';
import { clearAuthSession, saveAuthSession } from '../../utils/authSession';
import { validateLoginForm } from '../../utils/authValidation';

export default function Login() {
  const navigate = useNavigate();
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
          <div className="auth-login-error-banner">
            <ShieldAlert size={16} color="#B91C1C" className="auth-login-error-icon" />
            <span className="auth-login-error-text">{errors.general}</span>
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
                className="auth-login-password-toggle"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            ) : null}
          />

          {/* Forgot password */}
          <div className="auth-login-forgot-wrap">
            <button
              type="button"
              onClick={() => navigate('/auth/forgot-password')}
              className="auth-login-link-btn"
            >
              Forgot Password?
            </button>
          </div>

          <PrimaryButton loading={loading} type="submit" color="#1E3A8A">
            {!loading && <><ArrowRight size={16} /> Sign In</>}
          </PrimaryButton>
        </form>

        {/* Divider */}
        <div className="auth-login-divider">
          <div className="auth-login-divider-line" />
          <span className="auth-login-divider-text">New to TUGON?</span>
          <div className="auth-login-divider-line" />
        </div>

        {/* Register link */}
        <button
          onClick={() => navigate('/auth/register')}
          className="auth-login-register-btn"
        >
          Register a New Account
        </button>

        <p className="auth-login-terms-copy">
          By signing in, you agree to TUGON's terms and confirm you are a resident or official of Barangays 251, 252, or 256.
        </p>
      </AuthLayout>
    </>
  );
}
