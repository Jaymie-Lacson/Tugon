import React, { useState, useEffect } from 'react';
import {
  Shield, MapPin, AlertTriangle, CheckCircle2, Clock, Phone, Flame,
  Volume2, Car, ChevronRight, ArrowRight, Menu, X, Radio, Zap,
  FileText, Users, Eye, Star, Navigation,
} from 'lucide-react';
import { useNavigate } from 'react-router';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1736117705462-34145ac33bdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBjaXR5JTIwZ3JpZCUyMHVyYmFuJTIwbWFwJTIwc3RyZWV0c3xlbnwxfHx8fDE3NzI3ODE2MDl8MA&ixlib=rb-4.1.0&q=80&w=1080';
const FIRE_IMAGE =
  'https://images.unsplash.com/photo-1759403270914-6010ada1d9dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXJlJTIwc2FmZXR5JTIwZW1lcmdlbmN5JTIwcHJldmVudGlvbnxlbnwxfHx8fDE3NzI3ODE2MDl8MA&ixlib=rb-4.1.0&q=80&w=400';
const NOISE_IMAGE =
  'https://images.unsplash.com/photo-1665649891877-24cf237d7c43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxub2lzZSUyMGNvbW11bml0eSUyMG5laWdoYm9yaG9vZCUyMGRpc3R1cmJhbmNlfGVufDF8fHx8MTc3Mjc4MTYxMnww&ixlib=rb-4.1.0&q=80&w=400';
const ROAD_IMAGE =
  'https://images.unsplash.com/photo-1766524872202-ae69163a4218?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2FkJTIwc2FmZXR5JTIwdHJhZmZpYyUyMHN0cmVldHMlMjB1cmJhbnxlbnwxfHx8fDE3NzI3ODE2MTB8MA&ixlib=rb-4.1.0&q=80&w=400';

/* ─── Animated counter ─────────────────────────────────────────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

/* ─── Section heading ───────────────────────────────────────────── */
function SectionHeading({ label, title, subtitle, light = false }: {
  label: string; title: string; subtitle: string; light?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48 }}>
      <span style={{
        display: 'inline-block', background: light ? 'rgba(255,255,255,0.15)' : '#EFF6FF',
        color: light ? '#BFDBFE' : '#1E3A8A', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px',
        borderRadius: 20, marginBottom: 12,
      }}>{label}</span>
      <h2 style={{ color: light ? '#FFFFFF' : '#1E293B', fontSize: 'clamp(22px,4vw,32px)', fontWeight: 700, marginBottom: 10, lineHeight: 1.2 }}>
        {title}
      </h2>
      <p style={{ color: light ? '#BFDBFE' : '#64748B', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>{subtitle}</p>
    </div>
  );
}

