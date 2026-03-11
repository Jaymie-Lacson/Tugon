import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  FileText,
  Flame,
  Map as MapIcon,
  MapPin,
  Menu,
  Phone,
  Radio,
  Users,
  X,
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
          background: light ? 'rgba(255,255,255,0.16)' : '#E2E8F0',
          color: light ? '#BFDBFE' : '#1E3A8A',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '6px 12px',
          borderRadius: 20,
          marginBottom: 10,
        }}
      >
        {label}
      </span>
      <h2
        style={{
          color: light ? '#FFFFFF' : '#1E293B',
          fontSize: 'clamp(22px,4vw,30px)',
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: light ? '#BFDBFE' : '#64748B',
          fontSize: 15,
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

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'How It Works', href: '#how' },
    { label: 'Safety Tips', href: '#safety' },
    { label: 'Hotlines', href: '#hotlines' },
  ];

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(15,23,42,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'background 0.3s, backdrop-filter 0.3s',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
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
              onClick={() => navigate('/auth/login')}
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
              onClick={() => navigate('/auth/register')}
              style={{
                background: '#B91C1C',
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
            className="nav-mobile-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
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
            }}
          >
            {mobileOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
          </button>
        </div>

        {mobileOpen && (
          <div
            style={{
              background: 'rgba(15,23,42,0.98)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 20px 20px',
            }}
          >
            {navLinks.map((link) => (
              <button
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
                }}
              >
                {link.label}
              </button>
            ))}
            <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => navigate('/auth/login')}
                style={{
                  width: '100%',
                  background: '#B91C1C',
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
                onClick={() => navigate('/auth/register')}
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
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-cta { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<'report' | 'track' | 'community' | null>(null);

  const navigateWithTransition = (action: 'report' | 'track' | 'community', path: string) => {
    setActiveAction(action);
    window.setTimeout(() => {
      navigate(path);
    }, 170);
  };

  const scrollToQuickActions = () => {
    document.querySelector('#quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
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
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(185,28,28,0.2)',
            border: '1px solid rgba(185,28,28,0.4)',
            borderRadius: 20,
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
            marginBottom: 16,
            maxWidth: 760,
          }}
        >
          EMPOWERING <span style={{ color: '#60A5FA' }}>TONDO</span> WITH INSTANT{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #B91C1C, #EF4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TUGON.
          </span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(14px,2vw,17px)', lineHeight: 1.65, maxWidth: 620, marginBottom: 28 }}>
          Report local incidents, track updates from barangay responders, and help improve community safety.
          TUGON is a digital support platform and does not replace the official barangay or police blotter.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
          <button
            onClick={() => navigateWithTransition('report', '/auth/register')}
            className={activeAction === 'report' ? 'hero-action-btn is-clicking' : 'hero-action-btn'}
            style={{
              background: '#B91C1C',
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
            onClick={() => navigateWithTransition('track', '/auth/login')}
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
          onClick={() => navigateWithTransition('community', '/community-map')}
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
  );
}

function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Report Incident',
      desc: 'Submit a step-by-step report with map pin location and evidence upload.',
      icon: AlertTriangle,
      color: '#B91C1C',
      bg: '#FEE2E2',
      action: () => navigate('/auth/register'),
    },
    {
      title: 'Track Status',
      desc: 'Check your report progress from Submitted to Closed in your dashboard.',
      icon: FileText,
      color: '#1E3A8A',
      bg: '#DBEAFE',
      action: () => navigate('/auth/login'),
    },
    {
      title: 'View Community Map',
      desc: 'See mapped incidents in your area and stay aware of nearby concerns.',
      icon: MapIcon,
      color: '#B4730A',
      bg: '#FEF3C7',
      action: () => navigate('/community-map'),
    },
  ];

  return (
    <section id="quick-actions" data-reveal style={{ padding: '56px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Quick Access"
          title="Start With One Simple Action"
          subtitle="Three core tasks for citizens: report, track, and view your community map."
        />

        <div
          className="quick-actions-desktop"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {actions.map((item, index) => (
            <button
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.title}
              onClick={item.action}
              style={{
                textAlign: 'left',
                padding: '18px 18px 16px',
                border: 'none',
                borderRight: index < actions.length - 1 ? '1px solid #E2E8F0' : 'none',
                background: 'transparent',
                cursor: 'pointer',
                transitionDelay: `${index * 90}ms`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={16} color={item.color} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{item.title}</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 8 }}>{item.desc}</div>
              <div style={{ color: item.color, fontSize: 12, fontWeight: 700 }}>
                Open <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4 }} />
              </div>
            </button>
          ))}
        </div>

        <div className="quick-actions-mobile" style={{ display: 'none', gap: 12 }}>
          {actions.map((item) => (
            <button
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.title}
              onClick={item.action}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: 'white',
                padding: '14px',
                cursor: 'pointer',
                transitionDelay: '100ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} color={item.color} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{item.title}</div>
              </div>
              <div style={{ textAlign: 'left', fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>{item.desc}</div>
            </button>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .quick-actions-desktop { display: none !important; }
            .quick-actions-mobile { display: grid !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function HowToUse() {
  const steps = [
    {
      title: 'Submit Report',
      detail: 'Choose incident type, pin location, and add details or evidence.',
      icon: FileText,
      color: '#1E3A8A',
      bg: '#DBEAFE',
    },
    {
      title: 'Barangay Review',
      detail: 'Officials review and update your ticket status based on urgency.',
      icon: Users,
      color: '#B4730A',
      bg: '#FEF3C7',
    },
    {
      title: 'Resolution',
      detail: 'You receive updates until the incident is resolved or closed.',
      icon: CheckCircle2,
      color: '#059669',
      bg: '#D1FAE5',
    },
  ];

  return (
    <section id="how" data-reveal style={{ padding: '88px 24px', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="How It Works"
          title="A Clear 3-Step Flow"
          subtitle="TUGON keeps reporting straightforward for citizens and actionable for barangay officials."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {steps.map((step, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={step.title}
              style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, transitionDelay: `${index * 90}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: step.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <step.icon size={17} color={step.color} />
                </div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.06em' }}>STEP 0{index + 1}</div>
              </div>
              <h3 style={{ fontSize: 16, color: '#1E293B', fontWeight: 700, marginBottom: 6 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportedBarangays() {
  const barangays = [
    {
      name: 'Barangay 251',
      district: 'District I',
      note: 'Coastal and flood-prone areas with active fire and hazard monitoring.',
    },
    {
      name: 'Barangay 252',
      district: 'District I',
      note: 'Commercial activity zone with frequent traffic and noise concerns.',
    },
    {
      name: 'Barangay 256',
      district: 'District I',
      note: 'High-density roads and market corridors requiring quick incident response.',
    },
  ];

  return (
    <section id="barangays" data-reveal style={{ padding: '88px 24px', background: '#1E3A8A' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Coverage"
          title="Supported Barangays"
          subtitle="Incidents are geofenced and routed to the correct barangay jurisdiction."
          light
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
          {barangays.map((item, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="left"
              key={item.name}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 14, padding: 18, transitionDelay: `${index * 90}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MapPin size={16} color="#BFDBFE" />
                <h3 style={{ margin: 0, color: 'white', fontSize: 17, fontWeight: 700 }}>{item.name}</h3>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#BFDBFE' }}>{item.district}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>{item.note}</p>
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
      title: 'Fire Prevention',
      icon: Flame,
      color: '#B91C1C',
      bg: '#FEE2E2',
      bullets: ['Do not leave open flames unattended.', 'Avoid overloading electrical outlets.', 'Keep exits clear and accessible.'],
    },
    {
      title: 'Noise and Disturbance',
      icon: Users,
      color: '#1E3A8A',
      bg: '#DBEAFE',
      bullets: ['Follow barangay quiet hours.', 'Document repeated disturbance safely.', 'Use TUGON for formal reporting.'],
    },
    {
      title: 'Road Safety',
      icon: AlertTriangle,
      color: '#B4730A',
      bg: '#FEF3C7',
      bullets: ['Report blocked roads and potholes.', 'Use pedestrian crossings.', 'Avoid phone use while crossing.'],
    },
  ];

  return (
    <section id="safety" data-reveal style={{ padding: '88px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Awareness"
          title="Safety Tips"
          subtitle="Simple prevention habits help reduce incidents and improve response time."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {tips.map((tip, index) => (
            <div
              data-reveal
              data-reveal-slide="x"
              data-reveal-dir="right"
              key={tip.title}
              style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, background: 'white', transitionDelay: `${index * 90}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: tip.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <tip.icon size={17} color={tip.color} />
                </div>
                <h3 style={{ fontSize: 16, color: '#1E293B', fontWeight: 700, margin: 0 }}>{tip.title}</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                {tip.bullets.map((bullet) => (
                  <li key={bullet} style={{ fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 1.5 }}>
                    {bullet}
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
  const hotlines = [
    { name: 'National Emergency', number: '911', note: 'Police, fire, and medical emergencies', color: '#B91C1C', bg: '#FEE2E2' },
    { name: 'Philippine National Police', number: '117', note: 'Law enforcement and public safety concerns', color: '#1E3A8A', bg: '#DBEAFE' },
    { name: 'Bureau of Fire Protection', number: '160', note: 'Fire incidents and rescue support', color: '#B4730A', bg: '#FEF3C7' },
  ];

  return (
    <section id="hotlines" data-reveal style={{ padding: '88px 24px', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading
          label="Emergency Contacts"
          title="Emergency Hotlines in the Philippines"
          subtitle="For immediate danger, call first. You can still file a detailed report in TUGON after emergency response."
        />

        <div
          data-reveal
          style={{
            background: 'linear-gradient(135deg, #B91C1C, #991B1B)',
            borderRadius: 14,
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
            <div style={{ color: 'white', fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Call 911 for urgent emergencies</div>
            <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>Available nationwide for police, fire, and medical response.</div>
          </div>
          <a
            href="tel:911"
            style={{
              background: 'white',
              color: '#B91C1C',
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
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{item.note}</p>
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
  const quickLinks = [
    { label: 'Register', action: () => navigate('/auth/register') },
    { label: 'Login', action: () => navigate('/auth/login') },
    { label: 'Community Map', action: () => navigate('/community-map') },
  ];

  return (
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
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', lineHeight: 1.62, margin: 0, maxWidth: 500 }}>
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
          <span style={{ color: 'rgba(255,255,255,0.34)' }}>Barangays 251, 252, 256 · Tondo, Manila</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer button, footer a { min-height: 40px; }
        }
      `}</style>
    </footer>
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

  return (
    <div style={{ fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif" }}>
      <Navbar />
      <Hero />
      <QuickActions />
      <HowToUse />
      <SupportedBarangays />
      <SafetyTips />
      <EmergencyHotlines />
      <Footer />

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

        .hero-transition-scope {
          transition: opacity 180ms ease, transform 180ms ease;
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

        .landing-scroll-cue {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          width: 40px;
          height: 40px;
          border-radius: 9999px;
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

          .landing-scroll-cue,
          .landing-scroll-cue-icon {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
