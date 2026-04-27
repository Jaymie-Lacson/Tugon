import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  MapPin,
  Menu,
  Phone,
  Radio,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { getAuthSession } from '../utils/authSession';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
import { useImmersiveThemeColor } from '../hooks/useImmersiveThemeColor';
import { IncidentMap } from '../components/IncidentMap';
import type { Incident } from '../data/incidents';
import '../../styles/landing.css';


const HERO_DUMMY_REPORTS: Incident[] = [
  {
    id: 'TGN-25041',
    type: 'crime',
    severity: 'critical',
    status: 'active',
    barangay: 'Barangay 252',
    district: 'Tondo I',
    location: 'Abad Santos Ave cor. Villaruel St.',
    reportedAt: '2026-04-22T11:52:00.000Z',
    responders: 2,
    description: 'Street altercation reported near transport stop.',
    reportedBy: 'Resident',
    mapX: 24,
    mapY: 56,
    lat: 14.61447,
    lng: 120.97692,
  },
  {
    id: 'TGN-25042',
    type: 'accident',
    severity: 'medium',
    status: 'responding',
    barangay: 'Barangay 251',
    district: 'Tondo I',
    location: 'Almeda St. near Aurora Health Center',
    reportedAt: '2026-04-22T11:38:00.000Z',
    responders: 1,
    description: 'Minor road hazard from motorcycle slip.',
    reportedBy: 'Resident',
    mapX: 43,
    mapY: 63,
    lat: 14.61452,
    lng: 120.97754,
  },
  {
    id: 'TGN-25043',
    type: 'medical',
    severity: 'high',
    status: 'active',
    barangay: 'Barangay 256',
    district: 'Tondo I',
    location: 'Villaruel St. interior lane',
    reportedAt: '2026-04-22T11:21:00.000Z',
    responders: 1,
    description: 'Elderly resident needing urgent assistance.',
    reportedBy: 'Watch Volunteer',
    mapX: 62,
    mapY: 40,
    lat: 14.61558,
    lng: 120.97855,
  },
  {
    id: 'TGN-25044',
    type: 'infrastructure',
    severity: 'medium',
    status: 'responding',
    barangay: 'Barangay 256',
    district: 'Tondo I',
    location: 'Dapdap St. drainage section',
    reportedAt: '2026-04-22T10:58:00.000Z',
    responders: 1,
    description: 'Blocked drainage with rising roadside water.',
    reportedBy: 'Citizen',
    mapX: 68,
    mapY: 32,
    lat: 14.61595,
    lng: 120.97886,
  },
  {
    id: 'TGN-25045',
    type: 'crime',
    severity: 'high',
    status: 'active',
    barangay: 'Barangay 251',
    district: 'Tondo I',
    location: 'Biak na Bato St. alley',
    reportedAt: '2026-04-22T10:44:00.000Z',
    responders: 2,
    description: 'Disturbance escalated near residential alley.',
    reportedBy: 'Resident',
    mapX: 39,
    mapY: 57,
    lat: 14.61476,
    lng: 120.97769,
  },
];

function revealDelayClass(delayMs: number) {
  return `reveal-delay-${delayMs}`;
}

function updateCardTilt(event: React.MouseEvent<HTMLElement>) {
  if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  event.currentTarget.style.setProperty('--card-tilt-x', `${(-y * 6).toFixed(2)}deg`);
  event.currentTarget.style.setProperty('--card-tilt-y', `${(x * 8).toFixed(2)}deg`);
}

function resetCardTilt(event: React.MouseEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--card-tilt-x', '0deg');
  event.currentTarget.style.setProperty('--card-tilt-y', '0deg');
}