/* ─── Nav ───────────────────────────────────────────────────────── */
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
    { label: 'Barangays', href: '#barangays' },
    { label: 'Safety Tips', href: '#safety' },
    { label: 'Hotlines', href: '#hotlines' },
  ];

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(15,23,42,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#B91C1C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1 }}>TUGON</div>
              <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tondo Emergency Response</div>
            </div>
          </div>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-desktop">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 13,
                  fontWeight: 500, cursor: 'pointer', padding: '8px 14px', borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="nav-cta">
            <button
              onClick={() => navigate('/auth/login')}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '8px 16px', color: 'white', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              style={{
                background: '#B91C1C', border: 'none', borderRadius: 8, padding: '8px 18px',
                color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(185,28,28,0.4)', transition: 'all 0.15s',
              }}
            >
              Register
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: 8, cursor: 'pointer', display: 'none' }}
          >
            {mobileOpen ? <X size={20} color="white" /> : <Menu size={20} color="white" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{ background: 'rgba(15,23,42,0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px 20px' }}>
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 14, padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                {link.label}
              </button>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => navigate('/auth/login')} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '10px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Login</button>
              <button onClick={() => navigate('/auth/register')} style={{ flex: 1, background: '#B91C1C', border: 'none', borderRadius: 8, padding: '10px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Register</button>
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

/* ─── Hero ──────────────────────────────────────────────────────── */
function Hero() {
  const navigate = useNavigate();
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      {/* Background image */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <img src={HERO_IMAGE} alt="City aerial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,58,138,0.85) 50%, rgba(15,23,42,0.90) 100%)' }} />
        {/* Grid overlay (city grid aesthetic) */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: `
            linear-gradient(rgba(147,197,253,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147,197,253,1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />
        {/* Pulsing dot accent */}
        <div style={{ position: 'absolute', top: '35%', left: '60%', width: 14, height: 14, background: '#B91C1C', borderRadius: '50%', boxShadow: '0 0 0 6px rgba(185,28,28,0.3), 0 0 0 14px rgba(185,28,28,0.1)' }} />
        <div style={{ position: 'absolute', top: '55%', left: '52%', width: 10, height: 10, background: '#B4730A', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(180,115,10,0.3)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '72%', width: 8, height: 8, background: '#22C55E', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(34,197,94,0.25)' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '100px 24px 64px', width: '100%' }}>
        {/* Live badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(185,28,28,0.2)', border: '1px solid rgba(185,28,28,0.4)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
          <Radio size={12} color="#F87171" />
          <span style={{ color: '#FCA5A5', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live System — Barangays 251, 252, 256</span>
        </div>

        <div style={{ maxWidth: 720 }}>
          <h1 style={{
            color: '#FFFFFF', fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 900,
            lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em',
          }}>
            EMPOWERING{' '}
            <span style={{ color: '#60A5FA' }}>TONDO</span>
            {' '}WITH INSTANT{' '}
            <span style={{
              background: 'linear-gradient(135deg, #B91C1C, #EF4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>TUGON.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(14px,2vw,18px)', lineHeight: 1.65, marginBottom: 36, maxWidth: 580 }}>
            A web-based incident reporting and community safety platform for Barangays 251, 252, and 256. Report hazards, track response, and keep your community safe — in real time.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 48 }}>
            <button
              onClick={() => navigate('/citizen')}
              style={{
                background: '#B91C1C', border: 'none', borderRadius: 10, padding: '14px 28px',
                color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(185,28,28,0.5)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(185,28,28,0.6)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(185,28,28,0.5)'; }}
            >
              <AlertTriangle size={16} /> Report Incident
            </button>
            <button
              onClick={() => navigate('/auth/login')}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.35)',
                borderRadius: 10, padding: '14px 28px', color: 'white', fontSize: 14,
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                backdropFilter: 'blur(8px)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
            >
              <Eye size={16} /> Track My Reports
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            {[
              { value: 3, suffix: '', label: 'Barangays Covered' },
              { value: 6, suffix: '', label: 'Incident Categories' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'left' }}>
                <div style={{ color: '#FFFFFF', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, lineHeight: 1 }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
            {[
              { icon: '📡', label: 'Real-Time Tracking' },
              { icon: '🔒', label: 'Secure & Private' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'left' }}>
                <div style={{ color: '#FFFFFF', fontSize: 'clamp(22px,3vw,28px)', fontWeight: 800, lineHeight: 1 }}>{s.icon}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', zIndex: 2,
        animation: 'bounce 2s infinite',
      }} onClick={() => document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Scroll</span>
        <div style={{ width: 24, height: 36, border: '2px solid rgba(255,255,255,0.25)', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          <div style={{ width: 4, height: 8, background: 'white', borderRadius: 2, opacity: 0.5 }} />
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0);} 50%{transform:translateX(-50%) translateY(-8px);} }
      `}</style>
    </section>
  );
}

/* ─── How to Use ────────────────────────────────────────────────── */
function HowToUse() {
  const steps = [
    {
      step: '01', icon: FileText, color: '#1E3A8A', bg: '#EFF6FF',
      title: 'Submit an Incident Report',
      desc: 'Open TUGON and fill out the incident form. Include the type of hazard, exact location within your barangay, and an optional photo. Reports are submitted instantly to barangay officials.',
      detail: ['Select incident type', 'Pin your location on the map', 'Add description & photo', 'Submit in under 60 seconds'],
    },
    {
      step: '02', icon: Users, color: '#B4730A', bg: '#FEF3C7',
      title: 'Barangay Officials Review',
      desc: 'Your report is routed to the appropriate barangay captain or MDRRMO officer. Officials assess the situation, assign response units, and update the incident status in real time.',
      detail: ['Instant notification to officials', 'Severity assessment', 'Response unit dispatch', 'Status updates pushed to reporter'],
    },
    {
      step: '03', icon: CheckCircle2, color: '#059669', bg: '#D1FAE5',
      title: 'Resolution & Community Safety',
      desc: 'Once the incident is resolved, you receive a notification. All incidents are logged for community transparency and used to improve emergency preparedness in Tondo.',
      detail: ['Resolution notification sent', 'Community incident log updated', 'Feedback mechanism available', 'Data used for future prevention'],
    },
  ];

  return (
    <section id="how" style={{ padding: '96px 24px', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading
          label="Simple 3-Step Process"
          title="How to Use TUGON"
          subtitle="From reporting to resolution — TUGON keeps every barangay resident informed and every official accountable."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {steps.map((s, idx) => (
            <div
              key={s.step}
              style={{
                background: 'white', borderRadius: 16, padding: '28px 24px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                border: '1px solid rgba(0,0,0,0.04)',
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.07)'; }}
            >
              {/* Step number watermark */}
              <div style={{ position: 'absolute', top: -8, right: 12, fontSize: 72, fontWeight: 900, color: 'rgba(0,0,0,0.04)', lineHeight: 1, userSelect: 'none' }}>{s.step}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={22} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Step {s.step}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>{s.title}</div>
                </div>
              </div>

              <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>{s.desc}</p>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
                {s.detail.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={11} color={s.color} />
                    </div>
                    <span style={{ fontSize: 12, color: '#475569' }}>{d}</span>
                  </div>
                ))}
              </div>

              {/* Connector arrow (not on last) */}
              {idx < steps.length - 1 && (
                <div style={{ display: 'none' }} className="step-arrow">
                  <ArrowRight size={20} color="#CBD5E1" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Supported Barangays ───────────────────────────────────────── */
function SupportedBarangays() {
  const navigate = useNavigate();
  const barangays = [
    {
      num: '251', zone: 'Zone 24 — Tondo I/II', district: 'District I',
      landmarks: 'Near Balut, Bangkusay Channel',
      responders: ['MDRRMO', 'BFP', 'PNP'],
      incidentTypes: ['Fire', 'Flood', 'Road Hazard', 'Noise', 'Crime', 'Pollution'],
      color: '#1E3A8A', light: '#EFF6FF',
      description: 'A densely populated coastal barangay with active flood and fire incident monitoring along the waterway corridors.',
    },
    {
      num: '252', zone: 'Zone 25 — Tondo I/II', district: 'District I',
      landmarks: 'Near Tondo Market, Moriones',
      responders: ['MDRRMO', 'PNP', 'EMS'],
      incidentTypes: ['Road Hazard', 'Noise', 'Crime', 'Pollution', 'Fire', 'Other'],
      color: '#B91C1C', light: '#FEE2E2',
      description: 'A commercial hub barangay experiencing high foot traffic. Road accidents and noise disturbance are common incident types.',
    },
    {
      num: '256', zone: 'Zone 26 — Tondo I/II', district: 'District I',
      landmarks: 'Near Divisoria, Recto Avenue',
      responders: ['MDRRMO', 'BFP', 'EMS'],
      incidentTypes: ['Fire', 'Road Hazard', 'Noise', 'Crime', 'Flood', 'Other'],
      color: '#B4730A', light: '#FEF3C7',
      description: "Adjacent to Divisoria, this barangay benefits from TUGON's real-time infrastructure and medical emergency reporting.",
    },
  ];

  return (
    <section id="barangays" style={{ padding: '96px 24px', background: '#1E3A8A', position: 'relative', overflow: 'hidden' }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <SectionHeading
          label="Coverage Area"
          title="Supported Barangays"
          subtitle="TUGON provides real-time incident management and community safety monitoring across three barangays in Tondo, Manila."
          light
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {barangays.map(b => (
            <div
              key={b.num}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16, padding: '24px', cursor: 'pointer',
                backdropFilter: 'blur(8px)', transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 42, height: 42, background: b.light, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={20} color={b.color} />
                    </div>
                    <div>
                      <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 800 }}>Barangay {b.num}</div>
                      <div style={{ color: '#93C5FD', fontSize: 11 }}>{b.district}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{b.zone}</div>
                  <div style={{ fontSize: 11, color: '#93C5FD' }}>{b.landmarks}</div>
                </div>
                <span style={{ background: '#22C55E', color: 'white', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  ACTIVE
                </span>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>{b.description}</p>

              {/* Incident types covered */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Incident Types Covered</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {b.incidentTypes.map(t => (
                    <span key={t} style={{ background: 'rgba(255,255,255,0.08)', color: '#E2E8F0', fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Responders */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {b.responders.map(r => (
                  <span key={r} style={{ background: 'rgba(255,255,255,0.1)', color: '#BFDBFE', fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)' }}>
                    {r}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate('/auth/register')}
                style={{
                  marginTop: 16, width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, padding: '10px', color: 'white', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              >
                Register to Report <ChevronRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Safety Tips ───────────────────────────────────────────────── */
function SafetyTips() {
  const navigate = useNavigate();
  const tips = [
    {
      image: FIRE_IMAGE,
      icon: Flame,
      color: '#B91C1C',
      bg: '#FEE2E2',
      category: 'Fire Prevention',
      title: 'Keep Your Home Fire-Safe',
      tips: [
        'Never leave open flames unattended in the kitchen or during gatherings.',
        'Install smoke detectors on every floor and test them monthly.',
        'Keep a fire extinguisher accessible in the kitchen and know how to use it.',
        'Avoid overloading electrical outlets — use surge-protected extension cords.',
        'Report fire hazards immediately using TUGON before they escalate.',
      ],
      cta: 'Report a Fire Hazard',
    },
    {
      image: NOISE_IMAGE,
      icon: Volume2,
      color: '#7C3AED',
      bg: '#EDE9FE',
      category: 'Noise Disturbance',
      title: 'Protect Community Peace',
      tips: [
        'Observe quiet hours from 10 PM to 6 AM as mandated by local ordinance.',
        'Avoid using speakers, power tools, or loud equipment during rest hours.',
        'Communal activities should be scheduled with barangay approval.',
        'If you experience persistent noise disturbance, document it with a video.',
        'File a noise complaint through TUGON — it is routed directly to barangay officials.',
      ],
      cta: 'Report Noise Disturbance',
    },
    {
      image: ROAD_IMAGE,
      icon: Car,
      color: '#B4730A',
      bg: '#FEF3C7',
      category: 'Road Safety',
      title: 'Stay Safe on the Streets',
      tips: [
        'Use designated pedestrian crossings and always look both ways.',
        'Motorcyclists must wear helmets — passengers included.',
        'Report road hazards like potholes, damaged signage, or obstructions.',
        'Avoid using your phone while driving or crossing the street.',
        'Flooded roads are dangerous — report them immediately so MDRRMO can respond.',
      ],
      cta: 'Report a Road Hazard',
    },
  ];

  return (
    <section id="safety" style={{ padding: '96px 24px', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading
          label="Community Awareness"
          title="Safety Tips"
          subtitle="Be informed. Be prepared. Use TUGON to report any of these hazards and help keep Tondo safe."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {tips.map(tip => (
            <div
              key={tip.category}
              style={{
                background: 'white', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #F1F5F9',
                display: 'flex', flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)'; }}
            >
              {/* Image */}
              <div style={{ height: 180, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                <img src={tip.image} alt={tip.category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: tip.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <tip.icon size={15} color={tip.color} />
                  </div>
                  <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{tip.category}</span>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: '#1E293B', fontSize: 16, fontWeight: 700, marginBottom: 14, lineHeight: 1.3 }}>{tip.title}</h3>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', flex: 1 }}>
                  {tip.tips.map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: tip.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: tip.color }}>{i + 1}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.55 }}>{t}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/app')}
                  style={{
                    marginTop: 16, width: '100%', background: tip.bg, border: `1.5px solid ${tip.color}22`,
                    borderRadius: 8, padding: '10px', color: tip.color, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = tip.color; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = tip.bg; (e.currentTarget as HTMLElement).style.color = tip.color; }}
                >
                  <AlertTriangle size={13} /> {tip.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Emergency Hotlines ────────────────────────────────────────── */
function EmergencyHotlines() {
  const hotlines = [
    {
      name: 'Philippine National Police', short: 'PNP',
      number: '117', alt: '(02) 8722-0650',
      icon: Shield, color: '#1E3A8A', bg: '#EFF6FF', border: '#BFDBFE',
      desc: 'For crimes in progress, threats to safety, and law enforcement assistance in your barangay.',
      badge: 'Law Enforcement', badgeColor: '#1E3A8A', badgeBg: '#DBEAFE',
    },
    {
      name: 'Bureau of Fire Protection', short: 'BFP',
      number: '160', alt: '(02) 8426-0219',
      icon: Flame, color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA',
      desc: 'For fire incidents, structural fires, hazardous material spills, and fire-related rescues.',
      badge: 'Fire & Rescue', badgeColor: '#B91C1C', badgeBg: '#FEE2E2',
    },
    {
      name: 'National Emergency Hotline', short: 'EMS',
      number: '911', alt: '(02) 8516-2273',
      icon: Zap, color: '#059669', bg: '#D1FAE5', border: '#A7F3D0',
      desc: 'For medical emergencies, cardiac events, accidents, and any situation requiring immediate medical response.',
      badge: 'Medical Emergency', badgeColor: '#059669', badgeBg: '#D1FAE5',
    },
    {
      name: 'NDRRMC Operations Center', short: 'NDRRMC',
      number: '8911-1406', alt: '(02) 8911-5061',
      icon: Navigation, color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE',
      desc: 'For disaster risk reduction coordination, typhoon response, and major calamity assistance.',
      badge: 'Disaster Response', badgeColor: '#7C3AED', badgeBg: '#EDE9FE',
    },
    {
      name: 'Manila Health Department', short: 'MHD',
      number: '8525-9663', alt: '(02) 8527-3660',
      icon: CheckCircle2, color: '#0F766E', bg: '#CCFBF1', border: '#99F6E4',
      desc: 'For public health concerns, disease outbreaks, sanitation complaints, and health emergency coordination.',
      badge: 'Public Health', badgeColor: '#0F766E', badgeBg: '#CCFBF1',
    },
    {
      name: 'MMDA Emergency', short: 'MMDA',
      number: '136', alt: '1-800-1-888-MMDA',
      icon: Car, color: '#B4730A', bg: '#FEF3C7', border: '#FDE68A',
      desc: 'For road emergencies, traffic accidents, flooding on major roads, and metro-wide emergency coordination.',
      badge: 'Traffic & Roads', badgeColor: '#B4730A', badgeBg: '#FEF3C7',
    },
  ];

  return (
    <section id="hotlines" style={{ padding: '96px 24px', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading
          label="Emergency Contacts"
          title="Emergency Hotlines in the Philippines"
          subtitle="Save these numbers. In an emergency, every second counts. You can also report incidents directly through TUGON."
        />

        {/* Emergency banner */}
        <div style={{
          background: 'linear-gradient(135deg, #B91C1C, #991B1B)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(185,28,28,0.3)',
        }}>
          <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={22} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>National Emergency Number: 911</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>For ALL emergencies — police, fire, or medical — call 911 first. Available nationwide, 24/7.</div>
          </div>
          <a href="tel:911" style={{
            background: 'white', color: '#B91C1C', borderRadius: 10, padding: '12px 24px',
            fontSize: 15, fontWeight: 800, textDecoration: 'none', display: 'flex',
            alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            <Phone size={16} /> Call 911
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {hotlines.map(h => (
            <div
              key={h.short}
              style={{
                background: 'white', borderRadius: 14, padding: '20px',
                border: `1.5px solid ${h.border}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: h.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <h.icon size={20} color={h.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', lineHeight: 1.2, marginBottom: 4 }}>{h.name}</div>
                  <span style={{ background: h.badgeBg, color: h.badgeColor, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {h.badge}
                  </span>
                </div>
              </div>

              <p style={{ color: '#64748B', fontSize: 12, lineHeight: 1.55, marginBottom: 14 }}>{h.desc}</p>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
                  style={{
                    flex: 1, background: h.bg, border: `1px solid ${h.border}`,
                    borderRadius: 8, padding: '10px 14px', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 8, minWidth: 120,
                  }}
                >
                  <Phone size={14} color={h.color} />
                  <div>
                    <div style={{ color: h.color, fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{h.number}</div>
                    <div style={{ color: '#94A3B8', fontSize: 9, marginTop: 2 }}>Tap to call</div>
                  </div>
                </a>
                {h.alt && (
                  <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{h.alt}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* TUGON CTA */}
        <div style={{
          marginTop: 40, background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)',
          borderRadius: 16, padding: '28px 32px', textAlign: 'center',
          boxShadow: '0 4px 24px rgba(30,58,138,0.25)',
        }}>
          <div style={{ color: '#BFDBFE', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Prefer Digital?
          </div>
          <h3 style={{ color: 'white', fontSize: 'clamp(16px,3vw,22px)', fontWeight: 700, marginBottom: 10 }}>
            Report Incidents Directly via TUGON
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, maxWidth: 480, margin: '0 auto 20px' }}>
            Use the TUGON platform to file detailed incident reports with photos and map pinning. Your report goes directly to your barangay's response team.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '10px 20px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Learn How It Works
            </button>
            <button
              onClick={() => document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', color: '#1E3A8A', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={14} /> File a Report <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────────── */
function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0F172A', color: 'rgba(255,255,255,0.6)' }}>
      {/* Top footer */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 40 }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: '#B91C1C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>TUGON</div>
              <div style={{ color: '#93C5FD', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Community Safety Platform</div>
            </div>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', maxWidth: 240, marginBottom: 16 }}>
            A web-based incident reporting and decision support system for Barangays 251, 252, and 256 in Tondo, Manila.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ background: '#22C55E', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #22C55E', marginTop: 2 }} />
            <span style={{ fontSize: 11, color: '#4ADE80' }}>System Operational — 24/7 Monitoring</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Platform</div>
          {['Report Incident', 'Track Status', 'View Community Map', 'Emergency Hotlines'].map(link => (
            <div key={link} style={{ marginBottom: 10 }}>
              <button onClick={() => navigate('/app')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}>
                {link}
              </button>
            </div>
          ))}
        </div>

        {/* Barangays */}
        <div>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Barangays</div>
          {['Barangay 251', 'Barangay 252', 'Barangay 256'].map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MapPin size={12} color="#93C5FD" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{b} — Tondo I/II</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ color: '#4ADE80', fontSize: 11, fontWeight: 600 }}>All barangays online</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>Last sync: March 6, 2026</div>
          </div>
        </div>

        {/* Account */}
        <div>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Account</div>
          {[
            { label: 'Login', action: () => navigate('/auth/login') },
            { label: 'Register', action: () => navigate('/auth/register') },
            { label: 'Privacy Policy', action: () => {} },
            { label: 'Contact', action: () => {} },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 10 }}>
              <button onClick={item.action} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            © {year} TUGON — Barangays 251, 252, 256 · Tondo, Manila · All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Login', 'Register', 'Privacy Policy', 'Contact'].map(link => (
              <button key={link} onClick={() => navigate('/app')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}>
                {link}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div style={{ fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif" }}>
      <Navbar />
      <Hero />
      <HowToUse />
      <SupportedBarangays />
      <SafetyTips />
      <EmergencyHotlines />
      <Footer />
    </div>
  );
}