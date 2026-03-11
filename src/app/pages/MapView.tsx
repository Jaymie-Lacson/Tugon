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
import '../../styles/map-view.css';

const typeIcons: Record<IncidentType, React.ReactNode> = {
  fire: <Flame size={14} />, flood: <Droplets size={14} />, accident: <Car size={14} />,
  medical: <Heart size={14} />, crime: <ShieldIcon size={14} />, infrastructure: <Zap size={14} />, typhoon: <Wind size={14} />,
};

function IncidentCard({ incident, selected, onClick }: { incident: Incident; selected: boolean; onClick: () => void }) {
  const cardClass = selected ? 'map-incident-card is-selected' : 'map-incident-card';
  const iconClass = `map-incident-type-icon map-incident-type-${incident.type}`;

  return (
    <div onClick={onClick} className={cardClass}>
      <div className="map-incident-card-row">
        <div className={iconClass}>
          {typeIcons[incident.type]}
        </div>
        <div className="map-incident-card-content">
          <div className="map-incident-card-head">
            <span className="map-incident-id">{incident.id}</span>
            <StatusBadge status={incident.status} size="sm" pulse={incident.status === 'active'} />
          </div>
          <div className="map-incident-barangay">{incident.barangay}</div>
          <div className="map-incident-meta-row">
            <SeverityBadge severity={incident.severity} size="sm" />
            <span className="map-incident-time">
              {new Date(incident.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
          <div className="map-incident-coords">
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
    <div className={`map-view-root${isPublicCommunityMap ? ' map-view-root-public' : ''}`}>
      {panelOpen && (
        <div
          className="map-panel-backdrop"
          onClick={() => setPanelOpen(false)}
        />
      )}

      <div className={`map-panel${panelOpen ? ' panel-open' : ''}`}>
        <div className="map-panel-header">
          <div className="map-panel-header-row">
            <span className="map-panel-title">Active Incidents</span>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`map-filter-button${showFilters ? ' is-active' : ''}`}
            >
              <Filter size={12} color={showFilters ? '#1E3A8A' : '#94A3B8'} />
              <span className="map-filter-button-text">Filter</span>
            </button>
          </div>

          <div className="map-search-wrap">
            <Search size={13} color="#94A3B8" className="map-search-icon" />
            <input
              className="map-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID or barangay..."
              autoComplete="off"
            />
          </div>

          {showFilters && (
            <div className="map-filter-row">
              <select
                className="map-filter-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value as IncidentType | '')}
                title="Filter incidents by type"
                aria-label="Filter incidents by type"
              >
                <option value="">All Types</option>
                {Object.entries(incidentTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select
                className="map-filter-select"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as IncidentStatus | '')}
                title="Filter incidents by status"
                aria-label="Filter incidents by status"
              >
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="map-stats-bar">
          {[
            { label: 'Showing', value: filtered.length, colorClass: 'map-stat-neutral' },
            { label: 'Active', value: filtered.filter(i => i.status === 'active').length, colorClass: 'map-stat-alert' },
            { label: 'Responding', value: filtered.filter(i => i.status === 'responding').length, colorClass: 'map-stat-primary' },
          ].map(s => (
            <div key={s.label} className="map-stat-item">
              <div className={`map-stat-value ${s.colorClass}`}>{s.value}</div>
              <div className="map-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="map-osm-wrap">
          <div className="map-osm-badge">
            <Navigation2 size={10} color="#059669" />
            <span className="map-osm-badge-text">OpenStreetMap · Live Coordinates</span>
          </div>
        </div>

        <div className="map-incident-list">
          {error ? (
            <div className="map-list-state map-list-state-error">{error}</div>
          ) : loading ? (
            <div className="map-list-state">Loading incidents...</div>
          ) : filtered.length === 0 ? (
            <div className="map-list-state">No incidents match</div>
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

      <div className="map-area">
        <div className="map-header-bar">
          {isPublicCommunityMap && (
            <button
              onClick={handleBack}
              className="map-back-button"
            >
              <ArrowLeft size={14} color="#334155" />
              <span className="map-back-button-text">Back</span>
            </button>
          )}

          <button
            onClick={() => setPanelOpen(v => !v)}
            className="map-panel-toggle"
          >
            <Layers size={14} color="#1E3A8A" />
            <span className="map-panel-toggle-text">{panelOpen ? 'Hide' : 'Show'} Panel</span>
          </button>

          <div className="map-header-title">
            <span className="map-header-title-main">TUGON Incident Map</span>
            <span className="map-header-title-sub">Municipality of Tugon — OpenStreetMap</span>
          </div>

          <div className="map-mobile-title">
            <span className="map-mobile-title-text">Incident Map</span>
          </div>

          {selectedIncident && (
            <div className="map-live-coords">
              <Navigation2 size={11} color="#059669" />
              <span className="map-live-coords-text">
                {selectedIncident.lat.toFixed(4)}°N, {selectedIncident.lng.toFixed(4)}°E
              </span>
            </div>
          )}
        </div>

        <div className="map-canvas-wrap">
          <IncidentMap
            incidents={filtered}
            height="100%"
            selectedId={selectedIncident?.id ?? null}
            onSelectIncident={inc => setSelectedIncident(inc)}
            compact={false}
            zoom={15}
          />
        </div>

        {selectedIncident && (
          <div className="map-selected-wrap">
            <div className="map-selected-card">
              <div className="map-selected-header">
                <div className={`map-selected-type-icon map-incident-type-${selectedIncident.type}`}>
                  {typeIcons[selectedIncident.type]}
                </div>
                <div className="map-selected-header-main">
                  <div className="map-selected-id">{selectedIncident.id}</div>
                  <div className="map-selected-location">{selectedIncident.barangay}, {selectedIncident.district}</div>
                </div>
                <div className="map-selected-header-actions">
                  <StatusBadge status={selectedIncident.status} size="sm" pulse={selectedIncident.status === 'active'} />
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="map-selected-close"
                    title="Close selected incident panel"
                    aria-label="Close selected incident panel"
                  >
                    <X size={14} color="white" />
                  </button>
                </div>
              </div>

              <div className="map-selected-body">
                <p className="map-selected-description">{selectedIncident.description}</p>

                <div className="map-selected-coords">
                  <Navigation2 size={12} color="#059669" />
                  <span className="map-selected-coords-main">
                    {selectedIncident.lat.toFixed(6)}°N, {selectedIncident.lng.toFixed(6)}°E
                  </span>
                  <span className="map-selected-coords-copy">© OpenStreetMap contributors</span>
                </div>

                <div className="map-selected-badges">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <TypeBadge type={selectedIncident.type} />
                  <span className="map-selected-responders">
                    <Users size={11} /> {selectedIncident.responders} units
                  </span>
                </div>

                <div className="map-selected-actions">
                  <button className="map-selected-action-primary">Dispatch Response</button>
                  <button className="map-selected-action-secondary">Full Report</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
