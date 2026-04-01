import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Map as MapIcon,
  MapPin,
  Menu,
  Phone,
  Radio,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { getAuthSession } from '../utils/authSession';
import { useTranslation } from '../i18n';

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
    <div className="mb-9 text-center">
      <span
        className={`mb-2.5 inline-block rounded-[9px] border px-[11px] py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
          light
            ? 'border-white/[0.22] bg-white/[0.14] text-blue-200'
            : 'border-slate-300 bg-[#E8EEF9] text-primary'
        }`}
      >
        {label}
      </span>
      <h2
        className={`mb-2 text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.01em] ${
          light ? 'text-white' : 'text-slate-800'
        }`}
      >
        {title}
      </h2>
      <p
        className={`mx-auto max-w-[620px] text-sm leading-relaxed ${
          light ? 'text-blue-200' : 'text-slate-500'
        }`}
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
  const { t } = useTranslation();
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
    { label: t('landing.nav.howItWorks'), href: '#how' },
    { label: t('landing.nav.safety'), href: '#safety' },
    { label: t('landing.nav.hotlines'), href: '#hotlines' },
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
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <button
            onClick={() => navigate('/')}
            aria-label="Go to TUGON home"
            className="flex cursor-pointer items-center border-none bg-transparent p-0"
          >
            <img
              src="/tugon-header-logo.svg"
              alt="TUGON Tondo Emergency Response"
              className="block h-[38px] w-auto"
            />
          </button>

          <div className="nav-desktop flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="cursor-pointer rounded-[6px] border-none bg-transparent px-[14px] py-2 text-[13px] font-medium text-white/[0.82]"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="nav-cta flex items-center gap-2">
            <button
              onClick={() => navigateAuthWithOverlay('/auth/login')}
              className="cursor-pointer rounded-lg border border-white/25 bg-white/[0.12] px-4 py-2 text-xs font-semibold text-white"
            >
              {t('landing.nav.login')}
            </button>
            <button
              onClick={() => navigateAuthWithOverlay('/auth/register')}
              className="cursor-pointer rounded-lg border-none bg-severity-critical px-4 py-2 text-xs font-bold text-white"
            >
              {t('landing.nav.register')}
            </button>
          </div>

          <button
            type="button"
            className={mobileOpen ? 'nav-mobile-btn is-open' : 'nav-mobile-btn'}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen ? 'true' : 'false'}
            aria-controls="landing-mobile-nav"
          >
            <span className="nav-mobile-icon">
              {mobileOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
            </span>
          </button>
        </div>

        <div
          id="landing-mobile-nav"
          className={mobileOpen ? 'nav-mobile-panel is-open' : 'nav-mobile-panel'}
          aria-hidden={mobileOpen ? 'false' : 'true'}
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
                  opacity: mobileOpen ? 1 : 0,
                  transform: mobileOpen ? 'translateY(0)' : 'translateY(-6px)',
                  transition: 'opacity 180ms ease, transform 180ms ease',
                }}
              >
                {link.label}
              </button>
            ))}
            <div
              className={`grid gap-2 mt-3.5 ${mobileOpen ? 'nav-mobile-item is-open' : 'nav-mobile-item'}`}
              style={{
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 180ms ease, transform 180ms ease',
              }}
            >
              <button
                onClick={() => navigateAuthWithOverlay('/auth/login')}
                className="w-full cursor-pointer rounded-lg border-none bg-severity-critical py-2.5 text-[13px] font-bold text-white"
              >
                {t('landing.nav.loginToContinue')}
              </button>
              <button
                onClick={() => navigateAuthWithOverlay('/auth/register')}
                className="w-full cursor-pointer rounded-lg border border-white/[0.22] bg-white/[0.12] py-2.5 text-[13px] font-bold text-white"
              >
                {t('landing.nav.register')}
              </button>
            </div>
        </div>
      </nav>

      <style>{`
        .landing-navbar {
          isolation: isolate;
          max-width: 100%;
        }

        /* Hidden on desktop; shown only inside the mobile media query */
        .nav-mobile-btn {
          display: none;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          cursor: pointer;
          transition: background 150ms ease, transform 150ms ease;
        }

        .nav-mobile-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 180ms ease;
        }

        /* Each link/item inside the mobile panel */
        .nav-mobile-item {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.82);
          font-size: 15px;
          font-weight: 600;
          padding: 12px 0;
          cursor: pointer;
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .nav-mobile-item.is-open {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-wordmark-red {
          transform: translateY(0.16em);
          max-width: min(35vw, 248px);
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
  const { t } = useTranslation();
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
        className="relative flex min-h-screen items-center overflow-hidden"
      >
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="City aerial" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.93) 0%, rgba(30,58,138,0.86) 55%, rgba(15,23,42,0.92) 100%)',
            }}
          />
        </div>

        <div
          data-reveal
          className={`relative z-[2] mx-auto w-full max-w-[1100px] px-6 pb-14 pt-[100px] ${activeAction ? 'hero-transition-scope is-routing' : 'hero-transition-scope'}`}
          style={{ transitionDelay: '90ms' }}
        >
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-[9px] border border-red-700/40 bg-red-700/20 px-[14px] py-1.5">
              <Radio size={12} color="#F87171" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-red-300">
                {t('landing.hero.liveIn')}
              </span>
            </div>

            <h1 className="mb-3.5 max-w-[760px] text-[clamp(30px,6vw,56px)] font-black leading-[1.1] text-white">
              EMPOWERING <span className="text-blue-400">TONDO</span> WITH INSTANT{' '}
              <span className="inline-flex items-center">
                <img
                  src="/tugon-wordmark-red.svg"
                  alt="TUGON"
                  className="hero-wordmark-red inline-block h-[1.2em] w-auto"
                />
              </span>
            </h1>

            <p className="mb-[22px] max-w-[540px] text-[clamp(14px,2vw,18px)] leading-[1.55] text-white/[0.88]">
              {t('landing.hero.subtagline')}
            </p>

            <div className="mb-[22px] flex flex-wrap gap-3">
              <button
                onClick={() => navigateWithTransition('report', '/auth/register', true)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-none bg-severity-critical px-6 py-[13px] text-sm font-bold text-white ${activeAction === 'report' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
              >
                <AlertTriangle size={16} /> {t('landing.hero.reportIncident')}
              </button>
              <button
                onClick={() => navigateWithTransition('track', '/auth/login', true)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-white/35 bg-white/[0.12] px-6 py-[13px] text-sm font-bold text-white ${activeAction === 'track' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
              >
                <CheckCircle2 size={16} /> {t('landing.hero.trackStatus')}
              </button>
            </div>

            {/* Hero stats strip */}
            <div className="mb-5 mt-1 flex flex-wrap">
              {([
                { val: '3', labelKey: 'landing.hero.statBarangays' as const },
                { val: '5', labelKey: 'landing.hero.statCategories' as const },
                { val: '24/7', labelKey: 'landing.hero.statReporting' as const },
              ]).map((stat, i, arr) => (
                <React.Fragment key={stat.val}>
                  <div className="flex items-center gap-2.5 pr-5">
                    <span className="text-[22px] font-black tracking-[-0.02em] text-white">{stat.val}</span>
                    <span className="whitespace-pre-line text-[11px] leading-[1.35] text-white/55">{t(stat.labelKey)}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="mr-5 w-px self-stretch bg-white/[0.15]" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={() => navigateWithTransition('community', '/community-map', true)}
              className={`inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-bold text-amber-300 ${activeAction === 'community' ? 'hero-link-action is-clicking' : 'hero-link-action'}`}
            >
              <MapIcon size={14} /> {t('landing.hero.viewCommunityMap')} <ArrowRight size={14} />
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
  const { t } = useTranslation();

  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigate(path);
    }, 260);
  };

  const actions = [
    {
      title: t('landing.quickActions.reportTitle'),
      desc: t('landing.quickActions.reportDesc'),
      icon: AlertTriangle,
      color: 'var(--severity-critical)',
      bg: '#FEE2E2',
      action: () => navigateAuthWithOverlay('/auth/register'),
    },
    {
      title: t('landing.quickActions.trackTitle'),
      desc: t('landing.quickActions.trackDesc'),
      icon: FileText,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      action: () => navigateAuthWithOverlay('/auth/login'),
    },
    {
      title: t('landing.quickActions.mapTitle'),
      desc: t('landing.quickActions.mapDesc'),
      icon: MapIcon,
      color: 'var(--severity-medium)',
      bg: '#FEF3C7',
      action: () => navigateAuthWithOverlay('/community-map'),
    },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section id="quick-actions" data-reveal className="bg-white px-6 py-14">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          label={t('landing.quickActions.label')}
          title={t('landing.quickActions.title')}
          subtitle={t('landing.quickActions.subtitle')}
        />

        <div className="quick-actions-desktop grid grid-cols-3 gap-3">
          {actions.map((item, index) => (
            <button
              className="quick-action-btn flex cursor-pointer flex-col rounded-xl border border-white/[0.38] px-[18px] pb-4 pt-[18px] text-left shadow-[0_8px_16px_rgba(15,23,42,0.14)]"
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.title}
              onClick={item.action}
              style={{
                background: item.color,
                minHeight: 176,
                transitionDelay: `${index * 90}ms`,
              }}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/20">
                  <item.icon size={16} color="#FFFFFF" />
                </div>
                <div className="text-[15px] font-extrabold text-white">{item.title}</div>
              </div>
              <div className="text-xs leading-[1.5] text-white/90">{item.desc}</div>
              <div className="mt-auto flex justify-end">
                <span className="quick-action-open">
                  {t('landing.quickActions.open')} <ArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="quick-actions-mobile hidden gap-3">
          {actions.map((item) => (
            <button
              className="quick-action-btn flex min-h-[162px] w-full cursor-pointer flex-col rounded-xl border border-white/[0.38] p-[14px] shadow-[0_8px_16px_rgba(15,23,42,0.14)]"
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.title}
              onClick={item.action}
              style={{
                background: item.color,
                transitionDelay: '100ms',
              }}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white/20">
                  <item.icon size={15} color="#FFFFFF" />
                </div>
                <div className="text-sm font-extrabold text-white">{item.title}</div>
              </div>
              <div className="text-left text-xs leading-[1.45] text-white/90">{item.desc}</div>
              <div className="mt-auto flex justify-end">
                <span className="quick-action-open">
                  {t('landing.quickActions.open')} <ArrowRight size={12} />
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

function MapTeaser() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [authRedirecting, setAuthRedirecting] = useState(false);

  const go = () => {
    setAuthRedirecting(true);
    window.setTimeout(() => navigate('/community-map'), 260);
  };

  const pins = [
    { x: '20%', y: '28%', color: '#B91C1C', label: t('incident.type.crime'), delay: '0s' },
    { x: '58%', y: '50%', color: '#B4730A', label: t('incident.type.noise'), delay: '0.4s' },
    { x: '35%', y: '68%', color: '#0F766E', label: t('incident.type.pollution'), delay: '0.8s' },
    { x: '72%', y: '30%', color: '#1E3A8A', label: t('incident.type.road_hazard'), delay: '1.2s' },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section
        data-reveal
        className="relative overflow-hidden bg-[#0F172A] px-6 py-[72px]"
      >
        {/* Background grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-[1] mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-center gap-12">

            {/* Left: text */}
            <div className="flex-[1_1_300px]">
              <span className="mb-4 inline-block rounded-lg border border-blue-500/30 bg-blue-500/[0.15] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-blue-300">
                {t('landing.map.label')}
              </span>
              <h2 className="mb-3 text-[clamp(22px,4vw,30px)] font-extrabold leading-[1.25] text-white">
                {t('landing.map.title').split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>
                ))}
              </h2>
              <p className="mb-6 max-w-[380px] text-sm leading-[1.65] text-white/60">
                {t('landing.map.desc')}
              </p>
              <button
                onClick={go}
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-none bg-primary px-[22px] py-3 text-sm font-bold text-white"
              >
                <MapIcon size={16} /> {t('landing.map.exploreBtn')} <ArrowRight size={14} />
              </button>
            </div>

            {/* Right: map preview visual */}
            <div className="relative flex-[1_1_280px]">
              <div
                className="relative min-h-[230px] overflow-hidden rounded-[20px] p-7"
                style={{
                  background: 'rgba(30,58,138,0.25)',
                  border: '1px solid rgba(59,130,246,0.18)',
                }}
              >
                {/* Inner grid */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[20px]"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(59,130,246,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.09) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }}
                />

                {/* Incident pins */}
                {pins.map((pin) => (
                  <div
                    key={pin.label}
                    className="absolute flex flex-col items-center gap-[3px]"
                    style={{
                      left: pin.x, top: pin.y,
                      transform: 'translate(-50%, -50%)',
                      animation: `mapPinPulse 2.8s ease-in-out ${pin.delay} infinite alternate`,
                    }}
                  >
                    <div
                      className="size-[13px] rounded-full border-2 border-white/50"
                      style={{
                        background: pin.color,
                        boxShadow: `0 0 10px ${pin.color}90`,
                      }}
                    />
                    <span
                      className="whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white/85"
                      style={{ background: 'rgba(15,23,42,0.82)' }}
                    >
                      {pin.label}
                    </span>
                  </div>
                ))}

                {/* Footer label */}
                <div
                  className="absolute bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-[14px] py-[5px] text-[11px] font-bold text-blue-300"
                  style={{
                    background: 'rgba(15,23,42,0.88)',
                    border: '1px solid rgba(59,130,246,0.35)',
                  }}
                >
                  {t('landing.map.footer')}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

function HowToUse() {
  const { t } = useTranslation();

  const steps = [
    {
      title: t('landing.howItWorks.step1.sectionTitle'),
      detail: t('landing.howItWorks.step1.detail'),
      icon: FileText,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      visual: t('landing.howItWorks.step1.visual'),
    },
    {
      title: t('landing.howItWorks.step2.sectionTitle'),
      detail: t('landing.howItWorks.step2.detail'),
      icon: Users,
      color: 'var(--severity-medium)',
      bg: '#FEF3C7',
      visual: t('landing.howItWorks.step2.visual'),
    },
    {
      title: t('landing.howItWorks.step3.sectionTitle'),
      detail: t('landing.howItWorks.step3.detail'),
      icon: CheckCircle2,
      color: '#059669',
      bg: '#D1FAE5',
      visual: t('landing.howItWorks.step3.visual'),
    },
  ];

  return (
    <section id="how" data-reveal className="bg-[#F8FAFF] px-6 py-[88px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          label={t('landing.howItWorks.label')}
          title={t('landing.howItWorks.threeSteps')}
          subtitle={t('landing.howItWorks.tagline')}
        />

        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {steps.map((step, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={step.title}
              className="grid gap-3.5 rounded-2xl border border-slate-200 bg-white p-[22px]"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-[50px] items-center justify-center rounded-xl"
                    style={{ background: step.bg }}
                  >
                    <step.icon size={24} color={step.color} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                      {t('landing.howItWorks.step', { number: String(index + 1) })}
                    </div>
                    <h3 className="mt-0.5 text-[17px] font-extrabold text-slate-800">{step.title}</h3>
                  </div>
                </div>
                <span
                  className="rounded-[7px] px-[9px] py-[5px] text-[11px] font-extrabold"
                  style={{ color: step.color, background: step.bg, border: `1px solid ${step.color}33` }}
                >
                  {step.visual}
                </span>
              </div>
              <p className="m-0 text-sm leading-[1.55] text-slate-600">{step.detail}</p>
              <div className="mt-0.5 h-2 overflow-hidden rounded-[5px] bg-slate-200">
                <span
                  className="block h-full rounded-[5px]"
                  style={{ width: `${(index + 1) * 33}%`, background: step.color }}
                />
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
  const { t } = useTranslation();

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
    <section id="barangays" data-reveal className="bg-primary px-6 py-[88px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          label={t('landing.barangays.label')}
          title={t('landing.barangays.subtitle')}
          subtitle={t('landing.barangays.tagline')}
          light
        />

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {barangays.map((item, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              className="relative overflow-hidden rounded-[18px] border-2 border-white/20 bg-white/[0.1] p-7 text-center"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="mb-[18px] flex justify-center">
                <div className="flex size-[74px] items-center justify-center rounded-2xl border-2 border-white/[0.22] bg-white/[0.13]">
                  <MapPin size={32} color="#FFFFFF" strokeWidth={2.4} />
                </div>
              </div>

              <h3 className="mb-1.5 text-xl font-extrabold text-white">{item.name}</h3>
              <p className="mb-1.5 text-[13px] font-bold text-blue-100">{t('landing.barangays.captain', { name: item.captain })}</p>
              <p className="mb-1 text-xs font-semibold text-blue-100">{item.district}</p>
              <p className="mb-[18px] text-xs font-medium text-blue-200">{item.hallAddress}</p>

              <div className="mb-5 flex flex-wrap justify-center gap-1.5">
                {item.responders.map(r => (
                  <span
                    key={r}
                    className="rounded-[6px] border border-white/20 bg-white/[0.15] px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    {r}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate('/auth/register')}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-white/30 bg-white/[0.12] py-3 text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20"
              >
                {t('landing.barangays.startReporting')} <ChevronRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SafetyTips() {
  const { t } = useTranslation();

  const tips = [
    {
      title: t('landing.safety.tip1.title'),
      icon: Shield,
      color: '#0F766E',
      bg: '#CCFBF1',
      actions: [t('landing.safety.tip1.action1'), t('landing.safety.tip1.action2')],
    },
    {
      title: t('landing.safety.tip2.title'),
      icon: Users,
      color: 'var(--primary)',
      bg: '#DBEAFE',
      actions: [t('landing.safety.tip2.action1'), t('landing.safety.tip2.action2')],
    },
    {
      title: t('landing.safety.tip3.title'),
      icon: AlertTriangle,
      color: 'var(--severity-medium)',
      bg: '#FEF3C7',
      actions: [t('landing.safety.tip3.action1'), t('landing.safety.tip3.action2')],
    },
  ];

  return (
    <section id="safety" data-reveal className="bg-white px-6 py-[88px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          label={t('landing.safety.label')}
          title={t('landing.safety.subtitle')}
          subtitle={t('landing.safety.tagline')}
        />

        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {tips.map((tip, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={tip.title}
              className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="mb-3.5 flex justify-center">
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-[14px]"
                  style={{ background: tip.bg }}
                >
                  <tip.icon size={28} color={tip.color} strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="mb-3 text-[17px] font-extrabold text-slate-800">{tip.title}</h3>
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {tip.actions.map((action) => (
                  <span
                    key={action}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    style={{
                      color: tip.color,
                      background: tip.bg,
                      border: `1px solid ${tip.color}33`,
                    }}
                  >
                    {action}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                <CheckCircle2 size={14} color={tip.color} />
                {t('landing.safety.reportTugon')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmergencyHotlines() {
  const { t } = useTranslation();

  const hotlines = [
    { name: t('landing.emergency.hotline1.name'), number: '911', note: t('landing.emergency.hotline1.note'), color: 'var(--severity-critical)', bg: '#FEE2E2' },
    { name: t('landing.emergency.hotline2.name'), number: '117', note: t('landing.emergency.hotline2.note'), color: 'var(--primary)', bg: '#DBEAFE' },
    { name: t('landing.emergency.hotline3.name'), number: '160', note: t('landing.emergency.hotline3.note'), color: 'var(--severity-medium)', bg: '#FEF3C7' },
  ];

  return (
    <section id="hotlines" data-reveal className="bg-[#F8FAFF] px-6 py-[88px]">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          label={t('landing.emergency.label')}
          title={t('landing.emergency.subtitle')}
          subtitle={t('landing.emergency.tagline')}
        />

        <div
          data-reveal
          className="mb-[18px] flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-red-800 bg-severity-critical px-[22px] py-5"
          style={{ transitionDelay: '80ms' }}
        >
          <div>
            <div className="mb-1 text-xl font-extrabold text-white">{t('landing.emergency.callNow')}</div>
            <div className="text-sm text-white/90">{t('landing.emergency.callThenFile')}</div>
          </div>
          <a
            href="tel:911"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-extrabold text-severity-critical no-underline"
          >
            <Phone size={14} /> {t('landing.emergency.callNowBtn')}
          </a>
        </div>

        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {hotlines.map((item, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              className="rounded-xl border border-slate-200 bg-white p-4"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="flex size-[34px] items-center justify-center rounded-[10px]"
                  style={{ background: item.bg }}
                >
                  <Phone size={15} color={item.color} />
                </div>
                <h3 className="m-0 text-[15px] font-bold text-slate-800">{item.name}</h3>
              </div>
              <div
                className="mb-1.5 text-2xl font-extrabold leading-[1.1]"
                style={{ color: item.color }}
              >
                {item.number}
              </div>
              <p className="mb-2.5 text-[13px] text-slate-500">{item.note}</p>
              <a
                href={`tel:${item.number}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-extrabold no-underline"
                style={{
                  color: item.color,
                  border: `1px solid ${item.color}33`,
                  background: item.bg,
                }}
              >
                <Phone size={13} /> {t('landing.emergency.callNumber', { number: item.number })}
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
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigate(path);
    }, 260);
  };

  const quickLinks = [
    { label: t('landing.footer.register'), action: () => navigateAuthWithOverlay('/auth/register') },
    { label: t('landing.footer.login'), action: () => navigateAuthWithOverlay('/auth/login') },
    { label: t('landing.footer.communityMap'), action: () => navigateAuthWithOverlay('/community-map') },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <footer className="bg-[#0F172A] text-white/70">
      <div className="mx-auto max-w-[1100px] px-6 pb-6 pt-[38px]">
        <div className="mb-[22px] grid gap-[22px] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          <div>
            <button
              onClick={() => navigate('/')}
              aria-label="Go to TUGON home"
              className="mb-3 inline-flex cursor-pointer border-none bg-transparent p-0"
            >
              <img
                src="/tugon-header-logo.svg"
                alt="TUGON Tondo Emergency Response"
                className="block h-9 w-auto"
              />
            </button>
            <p className="m-0 max-w-[500px] text-[13px] leading-[1.62] text-white/[0.74]">
              {t('landing.footer.desc')}
            </p>
          </div>

          <div>
            <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white">
              {t('landing.footer.citizenAccess')}
            </div>
            <div className="mb-3 flex flex-wrap gap-2.5">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={link.action}
                  className="cursor-pointer rounded-lg border border-white/[0.12] bg-white/[0.06] px-2.5 py-1.5 text-[13px] font-semibold text-blue-100"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <a
              href="tel:911"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-800/[0.18] px-2.5 py-[7px] text-xs font-bold tracking-[0.04em] text-red-300 no-underline"
            >
              <Phone size={13} /> {t('landing.footer.emergencyCall')}
            </a>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-white/[0.08] pt-3.5 text-xs text-white/45">
          <span>© {year} TUGON. {t('landing.footer.tagline')}</span>
          <span className="text-white/55">{t('landing.footer.location')}</span>
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
  const { t } = useTranslation();

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
    <div className="w-full max-w-[100vw] overflow-x-clip [touch-action:pan-y] [font-family:'Roboto','Helvetica_Neue',Arial,sans-serif]">
      <a className="skip-link" href="#landing-main-content">
        {t('landing.skipToMain')}
      </a>
      <Navbar />
      <main id="landing-main-content">
        <Hero />
        <QuickActions />
        <MapTeaser />
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

        @keyframes mapPinPulse {
          from { transform: translate(-50%, -50%) translateY(0px); }
          to   { transform: translate(-50%, -50%) translateY(-6px); }
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
