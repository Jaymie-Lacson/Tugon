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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1736117705462-34145ac33bdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBjaXR5JTIwZ3JpZCUyMHVyYmFuJTIwbWFwJTIwc3RyZWV0c3xlbnwxfHx8fDE3NzI3ODE2MDl8MA&ixlib=rb-4.1.0&q=80&w=1080';

const COMMUNITY_IMAGE =
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1080&q=80';

const SAFETY_IMAGE =
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1080&q=80';

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
      <Badge
        variant={light ? 'secondary' : 'outline'}
        className={`mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
          light
            ? 'border-white/[0.22] bg-white/[0.14] text-[#b6c4ff]'
            : 'border-[rgba(197,197,211,0.5)] bg-[#dce9ff] text-primary'
        }`}
      >
        {label}
      </Badge>
      <h2
        className={`mb-2 text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.02em] ${
          light ? 'text-white' : 'text-foreground'
        }`}
      >
        {title}
      </h2>
      <p
        className={`mx-auto max-w-[620px] text-sm leading-relaxed ${
          light ? 'text-[#b6c4ff]' : 'text-muted-foreground'
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
            className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.15] bg-white/[0.08] transition-[background,transform] duration-150 ease-out md:hidden${mobileOpen ? ' scale-[0.97] !bg-white/20' : ''}`}
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
          className="nav-mobile-panel overflow-hidden border-t border-white/[0.08] bg-[rgba(15,23,42,0.98)]"
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
            background: rgba(15, 23, 42, 0.98) !important;
            transition: none !important;
          }

          .nav-mobile-panel button:nth-child(1) { transition-delay: 40ms; }
          .nav-mobile-panel button:nth-child(2) { transition-delay: 80ms; }
          .nav-mobile-panel button:nth-child(3) { transition-delay: 120ms; }
          .nav-mobile-panel > div { transition-delay: 160ms; }
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
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,35,111,0.94) 0%, rgba(30,58,138,0.88) 50%, rgba(11,28,48,0.93) 100%)',
            }}
          />
        </div>

        <div
          data-reveal
          className={`relative z-[2] mx-auto w-full max-w-[1100px] px-6 pb-14 pt-[100px] ${activeAction ? 'hero-transition-scope is-routing' : 'hero-transition-scope'}`}
          style={{ transitionDelay: '90ms' }}
        >
          <div>
            <Badge
              variant="destructive"
              className="mb-6 gap-2 border-red-700/40 bg-red-700/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-red-300"
            >
              <Radio size={12} className="text-red-400" />
              {t('landing.hero.liveIn')}
            </Badge>

            <h1 className="mb-3.5 max-w-[760px] text-[clamp(30px,6vw,56px)] font-black leading-[1.1] text-white">
              EMPOWERING <span className="text-blue-400">TONDO</span> WITH INSTANT{' '}
              <span className="inline-flex items-center">
                <img
                  src="/tugon-wordmark-red.svg"
                  alt="TUGON"
                  className="inline-block h-[1.2em] w-auto max-w-[min(35vw,248px)] translate-y-[0.16em] md:max-w-[min(35vw,248px)]"
                />
              </span>
            </h1>

            <p className="mb-6 max-w-[540px] text-[clamp(14px,2vw,18px)] leading-[1.55] text-white/[0.88]">
              {t('landing.hero.subtagline')}
            </p>

            <div className="mb-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigateWithTransition('report', '/auth/register', true)}
                className={`gap-2 rounded-lg bg-gradient-to-br from-[#5d0004] to-destructive text-sm font-bold ${activeAction === 'report' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
              >
                <AlertTriangle size={16} /> {t('landing.hero.reportIncident')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateWithTransition('track', '/auth/login', true)}
                className={`gap-2 rounded-lg border-white/35 bg-white/[0.12] text-sm font-bold text-white hover:bg-white/20 ${activeAction === 'track' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
              >
                <CheckCircle2 size={16} /> {t('landing.hero.trackStatus')}
              </Button>
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

            <Button
              variant="ghost"
              onClick={() => navigateWithTransition('community', '/community-map', true)}
              className={`gap-1.5 px-0 text-[13px] font-bold text-amber-300 hover:bg-transparent hover:text-amber-200 ${activeAction === 'community' ? 'hero-link-action is-clicking' : 'hero-link-action'}`}
            >
              <MapIcon size={14} /> {t('landing.hero.viewCommunityMap')} <ArrowRight size={14} />
            </Button>
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
      <section id="quick-actions" data-reveal className="bg-background px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            label={t('landing.quickActions.label')}
            title={t('landing.quickActions.title')}
            subtitle={t('landing.quickActions.subtitle')}
          />

          <div className="grid gap-4 md:grid-cols-3">
            {actions.map((item, index) => (
              <Card
                key={item.title}
                data-reveal
                data-reveal-slide="x"
                data-reveal-dir="left"
                className="group cursor-pointer border-l-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderLeftColor: item.color, transitionDelay: `${index * 90}ms` }}
                onClick={item.action}
              >
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: item.bg }}
                    >
                      <item.icon size={18} style={{ color: item.color }} />
                    </div>
                    <CardTitle className="text-base font-extrabold">{item.title}</CardTitle>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  <div className="mt-auto flex justify-end">
                    <Button variant="outline" size="sm" className="gap-1 text-xs font-extrabold">
                      {t('landing.quickActions.open')} <ArrowRight size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
        className="relative overflow-hidden bg-[#0F172A] px-6 py-24"
      >
        {/* Background grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-[1] mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-12">

            {/* Left: text */}
            <div className="flex-[1_1_300px]">
              <Badge
                variant="outline"
                className="mb-4 border-blue-500/30 bg-blue-500/[0.15] text-[11px] font-bold uppercase tracking-[0.06em] text-blue-300"
              >
                {t('landing.map.label')}
              </Badge>
              <h2 className="mb-3 text-[clamp(22px,4vw,30px)] font-extrabold leading-[1.25] text-white">
                {t('landing.map.title').split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>
                ))}
              </h2>
              <p className="mb-6 max-w-[380px] text-sm leading-[1.65] text-white/60">
                {t('landing.map.desc')}
              </p>
              <Button
                size="lg"
                onClick={go}
                className="gap-2 rounded-lg text-sm font-bold"
              >
                <MapIcon size={16} /> {t('landing.map.exploreBtn')} <ArrowRight size={14} />
              </Button>
            </div>

            {/* Right: map preview visual */}
            <div className="relative flex-[1_1_280px]">
              <div
                className="relative min-h-[230px] overflow-hidden rounded-xl border border-blue-500/[0.18] bg-[rgba(30,58,138,0.25)] p-7"
              >
                {/* Inner grid */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
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
                      className="whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold text-white/85"
                      style={{ background: 'rgba(15,23,42,0.82)' }}
                    >
                      {pin.label}
                    </span>
                  </div>
                ))}

                {/* Footer label */}
                <div
                  className="absolute bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-blue-500/35 bg-[rgba(15,23,42,0.88)] px-3.5 py-[5px] text-[11px] font-bold text-blue-300"
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
    <section id="how" data-reveal className="bg-muted px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          label={t('landing.howItWorks.label')}
          title={t('landing.howItWorks.threeSteps')}
          subtitle={t('landing.howItWorks.tagline')}
        />

        {/* Community image banner */}
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={COMMUNITY_IMAGE}
            alt="Community collaboration"
            className="h-48 w-full object-cover"
          />
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {steps.map((step, index) => (
            <Card
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={step.title}
              className="gap-0 border shadow-sm"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <CardHeader className="gap-2.5 pb-0">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-[50px] items-center justify-center rounded-xl"
                      style={{ background: step.bg }}
                    >
                      <step.icon size={24} color={step.color} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                        {t('landing.howItWorks.step', { number: String(index + 1) })}
                      </div>
                      <CardTitle className="mt-0.5 text-[17px] font-extrabold">{step.title}</CardTitle>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-lg px-2 py-1 text-[11px] font-extrabold"
                    style={{ color: step.color, background: step.bg, borderColor: `${step.color}33` }}
                  >
                    {step.visual}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="m-0 text-sm leading-[1.55] text-muted-foreground">{step.detail}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-[5px] bg-muted">
                  <span
                    className="block h-full rounded-[5px]"
                    style={{ width: `${(index + 1) * 33}%`, background: step.color }}
                  />
                </div>
              </CardContent>
            </Card>
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
    <section id="barangays" data-reveal className="bg-primary px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          label={t('landing.barangays.label')}
          title={t('landing.barangays.subtitle')}
          subtitle={t('landing.barangays.tagline')}
          light
        />

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {barangays.map((item, index) => (
            <Card
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              className="relative overflow-hidden border-2 border-white/20 bg-white/[0.1] text-center"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <CardContent className="p-7">
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
                    <Badge
                      key={r}
                      variant="secondary"
                      className="border border-white/20 bg-white/[0.15] text-[11px] font-bold text-white"
                    >
                      {r}
                    </Badge>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-1.5 border-white/30 bg-white/[0.12] text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20"
                  onClick={() => navigate('/auth/register')}
                >
                  {t('landing.barangays.startReporting')} <ChevronRight size={15} />
                </Button>
              </CardContent>
            </Card>
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
    <section id="safety" data-reveal className="bg-background px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          label={t('landing.safety.label')}
          title={t('landing.safety.subtitle')}
          subtitle={t('landing.safety.tagline')}
        />

        {/* Safety image banner */}
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={SAFETY_IMAGE}
            alt="Community safety"
            className="h-48 w-full object-cover"
          />
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {tips.map((tip, index) => (
            <Card
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={tip.title}
              className="border shadow-sm text-center"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <CardContent className="p-6">
                <div className="mb-3.5 flex justify-center">
                  <div
                    className="flex size-16 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: tip.bg }}
                  >
                    <tip.icon size={28} color={tip.color} strokeWidth={2.5} />
                  </div>
                </div>
                <h3 className="mb-3 text-[17px] font-extrabold text-foreground">{tip.title}</h3>
                <div className="mb-3 flex flex-wrap justify-center gap-2">
                  {tip.actions.map((action) => (
                    <Badge
                      key={action}
                      variant="outline"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      style={{
                        color: tip.color,
                        background: tip.bg,
                        borderColor: `${tip.color}33`,
                      }}
                    >
                      {action}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                  <CheckCircle2 size={14} color={tip.color} />
                  {t('landing.safety.reportTugon')}
                </div>
              </CardContent>
            </Card>
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
    <section id="hotlines" data-reveal className="bg-muted px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          label={t('landing.emergency.label')}
          title={t('landing.emergency.subtitle')}
          subtitle={t('landing.emergency.tagline')}
        />

        <Card
          data-reveal
          className="mb-4 border-destructive bg-severity-critical shadow-md"
          style={{ transitionDelay: '80ms' }}
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-3.5 p-6">
            <div>
              <div className="mb-1 text-xl font-extrabold text-white">{t('landing.emergency.callNow')}</div>
              <div className="text-sm text-white/90">{t('landing.emergency.callThenFile')}</div>
            </div>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="gap-1.5 border-white/20 bg-white font-extrabold text-severity-critical hover:bg-white/90 hover:text-severity-critical"
            >
              <a href="tel:911">
                <Phone size={14} /> {t('landing.emergency.callNowBtn')}
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {hotlines.map((item, index) => (
            <Card
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              className="border shadow-sm"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex size-[34px] items-center justify-center rounded-lg"
                    style={{ background: item.bg }}
                  >
                    <Phone size={15} color={item.color} />
                  </div>
                  <h3 className="m-0 text-[15px] font-bold text-foreground">{item.name}</h3>
                </div>
                <div
                  className="mb-1.5 text-2xl font-extrabold leading-[1.1]"
                  style={{ color: item.color }}
                >
                  {item.number}
                </div>
                <p className="mb-2.5 text-[13px] text-muted-foreground">{item.note}</p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs font-extrabold"
                  style={{
                    color: item.color,
                    borderColor: `${item.color}33`,
                    background: item.bg,
                  }}
                >
                  <a href={`tel:${item.number}`}>
                    <Phone size={13} /> {t('landing.emergency.callNumber', { number: item.number })}
                  </a>
                </Button>
              </CardContent>
            </Card>
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
