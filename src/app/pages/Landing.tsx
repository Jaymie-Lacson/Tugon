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
import { Button } from '../components/ui/button';
// Card/Badge primitives intentionally not used — landing sections use bespoke layouts


const HERO_IMAGE =
  'https://images.unsplash.com/photo-1736117705462-34145ac33bdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBjaXR5JTIwZ3JpZCUyMHVyYmFuJTIwbWFwJTIwc3RyZWV0c3xlbnwxfHx8fDE3NzI3ODE2MDl8MA&ixlib=rb-4.1.0&q=80&w=1080';

function SectionHeading({
  label,
  title,
  subtitle,
  light = false,
  align = 'left',
}: {
  label: string;
  title: string;
  subtitle: string;
  light?: boolean;
  align?: 'left' | 'center';
}) {
  const isCenter = align === 'center';
  return (
    <div className={`mb-10 ${isCenter ? 'text-center' : 'text-left'}`}>
      <div
        className={`mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${
          light ? 'text-[#b6c4ff]' : 'text-primary/75'
        }`}
      >
        <span
          className={`inline-block h-px w-6 ${light ? 'bg-white/30' : 'bg-primary/30'}`}
          aria-hidden="true"
        />
        {label}
      </div>
      <h2
        className={`mb-3 max-w-[640px] text-[clamp(26px,3.6vw,36px)] font-bold leading-[1.18] tracking-[-0.015em] ${
          isCenter ? 'mx-auto' : ''
        } ${light ? 'text-white' : 'text-foreground'}`}
      >
        {title}
      </h2>
      <p
        className={`max-w-[600px] text-[15px] leading-[1.6] ${isCenter ? 'mx-auto' : ''} ${
          light ? 'text-white/70' : 'text-muted-foreground'
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
      const nextScrolled = window.scrollY > 20;
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

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Button
                key={link.label}
                variant="ghost"
                size="sm"
                onClick={() => scrollTo(link.href)}
                className="text-[13px] font-medium text-white/[0.82] hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Button>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateAuthWithOverlay('/auth/login')}
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              {t('landing.nav.login')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => navigateAuthWithOverlay('/auth/register')}
            >
              {t('landing.nav.register')}
            </Button>
          </div>

          <button
            type="button"
            className={`landing-mobile-toggle flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.15] bg-white/[0.08] transition-[background,transform] duration-150 ease-out md:hidden${mobileOpen ? ' scale-[0.97] !bg-white/20' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen ? 'true' : 'false'}
            aria-controls="landing-mobile-nav"
          >
            <span className="inline-flex items-center justify-center transition-transform duration-[180ms] ease-out">
              {mobileOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
            </span>
          </button>
        </div>

        <div
          id="landing-mobile-nav"
          className="landing-mobile-panel nav-mobile-panel overflow-hidden border-t border-white/[0.08] bg-[rgba(15,23,42,0.98)]"
          aria-hidden={mobileOpen ? 'false' : 'true'}
          style={{
            padding: mobileOpen ? '12px 20px 20px' : '0 20px',
            maxHeight: mobileOpen ? 360 : 0,
            opacity: mobileOpen ? 1 : 0,
            transform: mobileOpen ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition:
              'max-height 320ms cubic-bezier(0.2, 0.65, 0.3, 1), opacity 220ms ease, transform 220ms ease, padding 220ms ease',
          }}
        >
          {navLinks.map((link) => (
            <button
              className="block w-full cursor-pointer border-b border-white/[0.06] bg-transparent px-0 py-3 text-left text-[15px] font-semibold text-white/[0.82]"
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
            className="mt-3.5 grid gap-2"
            style={{
              opacity: mobileOpen ? 1 : 0,
              transform: mobileOpen ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
            }}
          >
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => navigateAuthWithOverlay('/auth/login')}
            >
              {t('landing.nav.loginToContinue')}
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/[0.22] bg-white/[0.12] text-white hover:bg-white/20"
              onClick={() => navigateAuthWithOverlay('/auth/register')}
            >
              {t('landing.nav.register')}
            </Button>
          </div>
        </div>
      </nav>

      <style>{`
        .landing-navbar {
          isolation: isolate;
          max-width: 100%;
        }

        @media (max-width: 768px) {
          .landing-navbar {
            position: fixed !important;
            top: var(--landing-nav-top, 0px) !important;
            left: var(--landing-nav-left, 0px) !important;
            width: var(--landing-nav-width, 100%) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .nav-mobile-panel button:nth-child(1) { transition-delay: 40ms; }
          .nav-mobile-panel button:nth-child(2) { transition-delay: 80ms; }
          .nav-mobile-panel button:nth-child(3) { transition-delay: 120ms; }
          .nav-mobile-panel > div { transition-delay: 160ms; }
        }

        @media (min-width: 769px) {
          .landing-mobile-toggle,
          .landing-mobile-panel {
            display: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nav-mobile-panel,
          .nav-mobile-panel button,
          .nav-mobile-panel > div {
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
          <div className="absolute inset-0 bg-[#00236f]/[0.92]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse at 30% 40%, black 40%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, black 40%, transparent 80%)',
            }}
          />
        </div>

        <div
          data-reveal
          className={`relative z-[2] mx-auto w-full max-w-[1100px] px-6 pb-14 pt-[100px] ${activeAction ? 'hero-transition-scope is-routing' : 'hero-transition-scope'}`}
          style={{ transitionDelay: '90ms' }}
        >
          <div>
            <div className="mb-7 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
              <span className="relative flex size-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/60" aria-hidden="true" />
                <span className="relative inline-flex size-2 rounded-full bg-red-400" aria-hidden="true" />
              </span>
              <Radio size={12} className="text-white/55" aria-hidden="true" />
              {t('landing.hero.liveIn')}
            </div>

            <h1 className="mb-5 max-w-[780px] text-[clamp(34px,6vw,60px)] font-bold leading-[1.04] tracking-[-0.025em] text-white">
              Empowering <span className="text-blue-300">Tondo</span> with instant{' '}
              <span className="inline-flex items-baseline">
                <img
                  src="/tugon-wordmark-red.svg"
                  alt="TUGON"
                  className="inline-block h-[0.92em] w-auto max-w-[min(35vw,248px)] translate-y-[0.1em] md:max-w-[min(35vw,248px)]"
                />
              </span>
            </h1>

            <p className="mb-9 max-w-[560px] text-[clamp(15px,1.6vw,18px)] leading-[1.6] text-white/75">
              {t('landing.hero.subtagline')}
            </p>

            <div className="mb-10 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigateWithTransition('report', '/auth/register', true)}
                className={`gap-2 rounded-md bg-white px-5 text-sm font-semibold text-[#00236f] shadow-none hover:bg-white/95 ${activeAction === 'report' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
              >
                {t('landing.hero.reportIncident')} <ArrowRight size={16} />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigateWithTransition('track', '/auth/login', true)}
                className={`gap-2 rounded-md px-4 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white ${activeAction === 'track' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
              >
                {t('landing.hero.trackStatus')}
              </Button>
            </div>

            {/* Hero stats strip */}
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              {([
                { val: '3', labelKey: 'landing.hero.statBarangays' as const },
                { val: '5', labelKey: 'landing.hero.statCategories' as const },
                { val: '24/7', labelKey: 'landing.hero.statReporting' as const },
              ]).map((stat) => (
                <div key={stat.val} className="flex flex-col gap-1">
                  <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-white">{stat.val}</span>
                  <span className="whitespace-pre-line text-[11px] font-medium uppercase tracking-[0.1em] text-white/50">{t(stat.labelKey)}</span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => navigateWithTransition('community', '/community-map', true)}
                className={`ml-auto hidden items-center gap-1.5 text-[13px] font-medium text-white/70 transition-colors hover:text-white md:inline-flex ${activeAction === 'community' ? 'hero-link-action is-clicking' : 'hero-link-action'}`}
              >
                {t('landing.hero.viewCommunityMap')} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <button
          data-reveal
          onClick={scrollToQuickActions}
          aria-label="Scroll to quick actions"
          className="landing-scroll-cue"
          style={{ transitionDelay: '220ms' }}
        >
          <ChevronDown size={14} aria-hidden="true" />
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
      <section id="quick-actions" data-reveal className="bg-background px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              label={t('landing.quickActions.label')}
              title={t('landing.quickActions.title')}
              subtitle={t('landing.quickActions.subtitle')}
            />
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-3">
            {actions.map((item, index) => (
              <button
                key={item.title}
                data-reveal
                className="group flex flex-col items-start gap-4 bg-card p-7 text-left transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none"
                style={{ transitionDelay: `${index * 80}ms` }}
                onClick={item.action}
              >
                <div
                  className="flex size-11 items-center justify-center rounded-md"
                  style={{ background: item.bg }}
                >
                  <item.icon size={20} style={{ color: item.color }} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1.5 text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-[1.55] text-muted-foreground">{item.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
                  {t('landing.quickActions.open')} <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
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
    { x: '22%', y: '32%', color: '#B91C1C', label: t('incident.type.crime') },
    { x: '58%', y: '48%', color: '#865300', label: t('incident.type.noise') },
    { x: '38%', y: '68%', color: '#0F766E', label: t('incident.type.pollution') },
    { x: '72%', y: '28%', color: '#1E3A8A', label: t('incident.type.road_hazard') },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section data-reveal className="relative overflow-hidden bg-primary px-6 py-20 md:py-28">
        <div className="relative z-[1] mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
            {/* Left: text */}
            <div>
              <SectionHeading
                label={t('landing.map.label')}
                title={t('landing.map.title').replace('\n', ' ')}
                subtitle={t('landing.map.desc')}
                light
              />
              <Button
                size="lg"
                onClick={go}
                className="mt-2 gap-2 rounded-md bg-white px-5 text-sm font-semibold text-primary shadow-none hover:bg-white/95"
              >
                {t('landing.map.exploreBtn')} <ArrowRight size={14} />
              </Button>
            </div>

            {/* Right: map preview — muted, no glow */}
            <div className="relative">
              <div className="relative aspect-[5/4] overflow-hidden rounded-lg border border-white/10 bg-[#0a1a3e]">
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                  }}
                />

                {/* Pins — flat, no glow */}
                {pins.map((pin) => (
                  <div
                    key={pin.label}
                    className="absolute flex items-center gap-2"
                    style={{ left: pin.x, top: pin.y, transform: 'translate(-50%, -50%)' }}
                  >
                    <span
                      className="block size-2.5 rounded-full ring-2 ring-[#0a1a3e]"
                      style={{ background: pin.color }}
                    />
                    <span className="whitespace-nowrap rounded bg-white/10 px-1.5 py-[2px] text-[10px] font-medium text-white/85 backdrop-blur-sm">
                      {pin.label}
                    </span>
                  </div>
                ))}

                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-white/75 backdrop-blur-sm">
                  <MapIcon size={11} /> {t('landing.map.footer')}
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
    <section id="how" data-reveal className="bg-muted/50 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-14 md:grid-cols-[1fr_1.3fr]">
          <div className="md:sticky md:top-28 md:self-start">
            <SectionHeading
              label={t('landing.howItWorks.label')}
              title={t('landing.howItWorks.threeSteps')}
              subtitle={t('landing.howItWorks.tagline')}
            />
          </div>

          <ol className="relative space-y-px">
            {steps.map((step, index) => (
              <li
                key={step.title}
                data-reveal
                className="relative flex gap-5 border-t border-border bg-background px-6 py-7 first:rounded-t-lg last:rounded-b-lg last:border-b md:px-8 md:py-8"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="flex size-11 items-center justify-center rounded-md"
                    style={{ background: step.bg }}
                  >
                    <step.icon size={20} color={step.color} strokeWidth={2} />
                  </div>
                  {index < steps.length - 1 && (
                    <span className="mt-3 w-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <div className="mb-1.5 flex items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {t('landing.howItWorks.step', { number: String(index + 1).padStart(2, '0') })}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ color: step.color, background: step.bg }}
                    >
                      {step.visual}
                    </span>
                  </div>
                  <h3 className="mb-2 text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                    {step.title}
                  </h3>
                  <p className="max-w-[560px] text-[14px] leading-[1.6] text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
    <section id="barangays" data-reveal className="bg-background px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label={t('landing.barangays.label')}
          title={t('landing.barangays.subtitle')}
          subtitle={t('landing.barangays.tagline')}
        />

        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          {barangays.map((item, index) => (
            <div
              key={item.name}
              data-reveal
              className="group flex flex-col gap-4 border-b border-border bg-card px-6 py-6 transition-colors last:border-b-0 hover:bg-muted/40 md:flex-row md:items-center md:gap-8 md:px-8"
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="flex items-center gap-4 md:w-[280px] md:shrink-0">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/[0.08] text-primary">
                  <MapPin size={18} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-foreground">{item.name}</h3>
                  <p className="text-[12px] text-muted-foreground">{item.district}</p>
                </div>
              </div>

              <div className="flex-1 md:border-l md:border-border md:pl-8">
                <p className="text-[13px] font-medium text-foreground">
                  {t('landing.barangays.captain', { name: item.captain })}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{item.hallAddress}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 md:w-[180px] md:shrink-0">
                {item.responders.map((r) => (
                  <span
                    key={r}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.04em] text-muted-foreground"
                  >
                    {r}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate('/auth/register')}
                className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-primary transition-transform duration-200 hover:translate-x-0.5"
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
      actions: [t('landing.safety.tip1.action1'), t('landing.safety.tip1.action2')],
    },
    {
      title: t('landing.safety.tip2.title'),
      icon: Users,
      actions: [t('landing.safety.tip2.action1'), t('landing.safety.tip2.action2')],
    },
    {
      title: t('landing.safety.tip3.title'),
      icon: AlertTriangle,
      actions: [t('landing.safety.tip3.action1'), t('landing.safety.tip3.action2')],
    },
  ];

  return (
    <section id="safety" data-reveal className="bg-muted/50 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label={t('landing.safety.label')}
          title={t('landing.safety.subtitle')}
          subtitle={t('landing.safety.tagline')}
        />

        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {tips.map((tip, index) => (
            <div
              key={tip.title}
              data-reveal
              className="flex flex-col gap-4 rounded-lg bg-card p-6 md:p-7"
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/[0.08] text-primary">
                <tip.icon size={18} strokeWidth={2} />
              </div>
              <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-foreground">{tip.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {tip.actions.map((action) => (
                  <li key={action} className="flex items-start gap-2.5 text-[13.5px] leading-[1.55] text-muted-foreground">
                    <CheckCircle2 size={14} className="mt-[3px] shrink-0 text-primary" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
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
    { name: t('landing.emergency.hotline1.name'), number: '911', note: t('landing.emergency.hotline1.note') },
    { name: t('landing.emergency.hotline2.name'), number: '117', note: t('landing.emergency.hotline2.note') },
    { name: t('landing.emergency.hotline3.name'), number: '160', note: t('landing.emergency.hotline3.note') },
  ];

  return (
    <section id="hotlines" data-reveal className="bg-background px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label={t('landing.emergency.label')}
          title={t('landing.emergency.subtitle')}
          subtitle={t('landing.emergency.tagline')}
        />

        <div
          data-reveal
          className="mb-2 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-destructive px-6 py-5 md:px-7"
          style={{ transitionDelay: '80ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-white/15">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-white">{t('landing.emergency.callNow')}</div>
              <div className="text-[13px] text-white/80">{t('landing.emergency.callThenFile')}</div>
            </div>
          </div>
          <a
            href="tel:911"
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-[13px] font-semibold text-destructive transition-colors hover:bg-white/95"
          >
            <Phone size={14} /> {t('landing.emergency.callNowBtn')}
          </a>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {hotlines.map((item, index) => (
            <a
              key={item.name}
              data-reveal
              href={`tel:${item.number}`}
              className="flex items-center gap-5 bg-card px-6 py-5 transition-colors hover:bg-muted/40 md:px-7"
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="font-mono text-[22px] font-semibold tracking-[-0.01em] text-foreground md:w-[90px]">
                {item.number}
              </div>
              <div className="flex-1 border-l border-border pl-5">
                <div className="text-[14px] font-medium text-foreground">{item.name}</div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">{item.note}</div>
              </div>
              <Phone size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </a>
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
        <div className="mx-auto max-w-5xl px-6 pb-6 pt-10">
          <div className="mb-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
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
                  <Button
                    key={link.label}
                    variant="ghost"
                    size="sm"
                    onClick={link.action}
                    className="min-h-[40px] border border-white/[0.12] bg-white/[0.06] text-[13px] font-semibold text-blue-100 hover:bg-white/[0.12]"
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="min-h-[40px] gap-1.5 border border-red-500/35 bg-red-800/[0.18] text-xs font-bold tracking-[0.04em] text-red-300 hover:bg-red-800/30"
              >
                <a href="tel:911">
                  <Phone size={13} /> {t('landing.footer.emergencyCall')}
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-white/[0.08] pt-3.5 text-xs text-white/45">
            <span>&copy; {year} TUGON. {t('landing.footer.tagline')}</span>
            <span className="text-white/55">{t('landing.footer.location')}</span>
          </div>
        </div>
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
    <div className="w-full max-w-[100vw] overflow-x-clip [touch-action:pan-y] [font-family:'IBM_Plex_Sans','Public_Sans',system-ui,-apple-system,Segoe_UI,sans-serif]">
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
          bottom: 24px;
          transform: translateX(-50%);
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 3;
          transition: color 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        .landing-scroll-cue:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateX(-50%) translateY(2px);
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

          .landing-scroll-cue {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
