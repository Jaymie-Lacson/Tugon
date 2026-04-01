import React, { useEffect, useState } from 'react';
import {
  Layers, Search, X,
  Droplets, Car, Heart, Shield as ShieldIcon, Zap, Wind,
  Navigation2, ArrowLeft, TrendingUp, SlidersHorizontal,
} from 'lucide-react';
import { Incident, IncidentType, IncidentStatus, incidentTypeConfig, isIncidentVisibleOnMap, statusConfig } from '../data/incidents';
import { useLocation, useNavigate } from 'react-router';
import { HeatmapClusterOverlay, IncidentMap } from '../components/IncidentMap';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';
import CardSkeleton from '../components/ui/CardSkeleton';
import TextSkeleton from '../components/ui/TextSkeleton';
import TableSkeleton from '../components/ui/TableSkeleton';
import { officialReportsApi } from '../services/officialReportsApi';
import { reportToIncident } from '../utils/incidentAdapters';
import '../../styles/map-view.css';

const typeIcons: Record<IncidentType, React.ReactNode> = {
  flood: <Droplets size={14} />, accident: <Car size={14} />,
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
  const [heatmapClusters, setHeatmapClusters] = useState<HeatmapClusterOverlay[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [mapRenderMode, setMapRenderMode] = useState<'hotspot' | 'standard'>('hotspot')
  const [showHeatmapTuning, setShowHeatmapTuning] = useState(false);
  const [heatRadiusPercent, setHeatRadiusPercent] = useState(85);
  const [heatOpacityPercent, setHeatOpacityPercent] = useState(100);
  const [hasHotspotAutoSelected, setHasHotspotAutoSelected] = useState(false);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isPublicCommunityMap = location.pathname === '/community-map';
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showSelectedDetail, setShowSelectedDetail] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<IncidentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>('');
  const [panelOpen, setPanelOpen] = useState(
    typeof window !== 'undefined' ? (!isPublicCommunityMap && window.innerWidth > 768) : !isPublicCommunityMap,
  );
  const [showPublicLoginModal, setShowPublicLoginModal] = useState(isPublicCommunityMap);

  useEffect(() => {
    if (isPublicCommunityMap) {
      setPanelOpen(false);
      setShowPublicLoginModal(true);
      return;
    }

    setPanelOpen(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  }, [isPublicCommunityMap]);

  const loadReports = React.useCallback(async (silent = false) => {
    if (isPublicCommunityMap) {
      setIncidents([]);
      setHeatmapClusters([]);
      setMapRenderMode('standard');
      setLoading(false);
      setError(null);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const payload = await officialReportsApi.getReports();
      const mapped = payload.reports.map((report) => reportToIncident(report));
      setIncidents(mapped);
      setSelectedIncident((current) => {
        if (!current) {
          return current;
        }
        return mapped.find((incident) => incident.id === current.id) ?? null;
      });
    } catch (loadError) {
      if (!silent) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load incidents.';
        setError(message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isPublicCommunityMap]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const loadHeatmap = React.useCallback(async (silent = false) => {
    if (isPublicCommunityMap) {
      setHeatmapClusters([]);
      setHeatmapLoading(false);
      setHeatmapError(null);
      return;
    }

    if (!silent) {
      setHeatmapLoading(true);
    }
    setHeatmapError(null);
    try {
      const payload = await officialReportsApi.getHeatmap({ days: 14, threshold: 3 });
      const overlays: HeatmapClusterOverlay[] = payload.clusters.map((cluster) => ({
        id: cluster.clusterId,
        latitude: cluster.centerLatitude,
        longitude: cluster.centerLongitude,
        intensity: cluster.intensity,
        incidentCount: cluster.incidentCount,
        incidentType: cluster.category,
      }));
      setHeatmapClusters(overlays);
    } catch (loadError) {
      if (!silent) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load hotspot clusters.';
        setHeatmapError(message);
      }
      setHeatmapClusters([]);
    } finally {
      if (!silent) {
        setHeatmapLoading(false);
      }
    }
  }, [isPublicCommunityMap]);

  useEffect(() => {
    void loadHeatmap();
  }, [loadHeatmap]);

  useEffect(() => {
    if (isPublicCommunityMap) {
      return;
    }

    const disconnect = officialReportsApi.connectReportsStream(() => {
      void loadReports(true);
      void loadHeatmap(true);
    });

    return () => {
      disconnect();
    };
  }, [isPublicCommunityMap, loadHeatmap, loadReports]);

  useEffect(() => {
    if (isPublicCommunityMap) {
      return;
    }

    if (!heatmapLoading && heatmapClusters.length === 0 && mapRenderMode === 'hotspot') {
      setMapRenderMode('standard');
    }
  }, [heatmapClusters.length, heatmapLoading, isPublicCommunityMap, mapRenderMode]);

  useEffect(() => {
    if (!initialLoadPending) {
      return;
    }

    if (!loading) {
      setInitialLoadPending(false);
    }
  }, [initialLoadPending, loading]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const handleOpenStatusUpdate = () => {
    if (!selectedIncident) {
      return;
    }

    navigate('/app/incidents', {
      state: { reportId: selectedIncident.id },
    });
  };

  const handleOpenFullReport = () => {
    if (!selectedIncident) {
      return;
    }

    navigate('/app/incidents', {
      state: { reportId: selectedIncident.id },
    });
  };

  const mapIncidents = React.useMemo(() => incidents.filter((incident) => isIncidentVisibleOnMap(incident)), [incidents]);

  const filtered = mapIncidents.filter(inc => {
    if (filterType && inc.type !== filterType) return false;
    if (filterStatus && inc.status !== filterStatus) return false;
    const q = search.toLowerCase();
    if (search && !inc.id.toLowerCase().includes(q) && !inc.barangay.toLowerCase().includes(q)) return false;
    return true;
  });

  useEffect(() => {
    if (!selectedIncident) {
      return;
    }

    const stillVisible = filtered.some((incident) => incident.id === selectedIncident.id);
    if (!stillVisible) {
      setSelectedIncident(null);
      setShowSelectedDetail(false);
    }
  }, [filtered, selectedIncident]);

  useEffect(() => {
    if (isPublicCommunityMap || mapRenderMode !== 'hotspot' || selectedIncident) {
      return;
    }

    if (hasHotspotAutoSelected) {
      return;
    }

    if (filtered.length > 0) {
      setSelectedIncident(filtered[0]);
      setShowSelectedDetail(true);
      setHasHotspotAutoSelected(true);
    }
  }, [filtered, hasHotspotAutoSelected, isPublicCommunityMap, mapRenderMode, selectedIncident]);

  useEffect(() => {
    if (mapRenderMode !== 'hotspot') {
      setHasHotspotAutoSelected(false);
    }
  }, [mapRenderMode]);

  const coverageSubtitle = React.useMemo(() => {
    const barangays = [...new Set(mapIncidents.map((incident) => incident.barangay).filter(Boolean))];
    if (barangays.length === 0) {
      return 'Barangay Coverage: Awaiting live incident data';
    }
    return `Barangay Coverage: ${barangays.join(' • ')} — OpenStreetMap`;
  }, [mapIncidents]);

  const handleResetHeatmapTuning = () => {
    setHeatRadiusPercent(85);
    setHeatOpacityPercent(100);
  };

  if (initialLoadPending) {
    return (
      <div className="min-h-full px-4 py-3.5">
        <CardSkeleton
          count={3}
          lines={2}
          showImage={false}
          gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        />
        <div className="mt-4">
          <TextSkeleton rows={3} title={false} />
        </div>
        <div className="mt-4">
          <TableSkeleton rows={6} columns={3} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div className={`map-view-root${isPublicCommunityMap ? ' map-view-root-public' : ''}`}>
      {!isPublicCommunityMap && panelOpen && (
        <div
          className="map-panel-backdrop"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {!isPublicCommunityMap && (
      <div className={`map-panel${panelOpen ? ' panel-open' : ''}`}>
        <div className="map-panel-header">
          <div className="map-panel-header-row">
            <span className="map-panel-title">Open Incidents</span>
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
              {Object.entries(statusConfig)
                .filter(([k]) => k !== 'resolved')
                .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
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
            <TableSkeleton rows={6} columns={2} showHeader={false} className="border-0 bg-transparent" />
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
      )}

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

          {!isPublicCommunityMap && (
            <button
              onClick={() => setPanelOpen(v => !v)}
              className="map-panel-toggle"
            >
              <Layers size={14} color="var(--primary)" />
              <span className="map-panel-toggle-text">{panelOpen ? 'Hide' : 'Show'} Panel</span>
            </button>
          )}

          <div className="map-header-title">
            <span className="map-header-title-main">TUGON Incident Map</span>
            <span className="map-header-title-sub">{coverageSubtitle}</span>
          </div>

          {!isPublicCommunityMap && (
            <div className="map-mode-toggle" role="group" aria-label="Map display mode">
              <button
                className={`map-mode-button${mapRenderMode === 'hotspot' ? ' is-active' : ''}`}
                onClick={() => setMapRenderMode('hotspot')}
                disabled={heatmapLoading || heatmapClusters.length === 0}
                title={heatmapClusters.length === 0 ? 'No hotspot cluster reached the threshold' : 'Show threshold-based hotspot view'}
              >
                <TrendingUp size={12} /> Hotspot
              </button>
              <button
                className={`map-mode-button${mapRenderMode === 'standard' ? ' is-active' : ''}`}
                onClick={() => setMapRenderMode('standard')}
                title="Show incident marker view"
              >
                <Layers size={12} /> Incidents
              </button>
              <button
                className="map-mode-button"
                onClick={() => {
                  setShowHeatmapTuning((current) => !current);
                  setMapRenderMode('hotspot');
                }}
                title="Tune hotspot radius and opacity"
              >
                <SlidersHorizontal size={12} /> Tune
              </button>
            </div>
          )}

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
          {!isPublicCommunityMap && showHeatmapTuning && (
            <div
              className="absolute right-3 top-14 z-[1200] w-[230px] rounded-xl border border-blue-100 bg-white/[0.98] p-3 shadow-[0_6px_24px_rgba(15,23,42,.16)]"
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-800">Heatmap Settings</span>
                <button
                  onClick={handleResetHeatmapTuning}
                  className="rounded-md border border-slate-300 bg-white px-1.5 py-[3px] text-[10px] font-bold text-slate-500 cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="mb-2.5">
                <div className="mb-1 flex justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Radius</span>
                  <span className="text-[10px] font-bold text-slate-800">{heatRadiusPercent}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={heatRadiusPercent}
                  onChange={(event) => setHeatRadiusPercent(Number(event.target.value))}
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label="Heatmap radius"
                  className="w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Opacity</span>
                  <span className="text-[10px] font-bold text-slate-800">{heatOpacityPercent}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={120}
                  step={1}
                  value={heatOpacityPercent}
                  onChange={(event) => setHeatOpacityPercent(Number(event.target.value))}
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label="Heatmap opacity"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {!isPublicCommunityMap && heatmapError && (
            <div className="map-heatmap-error-banner" role="status">
              {heatmapError}
            </div>
          )}
          <IncidentMap
            incidents={filtered}
            height="100%"
            selectedId={selectedIncident?.id ?? null}
            onSelectIncident={inc => {
              setSelectedIncident(inc);
              setShowSelectedDetail(Boolean(inc));
            }}
            compact={isPublicCommunityMap}
            zoom={18}
            heatmapClusters={heatmapClusters}
            renderMode={isPublicCommunityMap ? 'standard' : mapRenderMode}
            heatmapRadiusPercent={heatRadiusPercent}
            heatmapOpacityPercent={heatOpacityPercent}
            viewportKey={isPublicCommunityMap ? 'public-map' : (panelOpen ? 'official-panel-open' : 'official-panel-closed')}
          />
        </div>

        {isPublicCommunityMap && showPublicLoginModal && (
          <div className="map-public-login-modal-wrap" role="dialog" aria-modal="false" aria-labelledby="public-map-login-title">
            <div className="map-public-login-modal">
              <div className="map-public-login-modal-title" id="public-map-login-title">Login Required for Past Incidents</div>
              <p className="map-public-login-modal-copy">
                To view past reported incidents and their details, please log in to your TUGON account.
              </p>
              <div className="map-public-login-modal-actions">
                <button className="map-public-login-modal-secondary" onClick={() => setShowPublicLoginModal(false)}>
                  Close
                </button>
                <button className="map-public-login-modal-primary" onClick={() => navigate('/auth/login')}>
                  Log In
                </button>
              </div>
            </div>
          </div>
        )}

        {!isPublicCommunityMap && selectedIncident && showSelectedDetail && (
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
                    onClick={() => setShowSelectedDetail(false)}
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
                </div>

                <div className="map-selected-actions">
                  <button
                    className="map-selected-action-primary"
                    onClick={handleOpenStatusUpdate}
                  >
                    Update Status
                  </button>
                  <button
                    className="map-selected-action-secondary"
                    onClick={handleOpenFullReport}
                  >
                    Full Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
