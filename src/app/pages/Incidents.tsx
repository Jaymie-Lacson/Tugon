import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Plus, Eye, Edit2, Printer, Download,
  ChevronDown, ChevronUp, ChevronsUpDown, X, AlertTriangle,
  Users, Clock, MapPin, Info, Flame, Droplets, Car, Heart, Shield as ShieldIcon, Zap, Wind,
} from 'lucide-react';
import {
  incidents, Incident, IncidentType, Severity, IncidentStatus,
  incidentTypeConfig, severityConfig, statusConfig
} from '../data/incidents';
import { StatusBadge, SeverityBadge, TypeBadge } from '../components/StatusBadge';

const typeIcons: Record<IncidentType, React.ReactNode> = {
  fire: <Flame size={14} />, flood: <Droplets size={14} />, accident: <Car size={14} />,
  medical: <Heart size={14} />, crime: <ShieldIcon size={14} />, infrastructure: <Zap size={14} />, typhoon: <Wind size={14} />,
};

function IncidentDetailModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const cfg = incidentTypeConfig[incident.type];
  const formatTime = (t?: string) => t ? new Date(t).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const responseTime = incident.respondedAt
    ? Math.round((new Date(incident.respondedAt).getTime() - new Date(incident.reportedAt).getTime()) / 60000)
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'white', borderRadius: 14, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ background: '#1E3A8A', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: '14px 14px 0 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: cfg.bgColor, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeIcons[incident.type]}
              </div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{incident.id}</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: 12 }}>{incident.location}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, padding: 8, cursor: 'pointer', color: 'white' }}>
            <X size={16} color="white" />
          </button>
        </div>

        {/* Badges */}
        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TypeBadge type={incident.type} />
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} pulse={incident.status === 'active'} />
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.6, background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              {incident.description}
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Barangay', value: incident.barangay, icon: <MapPin size={13} /> },
              { label: 'District', value: incident.district, icon: <Info size={13} /> },
              { label: 'Reported By', value: incident.reportedBy, icon: <Users size={13} /> },
              { label: 'Responders', value: `${incident.responders} units deployed`, icon: <Users size={13} /> },
              { label: 'Affected Persons', value: incident.affectedPersons !== undefined ? `${incident.affectedPersons} individuals` : 'Under assessment', icon: <AlertTriangle size={13} /> },
              { label: 'Response Time', value: responseTime ? `${responseTime} minutes` : 'Not yet responded', icon: <Clock size={13} /> },
            ].map(item => (
              <div key={item.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Incident Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Incident Reported', time: formatTime(incident.reportedAt), color: '#B91C1C', done: true },
                { label: 'Response Dispatched', time: formatTime(incident.respondedAt), color: '#1E3A8A', done: !!incident.respondedAt },
                { label: 'Situation Contained', time: incident.status === 'contained' || incident.status === 'resolved' ? formatTime(incident.respondedAt) : 'Pending', color: '#B4730A', done: incident.status === 'contained' || incident.status === 'resolved' },
                { label: 'Incident Resolved', time: formatTime(incident.resolvedAt), color: '#059669', done: incident.status === 'resolved' },
              ].map((step, idx) => (
                <div key={step.label} style={{ display: 'flex', gap: 12, paddingBottom: idx < 3 ? 12 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: step.done ? step.color : '#E2E8F0',
                      border: `2px solid ${step.done ? step.color : '#E2E8F0'}`,
                      flexShrink: 0,
                      marginTop: 2,
                    }} />
                    {idx < 3 && <div style={{ width: 1.5, flex: 1, background: step.done ? step.color : '#E2E8F0', minHeight: 16, marginTop: 2, opacity: 0.4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: step.done ? 600 : 400, color: step.done ? '#1E293B' : '#94A3B8' }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: step.done ? '#64748B' : '#CBD5E1' }}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={{ flex: 1, minWidth: 100, background: '#1E3A8A', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Edit2 size={13} /> Update Status
          </button>
          <button style={{ flex: 1, minWidth: 100, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Printer size={13} /> Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Incidents() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<IncidentType | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | ''>('');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>('');
  const [sortKey, setSortKey] = useState<keyof Incident>('reportedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    return incidents
      .filter(inc => {
        const q = search.toLowerCase();
        if (search && !inc.id.toLowerCase().includes(q) && !inc.barangay.toLowerCase().includes(q) && !inc.location.toLowerCase().includes(q) && !inc.description.toLowerCase().includes(q)) return false;
        if (filterType && inc.type !== filterType) return false;
        if (filterSeverity && inc.severity !== filterSeverity) return false;
        if (filterStatus && inc.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const va = String(a[sortKey] ?? '');
        const vb = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [search, filterType, filterSeverity, filterStatus, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleSort = (key: keyof Incident) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: keyof Incident }) => {
    if (sortKey !== k) return <ChevronsUpDown size={12} color="#CBD5E1" />;
    return sortDir === 'asc' ? <ChevronUp size={12} color="#1E3A8A" /> : <ChevronDown size={12} color="#1E3A8A" />;
  };

  const hasFilter = search || filterType || filterSeverity || filterStatus;

  return (
    <div style={{ padding: '14px 16px', minHeight: '100%' }}>
      {/* Page header */}
      <div className="incidents-page-header" style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#1E293B', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Incident Management</h1>
          <p style={{ color: '#64748B', fontSize: 12 }}>
            {filtered.length} incident{filtered.length !== 1 ? 's' : ''} found
            {hasFilter ? ' (filtered)' : ''} — Municipality of Tugon MDRRMO
          </p>
        </div>
        <button className="log-btn" style={{
          background: '#B91C1C', color: 'white', border: 'none', borderRadius: 10,
          padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, minHeight: 48,
        }}>
          <Plus size={16} /> Log New Incident
        </button>
      </div>

      {/* Filters */}
      <div className="incidents-filter-bar" style={{ background: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '2 1 200px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search incidents, barangays..."
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
              border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC',
              outline: 'none', boxSizing: 'border-box', color: '#1E293B',
            }}
          />
        </div>

        {/* Filter selects */}
        {[
          {
            label: 'All Types', value: filterType, setter: (v: string) => { setFilterType(v as IncidentType | ''); setPage(1); },
            options: Object.entries(incidentTypeConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
          {
            label: 'All Severity', value: filterSeverity, setter: (v: string) => { setFilterSeverity(v as Severity | ''); setPage(1); },
            options: Object.entries(severityConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
          {
            label: 'All Status', value: filterStatus, setter: (v: string) => { setFilterStatus(v as IncidentStatus | ''); setPage(1); },
            options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
          },
        ].map(f => (
          <select
            key={f.label}
            value={f.value}
            onChange={e => f.setter(e.target.value)}
            style={{
              flex: '1 1 130px', padding: '10px 10px', border: '1px solid #E2E8F0', borderRadius: 8,
              fontSize: 13, background: '#F8FAFC', color: f.value ? '#1E293B' : '#94A3B8',
              outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">{f.label}</option>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {hasFilter && (
          <button
            onClick={() => { setSearch(''); setFilterType(''); setFilterSeverity(''); setFilterStatus(''); setPage(1); }}
            style={{ background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
          >
            <X size={14} /> Clear
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'All', count: incidents.length, active: !filterStatus, onClick: () => setFilterStatus('') },
          { label: 'Active', count: incidents.filter(i => i.status === 'active').length, active: filterStatus === 'active', onClick: () => setFilterStatus('active') },
          { label: 'Responding', count: incidents.filter(i => i.status === 'responding').length, active: filterStatus === 'responding', onClick: () => setFilterStatus('responding') },
          { label: 'Contained', count: incidents.filter(i => i.status === 'contained').length, active: filterStatus === 'contained', onClick: () => setFilterStatus('contained') },
          { label: 'Resolved', count: incidents.filter(i => i.status === 'resolved').length, active: filterStatus === 'resolved', onClick: () => setFilterStatus('resolved') },
        ].map(chip => (
          <button
            key={chip.label}
            onClick={chip.onClick}
            style={{
              background: chip.active ? '#1E3A8A' : 'white',
              color: chip.active ? 'white' : '#475569',
              border: `1px solid ${chip.active ? '#1E3A8A' : '#E2E8F0'}`,
              borderRadius: 20, padding: '8px 16px', fontSize: 12,
              fontWeight: chip.active ? 600 : 400, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              minHeight: 40,
            }}
          >
            {chip.label}
            <span style={{
              background: chip.active ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
              color: chip.active ? 'white' : '#94A3B8',
              borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700,
            }}>{chip.count}</span>
          </button>
        ))}
      </div>

      {/* ── Desktop Table ── */}
      <div className="incidents-table-wrapper" style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {[
                  { key: 'id' as keyof Incident, label: 'Incident ID' },
                  { key: 'type' as keyof Incident, label: 'Type' },
                  { key: 'barangay' as keyof Incident, label: 'Location' },
                  { key: 'severity' as keyof Incident, label: 'Severity' },
                  { key: 'status' as keyof Incident, label: 'Status' },
                  { key: 'reportedAt' as keyof Incident, label: 'Reported' },
                  { key: 'responders' as keyof Incident, label: 'Responders' },
                  { key: null, label: 'Actions' },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key)}
                    style={{
                      padding: '11px 14px', textAlign: 'left',
                      color: sortKey === col.key ? '#1E3A8A' : '#64748B',
                      fontWeight: 600, fontSize: 11, letterSpacing: '0.04em',
                      borderBottom: '2px solid #F1F5F9',
                      cursor: col.key ? 'pointer' : 'default',
                      whiteSpace: 'nowrap', userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.key && <SortIcon k={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No incidents match your filters.
                  </td>
                </tr>
              ) : paginated.map((inc) => (
                <tr
                  key={inc.id}
                  style={{ borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap', fontSize: 12 }}>{inc.id}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: incidentTypeConfig[inc.type].color }}>{typeIcons[inc.type]}</span>
                      <TypeBadge type={inc.type} size="sm" />
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#1E293B', fontWeight: 500 }}>{inc.barangay}</div>
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>{inc.district}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><SeverityBadge severity={inc.severity} size="sm" /></td>
                  <td style={{ padding: '11px 14px' }}><StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} /></td>
                  <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                    {new Date(inc.reportedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} color="#94A3B8" />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{inc.responders}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        title="View details"
                        style={{ background: '#EFF6FF', color: '#1E3A8A', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600 }}
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        title="Edit"
                        style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#64748B', fontSize: 12 }}>
            Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length} incidents
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '7px 13px', borderRadius: 6, border: '1px solid #E2E8F0', background: page === 1 ? '#F8FAFC' : 'white', color: page === 1 ? '#CBD5E1' : '#475569', fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid', borderColor: page === p ? '#1E3A8A' : '#E2E8F0', background: page === p ? '#1E3A8A' : 'white', color: page === p ? 'white' : '#475569', fontSize: 12, cursor: 'pointer', fontWeight: page === p ? 700 : 400 }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '7px 13px', borderRadius: 6, border: '1px solid #E2E8F0', background: page === totalPages ? '#F8FAFC' : 'white', color: page === totalPages ? '#CBD5E1' : '#475569', fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 500 }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Card List ── */}
      <div className="incidents-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {paginated.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No incidents match your filters.
          </div>
        ) : paginated.map((inc) => (
          <div
            key={inc.id}
            style={{
              background: 'white', borderRadius: 14,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              overflow: 'hidden', borderLeft: `4px solid ${incidentTypeConfig[inc.type].color}`,
            }}
          >
            <div style={{ padding: '14px 16px' }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: incidentTypeConfig[inc.type].bgColor, color: incidentTypeConfig[inc.type].color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                    {typeIcons[inc.type]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: 13 }}>{inc.id}</div>
                    <div style={{ color: '#64748B', fontSize: 11 }}>{inc.district}</div>
                  </div>
                </div>
                <StatusBadge status={inc.status} size="sm" pulse={inc.status === 'active'} />
              </div>

              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <MapPin size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#475569' }}>{inc.barangay}</span>
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                {inc.description}
              </div>

              {/* Badges + meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <TypeBadge type={inc.type} size="sm" />
                <SeverityBadge severity={inc.severity} size="sm" />
                <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>
                  {new Date(inc.reportedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedIncident(inc)}
                  style={{ flex: 1, background: '#1E3A8A', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48 }}
                >
                  <Eye size={15} /> View Details
                </button>
                <button
                  style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 }}
                >
                  <Edit2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '4px 0' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E2E8F0', background: page === 1 ? '#F8FAFC' : 'white', color: page === 1 ? '#CBD5E1' : '#1E3A8A', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', minHeight: 48 }}
            >
              ← Prev
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#64748B', fontSize: 13 }}>
              {page} / {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E2E8F0', background: page === totalPages ? '#F8FAFC' : 'white', color: page === totalPages ? '#CBD5E1' : '#1E3A8A', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', minHeight: 48 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  );
}