import React, { useEffect, useState } from 'react';
import {
  Layers, Filter, Search, X, Users,
  Flame, Droplets, Car, Heart, Shield as ShieldIcon, Zap, Wind,
  Navigation2, ArrowLeft,
} from 'lucide-react';
import { Incident, IncidentType, IncidentStatus, incidentTypeConfig, statusConfig } from '../data/incidents';
import { useLocation, useNavigate } from 'react-router';
import { IncidentMap } from '../components/IncidentMap';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';
import { officialReportsApi } from '../services/officialReportsApi';
import { reportToIncident } from '../utils/incidentAdapters';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';

const typeIcons: Record<IncidentType, React.ReactNode> = {
  fire: <Flame size={14} />, flood: <Droplets size={14} />, accident: <Car size={14} />,
  medical: <Heart size={14} />, crime: <ShieldIcon size={14} />, infrastructure: <Zap size={14} />, typhoon: <Wind size={14} />,
};

const TYPE_EMOJI: Record<string, string> = {
  fire: '🔥', flood: '💧', accident: '🚗',
  medical: '❤️', crime: '🔒', infrastructure: '⚡', typhoon: '🌀',
};

function IncidentCard({ incident, selected, onClick }: { incident: Incident; selected: boolean; onClick: () => void }) {
  const cfg = incidentTypeConfig[incident.type];
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        border: `1.5px solid ${selected ? '#1E3A8A' : '#F1F5F9'}`,
        background: selected ? '#EFF6FF' : 'white', marginBottom: 6, transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: cfg.bgColor,
          color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: 14,
        }}>
          {TYPE_EMOJI[incident.type] ?? typeIcons[incident.type]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{incident.id}</span>
            <StatusBadge status={incident.status} size="sm" pulse={incident.status === 'active'} />
          </div>
          <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {incident.barangay}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <SeverityBadge severity={incident.severity} size="sm" />
            <span style={{ fontSize: 10, color: '#94A3B8' }}>
              {new Date(incident.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
          {/* Coordinates */}
          <div style={{ fontSize: 9, color: '#CBD5E1', marginTop: 3, fontFamily: 'monospace' }}>
            {incident.lat.toFixed(4)}°N, {incident.lng.toFixed(4)}°E
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isPublicCommunityMap = location.pathname === '/community-map';
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<IncidentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [panelOpen, setPanelOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await officialReportsApi.getReports();
        const mapped = payload.reports.map((report) => reportToIncident(report));
        setIncidents(mapped);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load incidents.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const filtered = incidents.filter(inc => {
    if (filterType && inc.type !== filterType) return false;
    if (filterStatus && inc.status !== filterStatus) return false;
    const q = search.toLowerCase();
    if (search && !inc.id.toLowerCase().includes(q) && !inc.barangay.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        height: isPublicCommunityMap ? '100dvh' : '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >

      {/* Mobile panel overlay backdrop */}
      {panelOpen && (
        <div
          className="map-panel-backdrop"
          onClick={() => setPanelOpen(false)}
          style={{ display: 'none' }}
        />
      )}

      {/* ── Left Panel ── */}
      <div
        className={`map-panel${panelOpen ? ' panel-open' : ''}`}
        style={{
          width: panelOpen ? 290 : 0,
          minWidth: panelOpen ? 290 : 0,
          background: 'white',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.3s, min-width 0.3s',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>Active Incidents</span>
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                background: showFilters ? '#EFF6FF' : '#F8FAFC',
                border: `1px solid ${showFilters ? '#93C5FD' : '#E2E8F0'}`,
                borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Filter size={12} color={showFilters ? '#1E3A8A' : '#94A3B8'} />
              <span style={{ fontSize: 11, color: showFilters ? '#1E3A8A' : '#64748B', fontWeight: 500 }}>Filter</span>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID or barangay..."
              style={{
                width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 12, outline: 'none',
                background: '#F8FAFC', boxSizing: 'border-box', color: '#1E293B',
              }}
            />
          </div>

          {showFilters && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as IncidentType | '')}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11, background: '#F8FAFC', color: '#64748B', outline: 'none' }}
              >
                <option value="">All Categories</option>
                {Object.entries(incidentTypeConfig).map(([k]) => (
                  <option key={k} value={k}>{getCategoryLabelForIncidentType(k as IncidentType)}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as IncidentStatus | '')}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11, background: '#F8FAFC', color: '#64748B', outline: 'none' }}
              >
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, flexShrink: 0 }}>
          {[
            { label: 'Showing',    value: filtered.length, color: '#1E293B' },
            { label: 'Active',     value: filtered.filter(i => i.status === 'active').length, color: '#B91C1C' },
            { label: 'Responding', value: filtered.filter(i => i.status === 'responding').length, color: '#1E3A8A' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, padding: '6px 4px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* OSM badge */}
        <div style={{ padding: '6px 14px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', borderRadius: 6, padding: '4px 8px' }}>
            <Navigation2 size={10} color="#059669" />
            <span style={{ color: '#059669', fontSize: 9, fontWeight: 600 }}>OpenStreetMap · Live Coordinates</span>
          </div>
        </div>

        {/* Incident list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {error ? (
            <div style={{ textAlign: 'center', color: '#B91C1C', fontSize: 12, padding: 24 }}>{error}</div>
          ) : loading ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 24 }}>Loading incidents...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 24 }}>No incidents match</div>
          ) : filtered.map(inc => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              selected={selectedIncident?.id === inc.id}
              onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}
            />
          ))}
        </div>
      </div>

      {/* ── Map Area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Header bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {isPublicCommunityMap && (
            <button
              onClick={handleBack}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 40,
              }}
            >
              <ArrowLeft size={14} color="#334155" />
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>Back</span>
            </button>
          )}

          <button
            onClick={() => setPanelOpen(v => !v)}
            style={{ background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minHeight: 40 }}
          >
            <Layers size={14} color="#1E3A8A" />
            <span style={{ fontSize: 12, color: '#1E3A8A', fontWeight: 600 }}>{panelOpen ? 'Hide' : 'Show'} Panel</span>
          </button>

          <div className="map-header-title" style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>TUGON Incident Map</span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>Municipality of Tugon — OpenStreetMap</span>
          </div>

          {/* Mobile: page label */}
          <div style={{ flex: 1, textAlign: 'center' }} className="map-mobile-title">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Incident Map</span>
          </div>

          {/* Live coord display */}
          {selectedIncident && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '4px 10px',
            }}>
              <Navigation2 size={11} color="#059669" />
              <span style={{ color: '#059669', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>
                {selectedIncident.lat.toFixed(4)}°N, {selectedIncident.lng.toFixed(4)}°E
              </span>
            </div>
          )}
        </div>

        {/* Full OSM Map */}
        <div style={{ position: 'absolute', inset: 0, paddingTop: 48 }}>
          <IncidentMap
            incidents={filtered}
            height="100%"
            selectedId={selectedIncident?.id ?? null}
            onSelectIncident={inc => setSelectedIncident(inc)}
            compact={false}
            zoom={15}
          />
        </div>

        {/* Selected incident bottom card */}
        {selectedIncident && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: 580,
            zIndex: 1500, pointerEvents: 'auto',
          }}>
            <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: '#1E3A8A', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, fontSize: 18,
                  background: incidentTypeConfig[selectedIncident.type].bgColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {TYPE_EMOJI[selectedIncident.type]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{selectedIncident.id}</div>
                  <div style={{ color: '#93C5FD', fontSize: 11 }}>{selectedIncident.barangay}, {selectedIncident.district}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={selectedIncident.status} size="sm" pulse={selectedIncident.status === 'active'} />
                  <button
                    onClick={() => setSelectedIncident(null)}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: 8, cursor: 'pointer', minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} color="white" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '12px 16px' }}>
                <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                  {selectedIncident.description}
                </p>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  background: '#F0FDF4', borderRadius: 6, padding: '6px 10px', border: '1px solid #BBF7D0',
                }}>
                  <Navigation2 size={12} color="#059669" />
                  <span style={{ color: '#059669', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>
                    {selectedIncident.lat.toFixed(6)}°N, {selectedIncident.lng.toFixed(6)}°E
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: 10, marginLeft: 'auto' }}>© OpenStreetMap contributors</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <SeverityBadge severity={selectedIncident.severity} />
                  <TypeBadge type={selectedIncident.type} />
                  <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={11} /> {selectedIncident.responders} units
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, background: '#1E3A8A', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
                    Dispatch Response
                  </button>
                  <button style={{ flex: 1, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
                    Full Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .map-panel-backdrop {
            display: block !important;
            position: fixed; inset: 0; background: rgba(0,0,0,0.4);
            z-index: 199;
          }
          .map-panel.panel-open {
            overflow-y: auto;
          }
          .map-mobile-title { display: block !important; }
          .map-header-title  { display: none   !important; }
        }
        @media (min-width: 769px) {
          .map-mobile-title { display: none !important; }
          .map-header-title { display: block !important; }
        }
      `}</style>
    </div>
  );
}