import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Map as MapIcon,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Radio,
  Shield,
  Star,
  Users,
  Volume2,
  X,
  Zap,
  Car,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { getAuthSession } from '../utils/authSession';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1736117705462-34145ac33bdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBjaXR5JTIwZ3JpZCUyMHVyYmFuJTIwbWFwJTIwc3RyZWV0c3xlbnwxfHx8fDE3NzI3ODE2MDl8MA&ixlib=rb-4.1.0&q=80&w=1080';

function SectionHeading({
  label,
  title,
  subtitle,
  light = false,
}: {
  label: string;
  title: string;
  subtitle: string;
  light?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 36 }}>
      <span
        style={{
          display: 'inline-block',
          background: light ? 'rgba(255,255,255,0.14)' : '#E8EEF9',
          border: light ? '1px solid rgba(255,255,255,0.22)' : '1px solid #CBD5E1',
          color: light ? '#DBEAFE' : 'var(--primary)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '6px 11px',
          borderRadius: 9,
          marginBottom: 10,
        }}
      >
        {label}
      </span>
      <h2
        style={{
          color: light ? '#FFFFFF' : '#1E293B',
          fontSize: 'clamp(24px,4vw,32px)',
          letterSpacing: '-0.01em',
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: light ? '#DBEAFE' : '#64748B',
          fontSize: 14,
          maxWidth: 620,
          margin: '0 auto',
          lineHeight: 1.6,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function AuthRedirectOverlay({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="auth-redirect-overlay" aria-live="polite" aria-busy="true">
      <div className="auth-redirect-loader" role="status" aria-label="Redirecting">
        <span className="auth-redirect-ring" aria-hidden="true" />
        <img src="/favicon.svg" alt="TUGON" className="auth-redirect-logo" />
      </div>
    </div>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
      const nextScrolled = isMobileViewport ? true : window.scrollY > 20;
      setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const syncViewportTop = () => {
      const topOffset = Math.max(0, viewport.offsetTop || 0);
      const leftOffset = Math.max(0, viewport.offsetLeft || 0);
      const viewportWidth = Math.max(0, viewport.width || window.innerWidth);
      document.documentElement.style.setProperty('--landing-nav-top', `${topOffset}px`);
      document.documentElement.style.setProperty('--landing-nav-left', `${leftOffset}px`);
      document.documentElement.style.setProperty('--landing-nav-width', `${viewportWidth}px`);
    };

    syncViewportTop();
    viewport.addEventListener('resize', syncViewportTop);
    viewport.addEventListener('scroll', syncViewportTop);
    window.addEventListener('orientationchange', syncViewportTop);

    return () => {
      viewport.removeEventListener('resize', syncViewportTop);
      viewport.removeEventListener('scroll', syncViewportTop);
      window.removeEventListener('orientationchange', syncViewportTop);
      document.documentElement.style.removeProperty('--landing-nav-top');
      document.documentElement.style.removeProperty('--landing-nav-left');
      document.documentElement.style.removeProperty('--landing-nav-width');
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const closeMenuOnScroll = () => {
      setMobileOpen(false);
    };

    const closeMenuOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && navRef.current?.contains(target)) {
        return;
      }

      setMobileOpen(false);
    };

    window.addEventListener('scroll', closeMenuOnScroll, { passive: true });
    window.addEventListener('pointerdown', closeMenuOnOutsideTap, true);

    return () => {
      window.removeEventListener('scroll', closeMenuOnScroll);
      window.removeEventListener('pointerdown', closeMenuOnOutsideTap, true);
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: 'How It Works', href: '#how' },
    { label: 'Safety Tips', href: '#safety' },
    { label: 'Hotlines', href: '#hotlines' },
  ];

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    setMobileOpen(false);
    window.setTimeout(() => {
      navigate(path);
    }, 260);
  };

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <nav
        className="landing-navbar"
        ref={navRef}
        style={{
          position: 'fixed',
          top: 'var(--landing-nav-top, 0px)',
          left: 'var(--landing-nav-left, 0px)',
          width: 'var(--landing-nav-width, 100%)',
          zIndex: 100,
          background: scrolled ? 'rgba(15,23,42,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'background 0.3s, backdrop-filter 0.3s',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => navigate('/')}
            aria-label="Go to TUGON home"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              style={{ height: 38, width: 'auto', display: 'block' }}
            />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-desktop">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: 6,
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="nav-cta">
            <button
              onClick={() => navigateAuthWithOverlay('/auth/login')}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                padding: '8px 16px',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigateAuthWithOverlay('/auth/register')}
              style={{
                background: 'var(--severity-critical)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Register
            </button>
          </div>

          <button
            type="button"
            className={mobileOpen ? 'nav-mobile-btn is-open' : 'nav-mobile-btn'}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 6,
              width: 44,
              height: 44,
              padding: 0,
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0,
              transition: 'background 180ms ease, transform 180ms ease',
            }}
          >
            <span className={mobileOpen ? 'nav-mobile-icon is-open' : 'nav-mobile-icon'}>
              {mobileOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
            </span>
          </button>
        </div>

        <div
          id="landing-mobile-nav"
          className={mobileOpen ? 'nav-mobile-panel is-open' : 'nav-mobile-panel'}
          aria-hidden={!mobileOpen}
          style={{
            background: 'rgba(15,23,42,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: mobileOpen ? '12px 20px 20px' : '0 20px',
            maxHeight: mobileOpen ? 360 : 0,
            opacity: mobileOpen ? 1 : 0,
            transform: mobileOpen ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: mobileOpen ? 'auto' : 'none',
            overflow: 'hidden',
            transition:
              'max-height 320ms cubic-bezier(0.2, 0.65, 0.3, 1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
          }}
        >
            {navLinks.map((link) => (
              <button
                className={mobileOpen ? 'nav-mobile-item is-open' : 'nav-mobile-item'}
                key={link.label}
                onClick={() => scrollTo(link.href)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 14,
                  padding: '12px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  opacity: mobileOpen ? 1 : 0,
                  transform: mobileOpen ? 'translateY(0)' : 'translateY(-6px)',
                  transition: 'opacity 180ms ease, transform 180ms ease',
                }}
              >
                {link.label}
              </button>
            ))}
            <div
              className={mobileOpen ? 'nav-mobile-item is-open' : 'nav-mobile-item'}
              style={{
                display: 'grid',
                gap: 8,
                marginTop: 14,
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 180ms ease, transform 180ms ease',
              }}
            >
              <button
                onClick={() => navigateAuthWithOverlay('/auth/login')}
                style={{
                  width: '100%',
                  background: 'var(--severity-critical)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Login to Continue
              </button>
              <button
                onClick={() => navigateAuthWithOverlay('/auth/register')}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 8,
                  padding: '10px',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Register
              </button>
            </div>
        </div>
      </nav>

      <style>{`
        .landing-navbar {
          isolation: isolate;
          max-width: 100%;
        }

        .nav-mobile-icon {
          display: inline-flex;
          transition: transform 180ms ease;
        }

        .hero-wordmark-red {
          transform: translateY(0.16em);
          max-width: min(35vw, 248px);
        }

        .nav-mobile-icon.is-open {
          transform: rotate(90deg);
        }

        @media (max-width: 768px) {
          .landing-navbar {
            position: fixed !important;
            top: var(--landing-nav-top, 0px) !important;
            left: var(--landing-nav-left, 0px) !important;
            width: var(--landing-nav-width, 100%) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: rgba(15, 23, 42, 0.98) !important;
            transition: none !important;
          }

          .nav-desktop { display: none !important; }
          .nav-cta { display: none !important; }
          .nav-mobile-btn { display: flex !important; }

          .nav-mobile-btn.is-open {
            transform: scale(0.97);
            background: rgba(255,255,255,0.2) !important;
          }

          .nav-mobile-panel .nav-mobile-item:nth-child(1) { transition-delay: 40ms; }
          .nav-mobile-panel .nav-mobile-item:nth-child(2) { transition-delay: 80ms; }
          .nav-mobile-panel .nav-mobile-item:nth-child(3) { transition-delay: 120ms; }
          .nav-mobile-panel .nav-mobile-item:nth-child(4) { transition-delay: 160ms; }

          .hero-wordmark-red {
            transform: translateY(0.12em);
            max-width: min(45vw, 188px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nav-mobile-icon,
          .nav-mobile-panel,
          .nav-mobile-item,
          .nav-mobile-btn {
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<'report' | 'track' | 'community' | null>(null);
  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateWithTransition = (action: 'report' | 'track' | 'community', path: string, isAuth = false) => {
    setActiveAction(action);
    if (isAuth) {
      setAuthRedirecting(true);
    }
    window.setTimeout(() => {
      navigate(path);
    }, isAuth ? 260 : 170);
  };

  const scrollToQuickActions = () => {
    document.querySelector('#quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section
        data-reveal
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src={HERO_IMAGE} alt="City aerial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(15,23,42,0.93) 0%, rgba(30,58,138,0.86) 55%, rgba(15,23,42,0.92) 100%)',
            }}
          />
        </div>

        <div
          data-reveal
          className={activeAction ? 'hero-transition-scope is-routing' : 'hero-transition-scope'}
          style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '100px 24px 56px', width: '100%', transitionDelay: '90ms' }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(185,28,28,0.2)',
                border: '1px solid rgba(185,28,28,0.4)',
                borderRadius: 9,
                padding: '6px 14px',
                marginBottom: 24,
              }}
            >
              <Radio size={12} color="#F87171" />
              <span style={{ color: '#FCA5A5', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Live in Barangays 251, 252, 256
              </span>
            </div>

            <h1
              style={{
                color: '#FFFFFF',
                fontSize: 'clamp(30px,6vw,56px)',
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: 14,
                maxWidth: 760,
              }}
            >
              EMPOWERING <span style={{ color: '#60A5FA' }}>TONDO</span> WITH INSTANT{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <img
                  src="/tugon-wordmark-red.svg"
                  alt="TUGON"
                  className="hero-wordmark-red"
                  style={{ height: '1.2em', width: 'auto', display: 'inline-block' }}
                />
              </span>
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(14px,2vw,18px)', lineHeight: 1.55, maxWidth: 540, marginBottom: 22 }}>
              Report. Track. Stay aware.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
              <button
                onClick={() => navigateWithTransition('report', '/auth/register', true)}
                className={activeAction === 'report' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}
                style={{
                  background: 'var(--severity-critical)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '13px 24px',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} /> Report an Incident
              </button>
              <button
                onClick={() => navigateWithTransition('track', '/auth/login', true)}
                className={activeAction === 'track' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: 10,
                  padding: '13px 24px',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} /> Track Status
              </button>
            </div>

            <button
              onClick={() => navigateWithTransition('community', '/community-map', true)}
              className={activeAction === 'community' ? 'hero-link-action is-clicking' : 'hero-link-action'}
              style={{
                background: 'none',
                border: 'none',
                color: '#FCD34D',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MapIcon size={14} /> View Community Map <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <button
          data-reveal
          onClick={scrollToQuickActions}
          aria-label="Scroll to quick actions"
          className="landing-scroll-cue"
          style={{ transitionDelay: '220ms' }}
        >
          <span className="landing-scroll-cue-icon" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </button>

      </section>
    </>
  );
}

function QuickActions() {
  const navigate = useNavigate();

  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigate(path);
    }, 260);
  };

  const actions = [
    {
      title: 'Report Incident',
      desc: 'Pin location, add evidence, submit report.',
      icon: AlertTriangle,
      color: 'var(--severity-critical)',
      bg: '#FEE2E2',
      action: () => navigateAuthWithOverlay('/auth/register'),
    },
    {
      title: 'Track Status',
      desc: 'Monitor your report from start to resolution.',
      icon: FileText,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      action: () => navigateAuthWithOverlay('/auth/login'),
    },
    {
      title: 'View Community Map',
      desc: 'See incidents near you in real-time.',
      icon: MapIcon,
      color: 'var(--severity-medium)',
      bg: '#FEF3C7',
      action: () => navigateAuthWithOverlay('/community-map'),
    },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section id="quick-actions" data-reveal style={{ padding: '56px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Quick Access"
          title="Start With One Simple Action"
          subtitle="Pick what you need right now."
        />

        <div
          className="quick-actions-desktop"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {actions.map((item, index) => (
            <button
              className="quick-action-btn"
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.title}
              onClick={item.action}
              style={{
                textAlign: 'left',
                padding: '18px 18px 16px',
                minHeight: 176,
                border: '1px solid rgba(255,255,255,0.38)',
                borderRadius: 12,
                background: item.color,
                cursor: 'pointer',
                transitionDelay: `${index * 90}ms`,
                boxShadow: '0 8px 16px rgba(15,23,42,0.14)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={16} color="#FFFFFF" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>{item.title}</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{item.desc}</div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="quick-action-open">
                  Open <ArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="quick-actions-mobile" style={{ display: 'none', gap: 12 }}>
          {actions.map((item) => (
            <button
              className="quick-action-btn"
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.title}
              onClick={item.action}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.38)',
                background: item.color,
                padding: '14px',
                cursor: 'pointer',
                transitionDelay: '100ms',
                boxShadow: '0 8px 16px rgba(15,23,42,0.14)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 162,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} color="#FFFFFF" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>{item.title}</div>
              </div>
              <div style={{ textAlign: 'left', fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.45 }}>{item.desc}</div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="quick-action-open">
                  Open <ArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>

        <style>{`
          .quick-action-btn {
            transition: transform 170ms ease, box-shadow 170ms ease, border-color 170ms ease;
          }

          .quick-action-open {
            color: #0F172A;
            font-size: 12px;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: #FFFFFF;
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 8px;
            padding: 5px 12px;
          }

          .quick-action-btn:hover,
          .quick-action-btn:focus-visible {
            transform: translateY(-1px);
            box-shadow: 0 10px 18px rgba(15,23,42,0.18) !important;
            border-color: rgba(255,255,255,0.58) !important;
            outline: none;
          }

          .quick-action-btn:active {
            transform: translateY(0) scale(0.99);
            box-shadow: 0 5px 12px rgba(15,23,42,0.12) !important;
          }

          @media (max-width: 768px) {
            .quick-actions-desktop { display: none !important; }
            .quick-actions-mobile { display: grid !important; }
          }
        `}</style>
      </div>
      </section>
    </>
  );
}

function HowToUse() {
  const steps = [
    {
      title: 'Submit Report',
      detail: 'Pin location and attach photo or voice.',
      icon: FileText,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      visual: 'Citizen',
    },
    {
      title: 'Barangay Review',
      detail: 'Officials validate and assign response.',
      icon: Users,
      color: 'var(--severity-medium)',
      bg: '#FEF3C7',
      visual: 'Official',
    },
    {
      title: 'Resolution',
      detail: 'Track updates until closure.',
      icon: CheckCircle2,
      color: '#059669',
      bg: '#D1FAE5',
      visual: 'Outcome',
    },
  ];

  return (
    <section id="how" data-reveal style={{ padding: '88px 24px', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="How It Works"
          title="Three Simple Steps"
          subtitle="Fast, guided, and trackable."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {steps.map((step, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={step.title}
              style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: 22,
                transitionDelay: `${index * 90}ms`,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    background: step.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <step.icon size={24} color={step.color} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Step {index + 1}
                    </div>
                    <h3 style={{ fontSize: 17, color: '#1E293B', fontWeight: 800, margin: '2px 0 0' }}>{step.title}</h3>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: step.color, background: step.bg, borderRadius: 7, padding: '5px 9px', fontWeight: 800, border: `1px solid ${step.color}33` }}>
                  {step.visual}
                </span>
              </div>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: 0 }}>{step.detail}</p>
              <div style={{ marginTop: 2, height: 8, borderRadius: 5, background: '#E2E8F0', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${(index + 1) * 33}%`, borderRadius: 5, background: step.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportedBarangays() {
  const navigate = useNavigate();

  const barangays = [
  {
    name: 'Barangay 251',
    captain: 'Reynaldo Angat',
    district: 'District II, Tondo, Manila',
    hallAddress: '1781 Almeda Street, Tondo, Manila',
    responders: ['MDRRMO', 'BFP', 'PNP'],
    color: 'var(--primary)',
    light: '#EFF6FF',
  },
  {
    name: 'Barangay 252',
    captain: 'Leana Angat',
    district: 'District II, Tondo, Manila',
    hallAddress: '1787 Biak-na-Bato Street, Tondo, Manila',
    responders: ['MDRRMO', 'PNP', 'EMS'],
    color: 'var(--severity-critical)',
    light: '#FEE2E2',
  },
  {
    name: 'Barangay 256',
    captain: 'Ramon "Peaches" Perez',
    district: 'District II, Tondo, Manila',
    hallAddress: '1865 Tescon de Cuia Street, Tondo, Manila',
    responders: ['MDRRMO', 'BFP', 'EMS'],
    color: 'var(--severity-medium)',
    light: '#FEF3C7',
  },
];

  return (
    <section id="barangays" data-reveal style={{ padding: '88px 24px', background: 'var(--primary)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Coverage"
          title="Three Barangays, One Platform"
          subtitle="Geofenced incident routing for Tondo communities."
          light
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {barangays.map((item, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 18,
                padding: 28,
                transitionDelay: `${index * 90}ms`,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                marginBottom: 18,
                display: 'flex',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: 74,
                  height: 74,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.13)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255,255,255,0.22)'
                }}>
                  <MapPin size={32} color="#FFFFFF" strokeWidth={2.4} />
                </div>
              </div>

              <h3 style={{ margin: '0 0 6px 0', color: 'white', fontSize: 20, fontWeight: 800 }}>{item.name}</h3>
              <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#DBEAFE', fontWeight: 700 }}>Barangay Captain: {item.captain}</p>
              <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#DBEAFE', fontWeight: 600 }}>{item.district}</p>
              <p style={{ margin: '0 0 18px 0', fontSize: 12, color: '#BFDBFE', fontWeight: 500 }}>{item.hallAddress}</p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                {item.responders.map(r => (
                  <span key={r} style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {r}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate('/auth/register')}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: 9,
                  padding: '12px',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                Start Reporting <ChevronRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SafetyTips() {
  const tips = [
    {
      title: 'Clean Surroundings',
      icon: Shield,
      color: '#0F766E',
      bg: '#CCFBF1',
      actions: ['Dispose waste properly', 'Keep drainage clear'],
    },
    {
      title: 'Noise Control',
      icon: Users,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      actions: ['Respect quiet hours', 'Record details safely'],
    },
    {
      title: 'Road Safety',
      icon: AlertTriangle,
      color: 'var(--severity-medium)',
      bg: '#FEF3C7',
      actions: ['Use marked crossings', 'Report hazards quickly'],
    },
  ];

  return (
    <section id="safety" data-reveal style={{ padding: '88px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Awareness"
          title="Community Safety Tips"
          subtitle="Quick reminders for daily safety."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {tips.map((tip, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={tip.title}
              style={{
                border: '2px solid #E2E8F0',
                borderRadius: 16,
                padding: 24,
                background: 'white',
                transitionDelay: `${index * 90}ms`,
                textAlign: 'center'
              }}
            >
              <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: tip.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <tip.icon size={28} color={tip.color} strokeWidth={2.5} />
                </div>
              </div>
              <h3 style={{ fontSize: 17, color: '#1E293B', fontWeight: 800, margin: '0 0 12px 0' }}>{tip.title}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                {tip.actions.map((action) => (
                  <span
                    key={action}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: tip.color,
                      background: tip.bg,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${tip.color}33`,
                    }}
                  >
                    {action}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                <CheckCircle2 size={14} color={tip.color} />
                Report incidents right away through TUGON.
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmergencyHotlines() {
  const hotlines = [
    { name: 'National Emergency', number: '911', note: 'Police, fire, medical', color: 'var(--severity-critical)', bg: '#FEE2E2' },
    { name: 'PNP Hotline', number: '117', note: 'Law enforcement', color: 'var(--primary)', bg: '#DBEAFE' },
    { name: 'Fire Protection', number: '160', note: 'Fire and rescue', color: 'var(--severity-medium)', bg: '#FEF3C7' },
  ];

  return (
    <section id="hotlines" data-reveal style={{ padding: '88px 24px', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Emergency Contacts"
          title="Emergency Hotlines"
          subtitle="Call first for urgent situations."
        />

        <div
          data-reveal
          style={{
            background: 'var(--severity-critical)',
            border: '1px solid #991B1B',
            borderRadius: 12,
            padding: '20px 22px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            transitionDelay: '80ms',
          }}
        >
          <div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Emergency? Call 911</div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>Then file details in TUGON.</div>
          </div>
          <a
            href="tel:911"
            style={{
              background: 'white',
              color: 'var(--severity-critical)',
              textDecoration: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Phone size={14} /> Call Now
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {hotlines.map((item, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, transitionDelay: `${index * 90}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={15} color={item.color} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1E293B', fontWeight: 700 }}>{item.name}</h3>
              </div>
              <div style={{ fontSize: 24, lineHeight: 1.1, color: item.color, fontWeight: 800, marginBottom: 6 }}>{item.number}</div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748B' }}>{item.note}</p>
              <a
                href={`tel:${item.number}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                  color: item.color,
                  border: `1px solid ${item.color}33`,
                  background: item.bg,
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <Phone size={13} /> Call {item.number}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigate(path);
    }, 260);
  };

  const quickLinks = [
    { label: 'Register', action: () => navigateAuthWithOverlay('/auth/register') },
    { label: 'Login', action: () => navigateAuthWithOverlay('/auth/login') },
    { label: 'Community Map', action: () => navigateAuthWithOverlay('/community-map') },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <footer style={{ background: '#0F172A', color: 'rgba(255,255,255,0.7)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '38px 24px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, marginBottom: 22 }}>
          <div>
            <button
              onClick={() => navigate('/')}
              aria-label="Go to TUGON home"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                marginBottom: 12,
              }}
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                style={{ height: 36, width: 'auto', display: 'block' }}
              />
            </button>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.74)', lineHeight: 1.62, margin: 0, maxWidth: 500 }}>
              A web-based incident management and decision support platform for Barangays 251, 252, and 256 in Tondo, Manila.
            </p>
          </div>

          <div>
            <div style={{ color: 'white', fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Citizen Access
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={link.action}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#DBEAFE',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
            <a
              href="tel:911"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(185,28,28,0.18)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#FCA5A5',
                padding: '7px 10px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <Phone size={13} /> Emergency: 911
            </a>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 14,
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span>© {year} TUGON. Digital support tool for community reporting and response coordination.</span>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>Barangays 251, 252, 256 · Tondo, Manila</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer button, footer a { min-height: 40px; }
        }
      `}</style>
      </footer>
    </>
  );
}

export default function Landing() {
  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!revealItems.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      return;
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
  }, [navigate]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflowX = html.style.overflowX;
    const previousBodyOverflowX = body.style.overflowX;

    html.style.overflowX = 'hidden';
    body.style.overflowX = 'hidden';

    return () => {
      html.style.overflowX = previousHtmlOverflowX;
      body.style.overflowX = previousBodyOverflowX;
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'clip',
        touchAction: 'pan-y',
      }}
    >
      <a className="skip-link" href="#landing-main-content">
        Skip to main content
      </a>
      <Navbar />
      <main id="landing-main-content">
        <Hero />
        <QuickActions />
        <HowToUse />
        <SupportedBarangays />
        <SafetyTips />
        <EmergencyHotlines />
        <Footer />
      </main>

      <style>{`
        [data-reveal] {
          --reveal-x: 0px;
          --reveal-y: 22px;
          opacity: 0;
          transform: translate3d(var(--reveal-x), var(--reveal-y), 0);
          transition: opacity 640ms cubic-bezier(0.2, 0.65, 0.3, 1), transform 640ms cubic-bezier(0.2, 0.65, 0.3, 1);
          will-change: opacity, transform;
        }

        [data-reveal][data-reveal-slide='x'][data-reveal-dir='left'] {
          --reveal-x: -44px;
          --reveal-y: 0px;
        }

        [data-reveal][data-reveal-slide='x'][data-reveal-dir='right'] {
          --reveal-x: 44px;
          --reveal-y: 0px;
        }

        [data-reveal].is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        [data-reveal].landing-scroll-cue {
          transform: translate3d(-50%, var(--reveal-y), 0);
        }

        [data-reveal].landing-scroll-cue.is-visible {
          transform: translate3d(-50%, 0, 0);
        }

        .hero-transition-scope {
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .skip-link {
          position: fixed;
          left: 12px;
          top: -56px;
          z-index: 1200;
          background: #FFFFFF;
          color: #0F172A;
          border: 2px solid var(--primary);
          border-radius: 8px;
          padding: 8px 12px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          transition: top 140ms ease;
        }

        .skip-link:focus {
          top: 12px;
        }

        a:focus-visible,
        button:focus-visible {
          outline: 3px solid #FCD34D;
          outline-offset: 2px;
        }

        .hero-transition-scope.is-routing {
          opacity: 0.88;
          transform: translateY(4px);
        }

        .hero-action-btn,
        .hero-link-action {
          transition: transform 160ms ease, filter 160ms ease, box-shadow 180ms ease;
        }

        .hero-action-btn.is-clicking,
        .hero-link-action.is-clicking {
          transform: scale(0.97);
          filter: brightness(1.08);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.14);
        }

        .auth-redirect-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(15, 23, 42, 0.34);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-redirect-loader {
          width: 108px;
          height: 108px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-redirect-ring {
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          border: 4px solid rgba(30, 58, 138, 0.16);
          border-top-color: var(--severity-critical);
          border-right-color: var(--primary);
          animation: authRedirectSpin 0.9s linear infinite;
        }

        .auth-redirect-logo {
          width: 42px;
          height: 42px;
          display: block;
          filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.15));
        }

        @keyframes authRedirectSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .landing-scroll-cue {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(15, 23, 42, 0.42);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 3;
          animation: scrollCuePulse 1.8s ease-in-out infinite;
        }

        .landing-scroll-cue-icon {
          display: inline-flex;
          line-height: 0;
          animation: scrollCueArrow 1.8s ease-in-out infinite;
        }

        @keyframes scrollCuePulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(191, 219, 254, 0.18);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(191, 219, 254, 0);
          }
        }

        @keyframes scrollCueArrow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-reveal] {
            opacity: 1;
            transform: none;
            transition: none;
          }

          [data-reveal].landing-scroll-cue {
            transform: translateX(-50%);
          }

          .auth-redirect-ring {
            animation: none;
          }

          .landing-scroll-cue,
          .landing-scroll-cue-icon {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
