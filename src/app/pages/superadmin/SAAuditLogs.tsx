import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Filter, RefreshCw, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import CardSkeleton from '../../components/ui/CardSkeleton';
import TableSkeleton from '../../components/ui/TableSkeleton';
import TextSkeleton from '../../components/ui/TextSkeleton';
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
  const { t } = useTranslation();
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
  const exportButtonsDisabled = !canExport || exportingJson || exportingCsv;
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

  if (loading && logs.length === 0) {
    return (
      <div className="p-5 min-h-full">
        <TextSkeleton rows={2} title={false} />
        <div className="mt-3">
          <CardSkeleton
            count={2}
            lines={2}
            showImage={false}
            gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2"
          />
        </div>
        <div className="mt-3">
          <TableSkeleton rows={8} columns={5} showHeader />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-[var(--surface)] min-h-full">
      <div className="flex flex-col items-start justify-between mb-3.5 gap-2.5 md:flex-row md:items-center">
        <div>
          <h1 className="text-[var(--on-surface)] text-[22px] font-bold m-0">{t('superadmin.auditLogs.pageTitle')}</h1>
          <p className="text-[var(--on-surface-variant)] text-xs m-0 mt-0.5">
            {t('superadmin.auditLogs.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            void loadLogs();
          }}
          className="flex w-full justify-center items-center gap-1.5 bg-white border border-[var(--outline-variant)] px-3.5 py-2 cursor-pointer text-[var(--on-surface-variant)] text-xs font-semibold md:w-auto"
        >
          <RefreshCw size={13} /> {loading ? t('common.refreshing') : t('common.refresh')}
        </button>
      </div>

      {error ? (
        <div className="mb-3 border-l-4 border-[#DC2626] bg-white px-3 py-2.5 text-[#DC2626] text-xs font-semibold">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-0 border-l border-t border-slate-200 mb-3">
        <div className="bg-white border-r border-b border-slate-200 px-3 py-2.5" style={{ borderLeft: '3px solid #0F172A' }}>
          <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase">{t('superadmin.auditLogs.totalEntries')}</div>
          <div className="text-[#0F172A] text-2xl font-bold font-mono mt-0.5">{logs.length}</div>
        </div>
        <div className="bg-white border-r border-b border-slate-200" style={{ borderLeft: '3px solid #2563EB' }}>
          <div className="px-3 py-2.5">
          <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase">{t('superadmin.auditLogs.actionsSeen')}</div>
          <div className="text-[#0F172A] text-2xl font-bold font-mono mt-0.5">{Object.keys(actionCounts).length}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-2 mb-3 bg-white border border-slate-200 px-3 py-2.5 md:flex-row md:items-center md:flex-wrap">
        <Filter size={13} className="text-[var(--outline)]" />
        <select
          title="Filter by action"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="w-full md:w-auto px-2.5 py-[7px] border border-[var(--outline-variant)] text-xs text-[var(--on-surface-variant)]"
        >
          {ACTIONS.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select
          title="Filter by target type"
          value={targetFilter}
          onChange={(event) => setTargetFilter(event.target.value)}
          className="w-full md:w-auto px-2.5 py-[7px] border border-[var(--outline-variant)] text-xs text-[var(--on-surface-variant)]"
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
          className="w-full md:w-auto px-2.5 py-[7px] border border-[var(--outline-variant)] text-xs text-[var(--on-surface-variant)]"
        />
        <input
          title="Filter to date"
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="w-full md:w-auto px-2.5 py-[7px] border border-[var(--outline-variant)] text-xs text-[var(--on-surface-variant)]"
        />
        <button
          onClick={() => applyDatePreset(1)}
          className="w-full md:w-auto border border-[var(--outline-variant)] px-2.5 py-[7px] bg-white text-[var(--on-surface-variant)] text-xs font-semibold cursor-pointer"
        >
          {t('superadmin.auditLogs.today')}
        </button>
        <button
          onClick={() => applyDatePreset(7)}
          className="w-full md:w-auto border border-[var(--outline-variant)] px-2.5 py-[7px] bg-white text-[var(--on-surface-variant)] text-xs font-semibold cursor-pointer"
        >
          {t('superadmin.auditLogs.last7Days')}
        </button>
        <button
          onClick={() => applyDatePreset(30)}
          className="w-full md:w-auto border border-[var(--outline-variant)] px-2.5 py-[7px] bg-white text-[var(--on-surface-variant)] text-xs font-semibold cursor-pointer"
        >
          {t('superadmin.auditLogs.last30Days')}
        </button>
        <button
          onClick={clearDatePreset}
          className="w-full md:w-auto border border-[var(--outline-variant)] px-2.5 py-[7px] bg-white text-[var(--on-surface-variant)] text-xs font-semibold cursor-pointer"
        >
          {t('superadmin.auditLogs.clearDates')}
        </button>
        <button
          onClick={() => {
            void handleExportJson();
          }}
          disabled={exportButtonsDisabled}
          className={`w-full md:w-auto md:ml-auto border border-[var(--outline-variant)] px-2.5 py-[7px] bg-white text-[var(--on-surface-variant)] text-xs font-semibold ${exportButtonsDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'}`}
        >
          {exportingJson ? t('superadmin.auditLogs.exportingJson') : t('superadmin.auditLogs.exportJson')}
        </button>
        <button
          onClick={() => {
            void handleExportCsv();
          }}
          disabled={exportButtonsDisabled}
          className={`w-full md:w-auto border border-[var(--outline-variant)] px-2.5 py-[7px] bg-white text-[var(--on-surface-variant)] text-xs font-semibold ${exportButtonsDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'}`}
        >
          {exportingCsv ? t('superadmin.auditLogs.exportingCsv') : t('superadmin.auditLogs.exportCsv')}
        </button>
      </div>

      <div className="bg-white border border-[var(--outline-variant)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-[var(--outline-variant)]">
                {[t('superadmin.auditLogs.timestamp'), t('superadmin.auditLogs.action'), t('superadmin.auditLogs.target'), t('superadmin.auditLogs.targetLabel'), t('superadmin.auditLogs.actorUserId'), t('superadmin.auditLogs.details')].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-[var(--outline)] text-[10px] font-bold tracking-[0.06em] uppercase whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--outline)]">
                    {loading ? t('superadmin.auditLogs.loadingLogs') : t('superadmin.auditLogs.noLogsFiltered')}
                  </td>
                </tr>
              ) : logs.map((log, index) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`cursor-pointer hover:bg-surface-container-low ${index < logs.length - 1 ? 'border-b border-[var(--outline-variant)]' : ''}`}
                >
                  <td className="px-3 py-2.5 text-[var(--on-surface-variant)] whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-[5px] px-2 py-[3px] rounded-[14px] bg-[var(--primary-fixed)] text-primary font-bold text-[10px]">
                      <Activity size={10} /> {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--on-surface-variant)] font-semibold">{log.targetType}</td>
                  <td className="px-3 py-2.5 text-[var(--on-surface-variant)]">{log.targetLabel ?? 'N/A'}</td>
                  <td className="px-3 py-2.5 text-[var(--outline)] font-mono text-[11px]">{log.actorUserId}</td>
                  <td className="px-3 py-2.5 text-[var(--on-surface-variant)] font-mono text-[10px] max-w-[420px]">
                    <div className="max-h-[88px] overflow-auto whitespace-pre-wrap break-words">
                      {log.details ? JSON.stringify(log.details, null, 2) : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-start gap-2 px-3 py-2.5 border-t border-[var(--outline-variant)] bg-surface-container-low text-xs md:flex-row md:items-center md:justify-between">
          <span className="text-[var(--outline)]">
            {t('superadmin.auditLogs.showingRange', { start: pageStart, end: pageEnd, total })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className={`border border-[var(--outline-variant)] rounded-[7px] px-2.5 py-1.5 bg-white text-[var(--on-surface-variant)] text-xs font-semibold ${page === 1 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'}`}
            >
              {t('superadmin.auditLogs.prev')}
            </button>
            <span className="text-[var(--on-surface-variant)] self-center">{t('superadmin.auditLogs.page', { page, total: totalPages })}</span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className={`border border-[var(--outline-variant)] rounded-[7px] px-2.5 py-1.5 bg-white text-[var(--on-surface-variant)] text-xs font-semibold ${page >= totalPages ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'}`}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      </div>

      {selectedLog ? (
        <div
          onClick={() => setSelectedLog(null)}
          className="fixed inset-0 bg-[rgba(13,28,46,0.45)] z-[120] flex justify-end"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-[min(560px,100vw)] h-full bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.2)] flex flex-col"
          >
            <div className="px-4 py-3.5 border-b border-[var(--outline-variant)] flex items-center justify-between">
              <div>
                <div className="text-[var(--on-surface)] text-base font-bold">{t('superadmin.auditLogs.eventDetails')}</div>
                <div className="text-[var(--outline)] text-[11px]">{formatDateTime(selectedLog.createdAt)}</div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                aria-label={t('common.close')}
                title={t('common.close')}
                className="border-0 bg-transparent cursor-pointer text-[var(--outline)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid gap-3">
              <div className="bg-surface-container-low border border-[var(--outline-variant)] rounded-[10px] px-3 py-2.5">
                <div className="text-[var(--outline)] text-[10px] font-bold tracking-[0.06em] uppercase">{t('superadmin.auditLogs.action')}</div>
                <div className="text-[var(--on-surface)] text-sm font-bold">{selectedLog.action}</div>
              </div>
              <div className="bg-surface-container-low border border-[var(--outline-variant)] rounded-[10px] px-3 py-2.5">
                <div className="text-[var(--outline)] text-[10px] font-bold tracking-[0.06em] uppercase">{t('superadmin.auditLogs.target')}</div>
                <div className="text-[var(--on-surface)] text-sm font-bold">{selectedLog.targetType}</div>
                <div className="text-[var(--on-surface-variant)] text-xs mt-0.5">{t('superadmin.auditLogs.labelField', { value: selectedLog.targetLabel ?? 'N/A' })}</div>
                <div className="text-[var(--on-surface-variant)] text-xs">{t('superadmin.auditLogs.idField', { value: selectedLog.targetId ?? 'N/A' })}</div>
              </div>
              <div className="bg-surface-container-low border border-[var(--outline-variant)] rounded-[10px] px-3 py-2.5">
                <div className="text-[var(--outline)] text-[10px] font-bold tracking-[0.06em] uppercase">{t('superadmin.auditLogs.actor')}</div>
                <div className="text-[var(--on-surface-variant)] font-mono text-xs">{selectedLog.actorUserId}</div>
              </div>
              <div className="bg-slate-950 rounded-[10px] px-3 py-2.5">
                <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase mb-2">{t('superadmin.auditLogs.detailsJson')}</div>
                <pre className="m-0 text-slate-200 font-mono text-[11px] whitespace-pre-wrap break-words">
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
