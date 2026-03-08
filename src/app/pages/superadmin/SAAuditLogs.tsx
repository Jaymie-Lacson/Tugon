import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Filter, RefreshCw, X } from 'lucide-react';
import { superAdminApi, type ApiAdminAuditLog } from '../../services/superAdminApi';

const ACTIONS = ['All Actions', 'ADMIN_USER_CREATED', 'ADMIN_USER_ROLE_UPDATED', 'ADMIN_BARANGAY_BOUNDARY_UPDATED'] as const;
const TARGET_TYPES = ['All Targets', 'USER', 'BARANGAY'] as const;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toCsv(logs: ApiAdminAuditLog[]) {
  const header = ['timestamp', 'action', 'targetType', 'targetId', 'targetLabel', 'actorUserId', 'details'];
  const rows = logs.map((log) => [
    log.createdAt,
    log.action,
    log.targetType,
    log.targetId ?? '',
    log.targetLabel ?? '',
    log.actorUserId,
    log.details ? JSON.stringify(log.details) : '',
  ]);

  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(','))
    .join('\n');
}

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function toIsoStartOfDay(dateValue: string) {
  return `${dateValue}T00:00:00.000Z`;
}

function toIsoEndOfDay(dateValue: string) {
  return `${dateValue}T23:59:59.999Z`;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function SAAuditLogs() {
  const [logs, setLogs] = useState<ApiAdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('All Actions');
  const [targetFilter, setTargetFilter] = useState<string>('All Targets');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ApiAdminAuditLog | null>(null);

  const PAGE_SIZE = 50;

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await superAdminApi.getAuditLogs({
        action: actionFilter === 'All Actions' ? undefined : actionFilter,
        targetType: targetFilter === 'All Targets' ? undefined : targetFilter,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        fromDate: fromDate ? toIsoStartOfDay(fromDate) : undefined,
        toDate: toDate ? toIsoEndOfDay(toDate) : undefined,
      });
      setLogs(payload.logs);
      setTotal(payload.total);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load audit logs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [actionFilter, targetFilter, fromDate, toDate, page]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, targetFilter, fromDate, toDate]);

  const actionCounts = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.action] = (acc[log.action] ?? 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canExport = logs.length > 0;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const buildExportFilterInput = () => ({
    action: actionFilter === 'All Actions' ? undefined : actionFilter,
    targetType: targetFilter === 'All Targets' ? undefined : targetFilter,
    fromDate: fromDate ? toIsoStartOfDay(fromDate) : undefined,
    toDate: toDate ? toIsoEndOfDay(toDate) : undefined,
  });

  const handleExportJson = async () => {
    if (!canExport || exportingJson) {
      return;
    }
    setExportingJson(true);
    try {
      const payload = await superAdminApi.exportAuditLogs(buildExportFilterInput());
      downloadFile(
        `tugon-audit-logs-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json;charset=utf-8',
        JSON.stringify(payload.logs, null, 2),
      );
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    if (!canExport || exportingCsv) {
      return;
    }
    setExportingCsv(true);
    try {
      const payload = await superAdminApi.exportAuditLogs(buildExportFilterInput());
      downloadFile(
        `tugon-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
        'text/csv;charset=utf-8',
        toCsv(payload.logs),
      );
    } finally {
      setExportingCsv(false);
    }
  };

  const applyDatePreset = (days: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));
    setFromDate(formatDateInput(start));
    setToDate(formatDateInput(now));
  };

  const clearDatePreset = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div style={{ padding: 20, background: '#F0F4FF', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ color: '#0F172A', fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Audit Logs</h1>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0, marginTop: 2 }}>
            Immutable action history for Super Admin operations
          </p>
        </div>
        <button
          onClick={() => {
            void loadLogs();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
            color: '#374151',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <RefreshCw size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total Entries</div>
          <div style={{ color: '#0F172A', fontSize: 24, fontWeight: 700, marginTop: 2 }}>{logs.length}</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Actions Seen</div>
          <div style={{ color: '#0F172A', fontSize: 24, fontWeight: 700, marginTop: 2 }}>{Object.keys(actionCounts).length}</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '10px 12px',
      }}>
        <Filter size={13} color="#6B7280" />
        <select
          title="Filter by action"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, color: '#374151' }}
        >
          {ACTIONS.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select
          title="Filter by target type"
          value={targetFilter}
          onChange={(event) => setTargetFilter(event.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, color: '#374151' }}
        >
          {TARGET_TYPES.map((target) => (
            <option key={target} value={target}>{target}</option>
          ))}
        </select>
        <input
          title="Filter from date"
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, color: '#374151' }}
        />
        <input
          title="Filter to date"
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, color: '#374151' }}
        />
        <button
          onClick={() => applyDatePreset(1)}
          style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', background: 'white', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Today
        </button>
        <button
          onClick={() => applyDatePreset(7)}
          style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', background: 'white', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => applyDatePreset(30)}
          style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', background: 'white', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Last 30 Days
        </button>
        <button
          onClick={clearDatePreset}
          style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', background: 'white', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Clear Dates
        </button>
        <button
          onClick={() => {
            void handleExportJson();
          }}
          disabled={!canExport || exportingJson || exportingCsv}
          style={{
            marginLeft: 'auto',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '7px 10px',
            background: 'white',
            color: '#374151',
            fontSize: 12,
            fontWeight: 600,
            cursor: canExport && !exportingJson && !exportingCsv ? 'pointer' : 'not-allowed',
            opacity: canExport && !exportingJson && !exportingCsv ? 1 : 0.6,
          }}
        >
          {exportingJson ? 'Exporting JSON...' : 'Export JSON'}
        </button>
        <button
          onClick={() => {
            void handleExportCsv();
          }}
          disabled={!canExport || exportingJson || exportingCsv}
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '7px 10px',
            background: 'white',
            color: '#374151',
            fontSize: 12,
            fontWeight: 600,
            cursor: canExport && !exportingJson && !exportingCsv ? 'pointer' : 'not-allowed',
            opacity: canExport && !exportingJson && !exportingCsv ? 1 : 0.6,
          }}
        >
          {exportingCsv ? 'Exporting CSV...' : 'Export CSV'}
        </button>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                {['Timestamp', 'Action', 'Target', 'Target Label', 'Actor User ID', 'Details'].map((header) => (
                  <th
                    key={header}
                    style={{ padding: '10px 12px', textAlign: 'left', color: '#6B7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
                    {loading ? 'Loading audit logs...' : 'No audit logs found for current filters.'}
                  </td>
                </tr>
              ) : logs.map((log, index) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  style={{ borderBottom: index < logs.length - 1 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer' }}
                >
                  <td style={{ padding: '10px 12px', color: '#334155', whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 14, background: '#DBEAFE', color: '#1E3A8A', fontWeight: 700, fontSize: 10 }}>
                      <Activity size={10} /> {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{log.targetType}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{log.targetLabel ?? 'N/A'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B', fontFamily: 'monospace', fontSize: 11 }}>{log.actorUserId}</td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace', fontSize: 10, maxWidth: 420 }}>
                    <div style={{ maxHeight: 88, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {log.details ? JSON.stringify(log.details, null, 2) : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderTop: '1px solid #F3F4F6',
          background: '#FAFAFA',
          fontSize: 12,
        }}>
          <span style={{ color: '#64748B' }}>
            Showing {pageStart} to {pageEnd} of {total} logs
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 7,
                padding: '6px 10px',
                background: 'white',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.6 : 1,
              }}
            >
              Prev
            </button>
            <span style={{ color: '#475569', alignSelf: 'center' }}>Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 7,
                padding: '6px 10px',
                background: 'white',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.6 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog ? (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 120,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(560px, 100vw)',
              height: '100%',
              background: 'white',
              boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#0F172A', fontSize: 16, fontWeight: 700 }}>Audit Event Details</div>
                <div style={{ color: '#64748B', fontSize: 11 }}>{formatDateTime(selectedLog.createdAt)}</div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', display: 'grid', gap: 12 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Action</div>
                <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700 }}>{selectedLog.action}</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Target</div>
                <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700 }}>{selectedLog.targetType}</div>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>Label: {selectedLog.targetLabel ?? 'N/A'}</div>
                <div style={{ color: '#475569', fontSize: 12 }}>ID: {selectedLog.targetId ?? 'N/A'}</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Actor</div>
                <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 12 }}>{selectedLog.actorUserId}</div>
              </div>
              <div style={{ background: '#0F172A', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Details JSON</div>
                <pre style={{ margin: 0, color: '#E2E8F0', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
