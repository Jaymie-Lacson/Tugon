import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Incident, incidentTypeConfig } from '../data/incidents';

// ── Leaflet default-icon fix for Vite bundler ──────────────────────────────
// Vite mangles asset paths, so we use DivIcon for all markers instead.

const TYPE_COLORS: Record<string, string> = {
  fire:           '#B91C1C',
  flood:          '#1D4ED8',
  accident:       '#B4730A',
  medical:        '#0F766E',
  crime:          '#7C3AED',
  infrastructure: '#374151',
  typhoon:        '#0369A1',
};

const TYPE_EMOJI: Record<string, string> = {
  fire: '🔥', flood: '💧', accident: '🚗',
  medical: '❤️', crime: '🔒', infrastructure: '⚡', typhoon: '🌀',
};

function makeIncidentIcon(incident: Incident, selected: boolean, hovered: boolean): L.DivIcon {
  const color  = incident.status === 'resolved'
    ? '#9CA3AF'
    : (TYPE_COLORS[incident.type] ?? '#374151');
  const isCritical = incident.severity === 'critical' && incident.status !== 'resolved';
  const isActive   = incident.status === 'active' || incident.status === 'responding';
  const size       = selected || hovered ? 38 : (isCritical ? 34 : 30);
  const pulse      = isActive && isCritical;

  const html = `
    <div style="
      position:relative;
      width:${size}px;
      height:${size + 8}px;
      display:flex;
      flex-direction:column;
      align-items:center;
    ">
      ${pulse ? `
        <div style="
          position:absolute;
          top:0; left:0; right:0; bottom:8px;
          border-radius:50%;
          background:${color};
          opacity:0.2;
          animation:tugon-ping 1.8s ease-out infinite;
        "></div>` : ''}
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${color};
        border:${selected ? '3px solid white' : '2px solid rgba(255,255,255,0.85)'};
        box-shadow:${selected ? `0 0 0 3px ${color}, 0 4px 12px rgba(0,0,0,0.35)` : '0 2px 8px rgba(0,0,0,0.28)'};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:${size * 0.44}px;
        cursor:pointer;
        transition:all 0.15s;
        position:relative;
      ">
        ${TYPE_EMOJI[incident.type] ?? '📍'}
      </div>
      <div style="
        width:0; height:0;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-top:8px solid ${color};
        margin-top:-1px;
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize:   [size, size + 8],
    iconAnchor: [size / 2, size + 8],
  });
}

// ── Map-pan helper when selected changes ──────────────────────────────────
function MapPanner({ incident }: { incident: Incident | null }) {
  const map = useMap();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (incident && incident.id !== prev.current) {
      map.panTo([incident.lat, incident.lng], { animate: true });
      prev.current = incident.id;
    }
  }, [incident, map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────
export interface IncidentMapProps {
  incidents: Incident[];
  height?: number | string;
  selectedId?: string | null;
  onSelectIncident?: (incident: Incident | null) => void;
  compact?: boolean;
  zoom?: number;
}

const TUGON_CENTER: [number, number] = [14.2055, 121.1540];

export function IncidentMap({
  incidents,
  height = 380,
  selectedId = null,
  onSelectIncident,
  compact = false,
  zoom = 15,
}: IncidentMapProps) {
  // Sort: critical first so they render on top
  const sorted = [...incidents].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[b.severity] ?? 3) - (order[a.severity] ?? 3);
  });

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer
        center={TUGON_CENTER}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={!compact}
        attributionControl={true}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Auto-pan when selected changes */}
        <MapPanner incident={incidents.find(i => i.id === selectedId) ?? null} />

        {/* Soft glow circles for active incidents */}
        {sorted
          .filter(inc => inc.status === 'active' || inc.status === 'responding')
          .map(inc => (
            <Circle
              key={`glow-${inc.id}`}
              center={[inc.lat, inc.lng]}
              radius={inc.severity === 'critical' ? 80 : 55}
              pathOptions={{
                color: TYPE_COLORS[inc.type] ?? '#374151',
                fillColor: TYPE_COLORS[inc.type] ?? '#374151',
                fillOpacity: 0.12,
                weight: 1,
                opacity: 0.4,
              }}
            />
          ))}

        {/* Incident markers */}
        {sorted.map(inc => {
          const selected = inc.id === selectedId;
          const icon = makeIncidentIcon(inc, selected, false);
          return (
            <Marker
              key={inc.id}
              position={[inc.lat, inc.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectIncident?.(selected ? null : inc),
              }}
              zIndexOffset={selected ? 1000 : inc.severity === 'critical' ? 500 : 0}
            >
              {!compact && (
                <Tooltip
                  direction="top"
                  offset={[0, -30]}
                  opacity={1}
                  permanent={false}
                >
                  <div style={{ fontSize: 12, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 2 }}>{inc.id}</div>
                    <div style={{ color: '#475569', marginBottom: 2 }}>{inc.barangay}</div>
                    <div style={{ color: TYPE_COLORS[inc.type], fontWeight: 600, textTransform: 'capitalize' }}>
                      {inc.type} · {inc.severity}
                    </div>
                  </div>
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend — only when not compact */}
      {!compact && (
        <div style={{
          position: 'absolute',
          bottom: 28,
          right: 10,
          zIndex: 1000,
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          minWidth: 115,
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 5, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incident Types</div>
          {Object.entries(incidentTypeConfig).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{ fontSize: 11 }}>{TYPE_EMOJI[key]}</span>
              <span style={{ color: '#475569', fontSize: 9 }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 5, borderTop: '1px solid #E2E8F0', paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9CA3AF', display: 'inline-block' }} />
              <span style={{ color: '#94A3B8', fontSize: 9 }}>Resolved</span>
            </div>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes tugon-ping {
          0%   { transform: scale(1);   opacity: 0.22; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