function navigateTo(path: string, options?: { replace?: boolean }) {
  if (window.location.pathname === path && !window.location.hash) {
    if (path === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  if (options?.replace) {
    window.location.replace(path);
    return;
  }

  window.location.assign(path);
}

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
        className={`mb-3 max-w-[640px] text-[clamp(28px,3.8vw,40px)] font-bold leading-[1.14] tracking-[-0.018em] ${
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
        <img src="/favicon.svg" alt="TUGON" className="auth-redirect-logo" width="42" height="42" />
      </div>
    </div>
  );
}

function Navbar() {
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
      navigateTo(path);
    }, 260);
  };

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <nav
        className={`landing-navbar ${scrolled ? 'is-scrolled' : ''}`}
        ref={navRef}
        aria-label="Primary"
      >
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6">
          <button
            onClick={() => navigateTo('/')}
            aria-label="Go to TUGON home"
            className="flex cursor-pointer items-center border-none bg-transparent p-0"
          >
            <img
              src="/tugon-wordmark-blue.svg"
              alt="TUGON Tondo Emergency Response"
              className="landing-nav-logo"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              width="120"
              height="40"
            />
          </button>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollTo(link.href)}
                className="landing-nav-link"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => navigateAuthWithOverlay('/auth/login')}
              className="landing-nav-link landing-nav-link--muted"
            >
              {t('landing.nav.login')}
            </button>
            <Button
              size="sm"
              onClick={() => navigateAuthWithOverlay('/auth/register')}
              className="landing-nav-cta h-9 gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
            >
              {t('landing.nav.register')} <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </div>

          {mobileOpen ? (
            <button
              type="button"
              className="landing-mobile-toggle is-open md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              aria-expanded="true"
              aria-controls="landing-mobile-nav"
            >
              <X size={20} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="landing-mobile-toggle md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded="false"
              aria-controls="landing-mobile-nav"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {mobileOpen ? (
          <div
            id="landing-mobile-nav"
            className="landing-mobile-panel nav-mobile-panel"
          >
            {navLinks.map((link) => (
              <button
                className="landing-mobile-link"
                key={link.label}
                onClick={() => scrollTo(link.href)}
              >
                {link.label}
              </button>
            ))}
            <div className="landing-mobile-actions">
              <Button
                className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigateAuthWithOverlay('/auth/register')}
              >
                {t('landing.nav.register')}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-md border-border bg-background text-foreground"
                onClick={() => navigateAuthWithOverlay('/auth/login')}
              >
                {t('landing.nav.loginToContinue')}
              </Button>
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}

function Hero() {
  const { t } = useTranslation();
  const [activeAction, setActiveAction] = useState<'report' | 'track' | null>(null);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const heroHighlights = [
    { value: '24/7', label: 'report intake' },
    { value: `${new Set(HERO_DUMMY_REPORTS.map((report) => report.type)).size}`, label: 'incident types in preview' },
    { value: '3', label: 'barangays covered' },
  ];

  const navigateWithTransition = (action: 'report' | 'track', path: string) => {
    setActiveAction(action);
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigateTo(path);
    }, 260);
  };

  const scrollToNext = () => {
    document.querySelector('#why')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          <span className="landing-hero-bg-glow landing-hero-bg-glow--a" />
          <span className="landing-hero-bg-glow landing-hero-bg-glow--b" />
        </div>

        <div className={`landing-hero-content ${activeAction ? 'hero-transition-scope is-routing' : 'hero-transition-scope'}`}>
          <div className={`landing-hero-badge ${revealDelayClass(0)}`} data-reveal>
            <span className="landing-hero-pulse" aria-hidden="true">
              <span className="landing-hero-pulse-dot" />
              <span className="landing-hero-pulse-ring" />
            </span>
            <Radio size={12} aria-hidden="true" />
            {t('landing.hero.liveIn')}
          </div>

          <h1 className={`landing-hero-title ${revealDelayClass(60)}`} data-reveal>
            The civic response system that <em>just works</em> for{' '}
            <span className="landing-hero-title-mark">Tondo</span>.
          </h1>

          <p className={`landing-hero-copy ${revealDelayClass(120)}`} data-reveal>
            {t('landing.hero.subtagline')}
          </p>

          <div className={`landing-hero-actions ${revealDelayClass(180)}`} data-reveal>
            <Button
              size="lg"
              onClick={() => navigateWithTransition('report', '/auth/register')}
              className={`landing-hero-cta-primary ${activeAction === 'report' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}`}
            >
              {t('landing.hero.reportIncident')} <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={() => navigateWithTransition('track', '/auth/login')}
              className={`landing-hero-cta-secondary ${activeAction === 'track' ? 'hero-link-action is-clicking' : 'hero-link-action'}`}
            >
              {t('landing.hero.trackStatus')}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          <p className={`landing-hero-fineprint ${revealDelayClass(240)}`} data-reveal>
            Verified barangay routing / Phone OTP secured / Free for residents
          </p>

          <div className={`landing-hero-highlights ${revealDelayClass(260)}`} data-reveal>
            {heroHighlights.map((item) => (
              <div key={item.label} className="landing-hero-highlight">
                <div className="landing-hero-highlight-value">{item.value}</div>
                <div className="landing-hero-highlight-label">{item.label}</div>
              </div>
            ))}
          </div>

        </div>

        <button
          data-reveal
          onClick={scrollToNext}
          aria-label="Scroll to next section"
          className={`landing-scroll-cue landing-scroll-cue--light ${revealDelayClass(420)}`}
        >
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </section>
    </>
  );
}

function HeroMapStage() {
  const stageRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setInView(true);
        });
      },
      { threshold: 0.1, rootMargin: '200% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      el.style.setProperty('--map-progress', '1');
      return;
    }

    // Modern Chromium (115+) and Safari (18+) drive --map-progress entirely
    // from CSS @supports block, on the compositor thread. Skip the JS path
    // altogether — no scroll listener, no rAF, no layout reads.
    const hasNativeScrollTimeline =
      typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
    if (hasNativeScrollTimeline) {
      return;
    }

    let ticking = false;
    let lastProgress = -1;
    let isStageInView = false;
    let cachedHeight = 0;
    let cachedTop = 0;

    // Cache dimensions once to avoid forced reflow on every scroll
    const cacheDimensions = () => {
      cachedHeight = el.offsetHeight;
    };
    cacheDimensions();

    // Update cached dimensions on resize to handle responsive layouts
    const resizeObserver = new ResizeObserver(() => {
      cacheDimensions();
    });
    resizeObserver.observe(el);

    const update = () => {
      ticking = false;
      if (!isStageInView) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Use cached height + current top for scroll calculation
      const scrollable = cachedHeight - vh;
      let next = 1;
      if (scrollable > 0) {
        const scrolled = Math.max(0, Math.min(scrollable, -rect.top));
        const raw = scrolled / (scrollable * 0.7);
        next = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      }

      // Quantize to two decimals so trivial scroll deltas don't trigger
      // style writes (and the resulting compositor work) on weak devices.
      const quantized = Math.round(next * 100) / 100;
      if (quantized === lastProgress) return;
      lastProgress = quantized;
      el.style.setProperty('--map-progress', String(quantized));
    };

    const onScroll = () => {
      // Bail before queuing rAF when stage isn't visible — saves callback
      // dispatch + layout read on every scroll tick.
      if (ticking || !inView) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    // One-viewport buffer so the transform is settled before the stage
    // scrolls into view.
    const io = new IntersectionObserver(
      (entries) => {
        isStageInView = entries[0]?.isIntersecting ?? false;
        if (inView) update();
      },
      { rootMargin: '200% 0px' },
    );
    io.observe(el);

    isStageInView = true;
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      io.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className="landing-hero-map-stage"
      aria-hidden="true"
    >
      <div className="landing-hero-map-sticky">
        <div className="landing-hero-map-frame">
          {inView ? (
            <IncidentMap
              incidents={HERO_DUMMY_REPORTS}
              showMarkerTooltip={false}
              showIncidentGlow={false}
              compact
              interactive={false}
              zoom={17}
              height="100%"
              viewportKey="landing-hero-map"
              forceLight
            />
          ) : (
            <div className="landing-hero-map-placeholder" />
          )}
        </div>
      </div>
    </section>
  );
}

type ActionRowConfig = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  path: string;
  illustration: 'report' | 'track' | 'map';
};

function ActionRows() {
  const { t } = useTranslation();
  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigateTo(path);
    }, 260);
  };

  const rows: ActionRowConfig[] = [
    {
      eyebrow: 'Report',
      title: t('landing.quickActions.reportTitle'),
      body: 'Pin the exact spot, attach a photo or voice note, and submit in under a minute. Geofencing routes the report to the right barangay automatically, with no phone trees or walk-ins required.',
      cta: t('landing.quickActions.reportTitle'),
      path: '/auth/register',
      illustration: 'report',
    },
    {
      eyebrow: 'Track',
      title: t('landing.quickActions.trackTitle'),
      body: "Every report moves through five clear statuses, from Submitted to Resolved. You'll see who's reviewing it, when it changed hands, and what comes next from one timeline.",
      cta: t('landing.quickActions.trackTitle'),
      path: '/auth/login',
      illustration: 'track',
    },
    {
      eyebrow: 'Map',
      title: t('landing.quickActions.mapTitle'),
      body: 'Pins drop in real time across Barangays 251, 252, and 256. Filter by incident type, scan what neighbors are reporting, and stay aware of what is happening on your block.',
      cta: t('landing.quickActions.mapTitle'),
      path: '/community-map',
      illustration: 'map',
    },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section id="why" className="landing-rows">
        <ZigzagTrail count={rows.length} />
        <div className="landing-container">
          <div className="landing-rows-intro" data-reveal>
            <SectionHeading
              label={t('landing.quickActions.label')}
              title={t('landing.quickActions.title')}
              subtitle={t('landing.quickActions.subtitle')}
              align="center"
            />
          </div>

          <div className="landing-rows-stack">
            {rows.map((row, index) => (
              <div
                key={row.title}
                data-reveal
                className={`landing-row ${index % 2 === 1 ? 'landing-row--reverse' : ''} ${revealDelayClass(index * 60)}`}
              >
                <div className="landing-row-text">
                  <span className="landing-row-eyebrow">{row.eyebrow}</span>
                  <h3 className="landing-row-title">{row.title}</h3>
                  <p className="landing-row-body">{row.body}</p>
                  <button
                    type="button"
                    onClick={() => navigateAuthWithOverlay(row.path)}
                    className="landing-row-cta"
                  >
                    {row.cta}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="landing-row-visual" aria-hidden="true">
                  {row.illustration === 'report' && <ReportIllustration />}
                  {row.illustration === 'track' && <TrackIllustration />}
                  {row.illustration === 'map' && <MapIllustration />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ZigzagTrail({ count }: { count: number }) {
  if (count < 2) return null;

  // Build a zigzag SVG path that swings between left (20) and right (80)
  // along a 0–100 viewBox, with one swing per gap between rows.
  const segments = Math.max(count - 1, 1);
  const stepY = 100 / segments;
  const sway = 30; // horizontal swing distance from center
  const cx = 50;

  let d = `M ${cx} 0`;
  for (let i = 0; i < segments; i++) {
    const startY = i * stepY;
    const endY = (i + 1) * stepY;
    const midY = startY + stepY / 2;
    const swingX = i % 2 === 0 ? cx + sway : cx - sway;
    // Smooth S-curve into the swing point, then back to center on the next pass
    d += ` C ${cx} ${startY + stepY * 0.18}, ${swingX} ${midY - stepY * 0.18}, ${swingX} ${midY}`;
    d += ` C ${swingX} ${midY + stepY * 0.18}, ${cx} ${endY - stepY * 0.18}, ${cx} ${endY}`;
  }

  return (
    <svg
      className="landing-rows-trail"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 7"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function OperationalSignals() {
  const signals = [
    {
      title: 'Barangay-first routing',
      detail: 'Automatically matched to the right desk',
    },
    {
      title: 'OTP-protected accounts',
      detail: 'Verified access before residents file reports',
    },
    {
      title: 'Map-based awareness',
      detail: 'See what is happening around your block',
    },
    {
      title: 'Clear status timeline',
      detail: 'Submission to resolution in one flow',
    },
    {
      title: 'Emergency handoff first',
      detail: 'Call-first behavior for urgent incidents',
    },
  ];

  return (
    <section className="landing-press" aria-label="Operational strengths">
      <div className="landing-container">
        <div className="landing-press-label">
          <Sparkles size={13} aria-hidden="true" />
          Designed for civic response
        </div>
        <div className="landing-press-marquee">
          <div className="landing-press-track">
            {[0, 1].map((copyIndex) => (
              <div
                key={copyIndex}
                className="landing-press-group"
                aria-hidden={copyIndex === 1 ? 'true' : undefined}
              >
                {signals.map((signal) => (
                  <article key={`${copyIndex}-${signal.title}`} className="landing-press-card">
                    <div className="landing-press-card-kicker">Operational signal</div>
                    <h3 className="landing-press-card-title">{signal.title}</h3>
                    <p className="landing-press-card-detail">{signal.detail}</p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportIllustration() {
  return (
    <div className="illustration illustration-report">
      <div
        className="illustration-phone illustration-tilt-card"
        onMouseMove={updateCardTilt}
        onMouseLeave={resetCardTilt}
      >
        <div className="illustration-phone-bar">
          <span className="illustration-phone-dot" />
          <span className="illustration-phone-pill" />
        </div>
        <div className="illustration-form-row">
          <span className="illustration-form-label">Type</span>
          <div className="illustration-chips">
            <span className="illustration-chip illustration-chip--a">Crime</span>
            <span className="illustration-chip illustration-chip--b">Noise</span>
            <span className="illustration-chip illustration-chip--c">Pollution</span>
          </div>
        </div>
        <div className="illustration-form-row">
          <span className="illustration-form-label">Location</span>
          <div className="illustration-pin-line">
            <MapPin size={14} aria-hidden="true" />
            <span>Brgy 251 / Almeda St.</span>
          </div>
        </div>
        <div className="illustration-evidence">
          <div className="illustration-evidence-tile">
            <Sparkles size={16} aria-hidden="true" />
            <span>Photo</span>
          </div>
          <div className="illustration-evidence-tile">
            <Radio size={16} aria-hidden="true" />
            <span>Voice</span>
          </div>
        </div>
        <div className="illustration-submit">Submit Report</div>
      </div>
      <span className="illustration-blob illustration-blob--a" />
      <span className="illustration-blob illustration-blob--b" />
    </div>
  );
}

function TrackIllustration() {
  const steps = [
    { label: 'Submitted', state: 'done' },
    { label: 'Under Review', state: 'done' },
    { label: 'In Progress', state: 'active' },
    { label: 'Resolved', state: 'pending' },
    { label: 'Closed', state: 'pending' },
  ];

  return (
    <div className="illustration illustration-track">
      <div
        className="illustration-card illustration-tilt-card"
        onMouseMove={updateCardTilt}
        onMouseLeave={resetCardTilt}
      >
        <div className="illustration-card-head">
          <div>
            <div className="illustration-card-id">TGN-00184</div>
            <div className="illustration-card-meta">Pollution / Brgy 252</div>
          </div>
          <span className="illustration-card-badge">In Progress</span>
        </div>
        <ol className="illustration-timeline">
          {steps.map((s, i) => (
            <li key={s.label} className={`illustration-step illustration-step--${s.state}`}>
              <span className="illustration-step-marker">
                {s.state === 'done' && <CheckCircle2 size={14} aria-hidden="true" />}
                {s.state === 'active' && <span className="illustration-step-pulse" />}
              </span>
              <span className="illustration-step-label">{s.label}</span>
              {i < steps.length - 1 && <span className="illustration-step-line" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
      <span className="illustration-blob illustration-blob--c" />
    </div>
  );
}

function MapIllustration() {
  const pins = [
    { pinClass: 'illustration-map-pin--1', toneClass: 'illustration-map-pin-tone--medium', label: 'Noise' },
    { pinClass: 'illustration-map-pin--2', toneClass: 'illustration-map-pin-tone--critical', label: 'Crime' },
    { pinClass: 'illustration-map-pin--3', toneClass: 'illustration-map-pin-tone--medium', label: 'Noise' },
    { pinClass: 'illustration-map-pin--4', toneClass: 'illustration-map-pin-tone--pollution', label: 'Pollution' },
    { pinClass: 'illustration-map-pin--5', toneClass: 'illustration-map-pin-tone--critical', label: 'Crime' },
  ];

  const barangayLabels = [
    { name: 'Barangay 252', labelClass: 'illustration-map-zone-label--252' },
    { name: 'Barangay 251', labelClass: 'illustration-map-zone-label--251' },
    { name: 'Barangay 256', labelClass: 'illustration-map-zone-label--256' },
  ];

  return (
    <div className="illustration illustration-map">
      <div
        className="illustration-map-tile illustration-tilt-card"
        onMouseMove={updateCardTilt}
        onMouseLeave={resetCardTilt}
      >
        <img
          src="/maps/tondo-barangays-clean.svg"
          alt=""
          className="illustration-map-img"
          loading="lazy"
          decoding="async"
        />
        {pins.map((pin) => (
          <div
            key={`${pin.pinClass}-${pin.label}`}
            className={`illustration-map-pin ${pin.pinClass}`}
          >
            <span className={`illustration-map-pin-dot ${pin.toneClass}`} />
            <span className={`illustration-map-pin-pulse ${pin.toneClass}`} />
          </div>
        ))}
        {barangayLabels.map((barangay) => (
          <span
            key={barangay.name}
            className={`illustration-map-zone-label ${barangay.labelClass}`}
          >
            {barangay.name}
          </span>
        ))}
        <div className="illustration-map-legend">
          <span className="illustration-map-legend-item">
            <span className="illustration-map-legend-dot illustration-map-pin-tone--critical" />
            Crime
          </span>
          <span className="illustration-map-legend-item">
            <span className="illustration-map-legend-dot illustration-map-pin-tone--medium" />
            Noise
          </span>
          <span className="illustration-map-legend-item">
            <span className="illustration-map-legend-dot illustration-map-pin-tone--pollution" />
            Pollution
          </span>
        </div>
      </div>
      <span className="illustration-blob illustration-blob--d" />
    </div>
  );
}

function FeatureCards() {
  const { t } = useTranslation();

  const cards = [
    {
      title: t('landing.safety.tip1.title'),
      icon: Shield,
      tone: 'navy' as const,
      bullets: [t('landing.safety.tip1.action1'), t('landing.safety.tip1.action2')],
    },
    {
      title: t('landing.safety.tip2.title'),
      icon: Users,
      tone: 'ochre' as const,
      bullets: [t('landing.safety.tip2.action1'), t('landing.safety.tip2.action2')],
    },
    {
      title: t('landing.safety.tip3.title'),
      icon: AlertTriangle,
      tone: 'rose' as const,
      bullets: [t('landing.safety.tip3.action1'), t('landing.safety.tip3.action2')],
    },
  ];

  return (
    <section id="safety" className="landing-features">
      <div className="landing-container">
        <SectionHeading
          label={t('landing.safety.label')}
          title={t('landing.safety.subtitle')}
          subtitle={t('landing.safety.tagline')}
          align="center"
        />

        <div className="landing-features-grid">
          {cards.map((card, index) => (
            <article
              key={card.title}
              data-reveal
              className={`landing-feature landing-feature--${card.tone} ${revealDelayClass(index * 80)}`}
            >
              <div className="landing-feature-orb">
                <span className="landing-feature-orb-bg" aria-hidden="true" />
                <card.icon size={28} strokeWidth={2} aria-hidden="true" />
              </div>
              <h3 className="landing-feature-title">{card.title}</h3>
              <ul className="landing-feature-list">
                {card.bullets.map((b) => (
                  <li key={b}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsMap() {
  const { t } = useTranslation();
  const [authRedirecting, setAuthRedirecting] = useState(false);

  const go = () => {
    setAuthRedirecting(true);
    window.setTimeout(() => navigateTo('/community-map'), 260);
  };

  const pins = [
    { pinClass: 'landing-stats-map-pin--1', toneClass: 'landing-stats-map-pin-tone--medium' },
    { pinClass: 'landing-stats-map-pin--2', toneClass: 'landing-stats-map-pin-tone--critical' },
    { pinClass: 'landing-stats-map-pin--3', toneClass: 'landing-stats-map-pin-tone--pollution' },
    { pinClass: 'landing-stats-map-pin--4', toneClass: 'landing-stats-map-pin-tone--critical' },
    { pinClass: 'landing-stats-map-pin--5', toneClass: 'landing-stats-map-pin-tone--pollution' },
    { pinClass: 'landing-stats-map-pin--6', toneClass: 'landing-stats-map-pin-tone--medium' },
    { pinClass: 'landing-stats-map-pin--7', toneClass: 'landing-stats-map-pin-tone--info' },
  ];

  const barangayLabels = [
    { name: 'Barangay 252', labelClass: 'landing-stats-map-zone-label--252' },
    { name: 'Barangay 251', labelClass: 'landing-stats-map-zone-label--251' },
    { name: 'Barangay 256', labelClass: 'landing-stats-map-zone-label--256' },
  ];

  const stats = [
    { val: '3', label: 'Barangays\ncovered' },
    { val: '5', label: 'Incident\ncategories' },
    { val: '24/7', label: 'Real-time\nreporting' },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section className="landing-stats-map">
        <div className="landing-container">
          <div className="landing-stats-map-inner">
            <div className="landing-stats-map-text" data-reveal>
              <SectionHeading
                label={t('landing.map.label')}
                title="Real-time pins across every block we serve"
                subtitle={t('landing.map.desc')}
              />
              <Button
                size="lg"
                onClick={go}
                className="landing-stats-map-cta"
              >
                {t('landing.map.exploreBtn')} <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </div>

            <div className={`landing-stats-map-visual ${revealDelayClass(120)}`} data-reveal>
              <div className="landing-stats-map-tile" aria-hidden="true">
                <img
                  src="/maps/tondo-barangays-clean.svg"
                  alt=""
                  className="landing-stats-map-img"
                  loading="lazy"
                  decoding="async"
                />
                {pins.map((pin, i) => (
                  <span
                    key={i}
                    className={`landing-stats-map-pin ${pin.pinClass} ${pin.toneClass}`}
                  />
                ))}
                {barangayLabels.map((barangay) => (
                  <span
                    key={barangay.name}
                    className={`landing-stats-map-zone-label ${barangay.labelClass}`}
                  >
                    {barangay.name}
                  </span>
                ))}
              </div>
              <div className="landing-stats-map-numbers">
                {stats.map((s) => (
                  <div key={s.val} className="landing-stats-map-stat">
                    <div className="landing-stats-map-stat-val">{s.val}</div>
                    <div className="landing-stats-map-stat-label">{s.label}</div>
                  </div>
                ))}
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
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const steps = [
    {
      title: t('landing.howItWorks.step1.sectionTitle'),
      detail: t('landing.howItWorks.step1.detail'),
      icon: FileText,
      tone: 'navy' as const,
      visual: t('landing.howItWorks.step1.visual'),
    },
    {
      title: t('landing.howItWorks.step2.sectionTitle'),
      detail: t('landing.howItWorks.step2.detail'),
      icon: Users,
      tone: 'ochre' as const,
      visual: t('landing.howItWorks.step2.visual'),
    },
    {
      title: t('landing.howItWorks.step3.sectionTitle'),
      detail: t('landing.howItWorks.step3.detail'),
      icon: CheckCircle2,
      tone: 'green' as const,
      visual: t('landing.howItWorks.step3.visual'),
    },
  ];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) {
      return;
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      setProgress(0);
      setActiveIndex(0);
      return;
    }

    let ticking = false;
    let cachedHeight = 0;

    const cacheDimensions = () => {
      cachedHeight = el.offsetHeight;
    };
    cacheDimensions();

    const resizeObserver = new ResizeObserver(() => {
      cacheDimensions();
    });
    resizeObserver.observe(el);

    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = cachedHeight - vh;
      if (scrollable <= 0) {
        setProgress(0);
        setActiveIndex(0);
        return;
      }
      const scrolled = Math.max(0, Math.min(scrollable, -rect.top));
      const p = scrolled / scrollable;
      setProgress(p);
      const idx = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollToStep = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrollable = Math.max(1, rect.height - vh);
    const targetP = i / (steps.length - 1);
    const sectionTop = rect.top + window.scrollY;
    window.scrollTo({ top: sectionTop + targetP * scrollable, behavior: 'smooth' });
  };

  const segmentProgress = Math.max(
    0,
    Math.min(1, progress * steps.length - activeIndex),
  );
  const activeTone = steps[activeIndex].tone;

  return (
    <section id="how" ref={sectionRef} className={`landing-how landing-how--${activeTone}`}>
      <div className="landing-how-sticky">
        <div className="landing-how-eyebrow" aria-hidden="true">
          <span className="landing-how-eyebrow-line" />
          {t('landing.howItWorks.label')}
        </div>

        <h2 className="landing-how-title">
          {t('landing.howItWorks.threeSteps')}
        </h2>

        <div className="landing-how-stage">
          <div className="landing-how-numeral" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`landing-how-numeral-digit ${
                  i === activeIndex ? 'is-active' : ''
                } ${i < activeIndex ? 'is-past' : ''}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
          </div>

          <div className="landing-how-panels">
            {steps.map((step, i) => (
              <article
                key={step.title}
                aria-hidden={i !== activeIndex}
                className={`landing-how-panel landing-how-panel--${step.tone} ${
                  i === activeIndex ? 'is-active' : ''
                } ${i < activeIndex ? 'is-past' : ''}`}
              >
                <span className="landing-how-panel-step" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="landing-how-panel-kicker">{step.visual}</span>
                <h3 className="landing-how-panel-title">{step.title}</h3>
                <p className="landing-how-panel-detail">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <nav className="landing-how-rail" aria-label="Jump to step">
          {steps.map((step, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;
            const fillPct = isPast ? 100 : isActive ? segmentProgress * 100 : 0;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => scrollToStep(i)}
                aria-label={`Go to step ${i + 1}: ${step.title}`}
                aria-current={isActive ? 'step' : undefined}
                className={`landing-how-rail-item ${isActive ? 'is-active' : ''} ${
                  isPast ? 'is-past' : ''
                }`}
              >
                <span className="landing-how-rail-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="landing-how-rail-track" aria-hidden="true">
                  <span
                    className="landing-how-rail-fill"
                    style={{ transform: `scaleX(${fillPct / 100})` }}
                  />
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

function SupportedBarangays() {
  const { t } = useTranslation();

  const barangays = [
    {
      name: 'Barangay 251',
      captain: 'Reynaldo Angat',
      district: 'District II, Tondo, Manila',
      hallAddress: '1781 Almeda Street, Tondo, Manila',
      responders: ['MDRRMO', 'BFP', 'PNP'],
    },
    {
      name: 'Barangay 252',
      captain: 'Leana Angat',
      district: 'District II, Tondo, Manila',
      hallAddress: '1787 Biak-na-Bato Street, Tondo, Manila',
      responders: ['MDRRMO', 'PNP', 'EMS'],
    },
    {
      name: 'Barangay 256',
      captain: 'Ramon "Peaches" Perez',
      district: 'District II, Tondo, Manila',
      hallAddress: '1865 Tescon de Cuia Street, Tondo, Manila',
      responders: ['MDRRMO', 'BFP', 'EMS'],
    },
  ];

  return (
    <section id="barangays" className="landing-barangays">
      <div className="landing-container">
        <SectionHeading
          label={t('landing.barangays.label')}
          title={t('landing.barangays.subtitle')}
          subtitle={t('landing.barangays.tagline')}
        />

        <div className="landing-barangays-list">
          {barangays.map((item, index) => (
            <div
              key={item.name}
              data-reveal
              className={`landing-barangay-row ${revealDelayClass(index * 70)}`}
            >
              <div className="landing-barangay-id">
                <div className="landing-barangay-pin">
                  <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <div className="landing-barangay-name">{item.name}</div>
                  <div className="landing-barangay-district">{item.district}</div>
                </div>
              </div>

              <div className="landing-barangay-info">
                <div className="landing-barangay-captain">
                  {t('landing.barangays.captain', { name: item.captain })}
                </div>
                <div className="landing-barangay-address">{item.hallAddress}</div>
              </div>

              <div className="landing-barangay-responders">
                {item.responders.map((r) => (
                  <span key={r} className="landing-barangay-tag">{r}</span>
                ))}
              </div>

              <button
                onClick={() => navigateTo('/auth/register')}
                className="landing-barangay-cta"
              >
                {t('landing.barangays.startReporting')} <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const stories = [
    {
      quote: 'Residents do not need a manual. They need one place to report, one place to track, and proof that someone saw it.',
      name: 'Mariel S.',
      role: 'Resident, Barangay 251',
    },
    {
      quote: 'The timeline reduces duplicate follow-ups because everyone can see what already happened and what still needs action.',
      name: 'Desk Officer',
      role: 'Barangay 252 response desk',
    },
    {
      quote: 'A map view changes the conversation. Repeat trouble spots become visible before they turn into a larger community issue.',
      name: 'Volunteer Lead',
      role: 'Community watch, Barangay 256',
    },
  ];

  return (
    <section className="landing-testimonials">
      <div className="landing-container">
        <div data-reveal>
          <SectionHeading
            label="Confidence"
            title="Confidence for residents, clarity for responders"
            subtitle="TUGON is designed to make the next step obvious, whether you are filing a report, checking its status, or scanning what is happening nearby."
            align="center"
          />
        </div>

        <div className="landing-testimonials-grid">
          {stories.map((story, index) => (
            <figure
              key={story.name}
              data-reveal
              className={`landing-testimonial ${revealDelayClass(index * 80)}`}
            >
              <div className="landing-testimonial-mark" aria-hidden="true">
                <Sparkles size={18} strokeWidth={1.8} />
              </div>
              <blockquote className="landing-testimonial-body">
                "{story.quote}"
              </blockquote>
              <figcaption className="landing-testimonial-cite">
                <span className="landing-testimonial-avatar" aria-hidden="true">
                  {story.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="landing-testimonial-name">{story.name}</div>
                  <div className="landing-testimonial-role">{story.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  const { t } = useTranslation();
  const [authRedirecting, setAuthRedirecting] = useState(false);

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigateTo(path);
    }, 260);
  };

  const hotlines = [
    { name: t('landing.emergency.hotline1.name'), number: '911' },
    { name: t('landing.emergency.hotline2.name'), number: '117' },
    { name: t('landing.emergency.hotline3.name'), number: '160' },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <section id="hotlines" className="landing-closing">
        <div className="landing-container">
          <div className="landing-closing-grid">
            <div data-reveal className="landing-closing-card landing-closing-card--emergency">
              <div className="landing-closing-icon landing-closing-icon--alert">
                <AlertTriangle size={22} aria-hidden="true" />
              </div>
              <h3 className="landing-closing-title">Life-threatening emergency?</h3>
              <p className="landing-closing-body">
                {t('landing.emergency.callThenFile')}
              </p>
              <div className="landing-closing-hotlines">
                {hotlines.map((h) => (
                  <a key={h.number} href={`tel:${h.number}`} className="landing-closing-hotline">
                    <span className="landing-closing-hotline-num">{h.number}</span>
                    <span className="landing-closing-hotline-name">{h.name}</span>
                    <Phone size={14} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            <div data-reveal className={`landing-closing-card landing-closing-card--register ${revealDelayClass(80)}`}>
              <div className="landing-closing-icon landing-closing-icon--primary">
                <CheckCircle2 size={22} aria-hidden="true" />
              </div>
              <h3 className="landing-closing-title">Ready to file your first report?</h3>
              <p className="landing-closing-body">
                Set up your TUGON account in under two minutes. Verify your phone, confirm your barangay, and you are ready to report.
              </p>
              <Button
                size="lg"
                onClick={() => navigateAuthWithOverlay('/auth/register')}
                className="landing-closing-cta"
              >
                {t('landing.nav.register')} <ArrowRight size={15} aria-hidden="true" />
              </Button>
              <p className="landing-closing-fineprint">
                Free for residents / Phone OTP secured / No spam
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const [authRedirecting, setAuthRedirecting] = useState(false);

  const scrollToSection = (selector: string) => {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navigateAuthWithOverlay = (path: string) => {
    setAuthRedirecting(true);
    window.setTimeout(() => {
      navigateTo(path);
    }, 260);
  };

  const columns = [
    {
      heading: 'Citizen access',
      links: [
        { label: t('landing.footer.register'), action: () => navigateAuthWithOverlay('/auth/register') },
        { label: t('landing.footer.login'), action: () => navigateAuthWithOverlay('/auth/login') },
        { label: t('landing.footer.communityMap'), action: () => navigateAuthWithOverlay('/community-map') },
      ],
    },
    {
      heading: 'Coverage',
      links: [
        { label: 'Barangay 251', action: () => scrollToSection('#barangays') },
        { label: 'Barangay 252', action: () => scrollToSection('#barangays') },
        { label: 'Barangay 256', action: () => scrollToSection('#barangays') },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: t('landing.nav.howItWorks'), action: () => scrollToSection('#how') },
        { label: t('landing.nav.safety'), action: () => scrollToSection('#safety') },
        { label: t('landing.nav.hotlines'), action: () => scrollToSection('#hotlines') },
      ],
    },
  ];

  return (
    <>
      <AuthRedirectOverlay visible={authRedirecting} />
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <button
                onClick={() => navigateTo('/')}
                aria-label="Go to TUGON home"
                className="landing-footer-logo-btn"
              >
                <img
                  src="/tugon-header-logo.svg"
                  alt="TUGON Tondo Emergency Response"
                  className="landing-footer-logo"
                  width="120"
                  height="36"
                />
              </button>
              <p className="landing-footer-desc">
                {t('landing.footer.desc')}
              </p>
              <a href="tel:911" className="landing-footer-emergency">
                <Phone size={14} aria-hidden="true" />
                {t('landing.footer.emergencyCall')}
              </a>
            </div>

            {columns.map((col) => (
              <div key={col.heading} className="landing-footer-col">
                <div className="landing-footer-col-head">{col.heading}</div>
                <ul className="landing-footer-col-list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <button type="button" onClick={link.action} className="landing-footer-link">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="landing-footer-meta">
            <span>&copy; {year} TUGON. {t('landing.footer.tagline')}</span>
            <span className="landing-footer-loc">{t('landing.footer.location')}</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  useImmersiveThemeColor('#f5f7fb');

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!revealItems.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
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

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      return;
    }

    if (session.user.role === 'CITIZEN') {
      navigateTo('/citizen', { replace: true });
      return;
    }

    if (session.user.role === 'SUPER_ADMIN') {
      navigateTo('/superadmin', { replace: true });
      return;
    }

    navigateTo('/app', { replace: true });
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflowX = html.style.overflowX;
    const previousBodyOverflowX = body.style.overflowX;

    html.style.overflowX = 'clip';
    body.style.overflowX = 'clip';

    return () => {
      html.style.overflowX = previousHtmlOverflowX;
      body.style.overflowX = previousBodyOverflowX;
    };
  }, []);

  return (
    <div
      data-pretext-opt-out="true"
      className="landing-root"
    >
      <a className="skip-link" href="#landing-main-content">
        {t('landing.skipToMain')}
      </a>
      <Navbar />
      <main id="landing-main-content">
        <Hero />
        <HeroMapStage />
        <OperationalSignals />
        <ActionRows />
        <FeatureCards />
        <StatsMap />
        <HowToUse />
        <SupportedBarangays />
        <ClosingCta />
        <Footer />
      </main>
    </div>
  );
}
