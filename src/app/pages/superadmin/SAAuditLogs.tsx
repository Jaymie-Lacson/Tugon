import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Filter, RefreshCw, X } from 'lucide-react';
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
    <div className="p-5 bg-[#F0F4FF] min-h-full">
      <div className="sa-audit-header flex items-center justify-between mb-3.5 gap-2.5">
        <div>
          <h1 className="text-slate-950 text-[22px] font-bold m-0">Admin Audit Logs</h1>
          <p className="text-gray-500 text-xs m-0 mt-0.5">
            Immutable action history for Super Admin operations
          </p>
        </div>
        <button
          onClick={() => {
            void loadLogs();
          }}
          className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3.5 py-2 cursor-pointer text-gray-700 text-xs font-semibold"
        >
          <RefreshCw size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-[10px] px-3 py-2.5 text-xs">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="bg-white border border-gray-200 rounded-[10px] px-3 py-2.5">
          <div className="text-gray-400 text-[10px] font-bold tracking-[0.06em] uppercase">Total Entries</div>
          <div className="text-slate-950 text-2xl font-bold mt-0.5">{logs.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] px-3 py-2.5">
          <div className="text-gray-400 text-[10px] font-bold tracking-[0.06em] uppercase">Actions Seen</div>
          <div className="text-slate-950 text-2xl font-bold mt-0.5">{Object.keys(actionCounts).length}</div>
        </div>
      </div>

      <div className="sa-audit-filter-bar flex items-center gap-2 mb-3 flex-wrap bg-white border border-gray-200 rounded-[10px] px-3 py-2.5">
        <Filter size={13} color="#6B7280" />
        <select
          title="Filter by action"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="px-2.5 py-[7px] border border-gray-200 rounded-lg text-xs text-gray-700"
        >
          {ACTIONS.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select
          title="Filter by target type"
          value={targetFilter}
          onChange={(event) => setTargetFilter(event.target.value)}
          className="px-2.5 py-[7px] border border-gray-200 rounded-lg text-xs text-gray-700"
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
          className="px-2.5 py-[7px] border border-gray-200 rounded-lg text-xs text-gray-700"
        />
        <input
          title="Filter to date"
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="px-2.5 py-[7px] border border-gray-200 rounded-lg text-xs text-gray-700"
        />
        <button
          onClick={() => applyDatePreset(1)}
          className="border border-gray-200 rounded-lg px-2.5 py-[7px] bg-white text-slate-700 text-xs font-semibold cursor-pointer"
        >
          Today
        </button>
        <button
          onClick={() => applyDatePreset(7)}
          className="border border-gray-200 rounded-lg px-2.5 py-[7px] bg-white text-slate-700 text-xs font-semibold cursor-pointer"
        >
          Last 7 Days
        </button>
        <button
          onClick={() => applyDatePreset(30)}
          className="border border-gray-200 rounded-lg px-2.5 py-[7px] bg-white text-slate-700 text-xs font-semibold cursor-pointer"
        >
          Last 30 Days
        </button>
        <button
          onClick={clearDatePreset}
          className="border border-gray-200 rounded-lg px-2.5 py-[7px] bg-white text-slate-700 text-xs font-semibold cursor-pointer"
        >
          Clear Dates
        </button>
        <button
          onClick={() => {
            void handleExportJson();
          }}
          disabled={!canExport || exportingJson || exportingCsv}
          className="ml-auto border border-gray-200 rounded-lg px-2.5 py-[7px] bg-white text-gray-700 text-xs font-semibold"
          style={{
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
          className="border border-gray-200 rounded-lg px-2.5 py-[7px] bg-white text-gray-700 text-xs font-semibold"
          style={{
            cursor: canExport && !exportingJson && !exportingCsv ? 'pointer' : 'not-allowed',
            opacity: canExport && !exportingJson && !exportingCsv ? 1 : 0.6,
          }}
        >
          {exportingCsv ? 'Exporting CSV...' : 'Export CSV'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                {['Timestamp', 'Action', 'Target', 'Target Label', 'Actor User ID', 'Details'].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-gray-500 text-[10px] font-bold tracking-[0.06em] uppercase whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    {loading ? 'Loading audit logs...' : 'No audit logs found for current filters.'}
                  </td>
                </tr>
              ) : logs.map((log, index) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="cursor-pointer hover:bg-slate-50"
                  style={{ borderBottom: index < logs.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-[5px] px-2 py-[3px] rounded-[14px] bg-blue-100 text-primary font-bold text-[10px]">
                      <Activity size={10} /> {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 font-semibold">{log.targetType}</td>
                  <td className="px-3 py-2.5 text-slate-700">{log.targetLabel ?? 'N/A'}</td>
                  <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{log.actorUserId}</td>
                  <td className="px-3 py-2.5 text-slate-600 font-mono text-[10px] max-w-[420px]">
                    <div className="max-h-[88px] overflow-auto whitespace-pre-wrap break-words">
                      {log.details ? JSON.stringify(log.details, null, 2) : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sa-audit-pagination flex items-center justify-between px-3 py-2.5 border-t border-gray-100 bg-[#FAFAFA] text-xs">
          <span className="text-slate-500">
            Showing {pageStart} to {pageEnd} of {total} logs
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="border border-gray-200 rounded-[7px] px-2.5 py-1.5 bg-white text-slate-700 text-xs font-semibold"
              style={{ cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.6 : 1 }}
            >
              Prev
            </button>
            <span className="text-slate-600 self-center">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="border border-gray-200 rounded-[7px] px-2.5 py-1.5 bg-white text-slate-700 text-xs font-semibold"
              style={{ cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.6 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog ? (
        <div
          onClick={() => setSelectedLog(null)}
          className="fixed inset-0 bg-slate-900/45 z-[120] flex justify-end"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-[min(560px,100vw)] h-full bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.2)] flex flex-col"
          >
            <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-slate-950 text-base font-bold">Audit Event Details</div>
                <div className="text-slate-500 text-[11px]">{formatDateTime(selectedLog.createdAt)}</div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="border-0 bg-transparent cursor-pointer text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid gap-3">
              <div className="bg-slate-50 border border-gray-200 rounded-[10px] px-3 py-2.5">
                <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase">Action</div>
                <div className="text-slate-950 text-sm font-bold">{selectedLog.action}</div>
              </div>
              <div className="bg-slate-50 border border-gray-200 rounded-[10px] px-3 py-2.5">
                <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase">Target</div>
                <div className="text-slate-950 text-sm font-bold">{selectedLog.targetType}</div>
                <div className="text-slate-600 text-xs mt-0.5">Label: {selectedLog.targetLabel ?? 'N/A'}</div>
                <div className="text-slate-600 text-xs">ID: {selectedLog.targetId ?? 'N/A'}</div>
              </div>
              <div className="bg-slate-50 border border-gray-200 rounded-[10px] px-3 py-2.5">
                <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase">Actor</div>
                <div className="text-slate-700 font-mono text-xs">{selectedLog.actorUserId}</div>
              </div>
              <div className="bg-slate-950 rounded-[10px] px-3 py-2.5">
                <div className="text-slate-400 text-[10px] font-bold tracking-[0.06em] uppercase mb-2">Details JSON</div>
                <pre className="m-0 text-slate-200 font-mono text-[11px] whitespace-pre-wrap break-words">
                  {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 768px) {
          .sa-audit-header {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .sa-audit-header button {
            width: 100%;
            justify-content: center;
            min-height: 40px;
          }

          .sa-audit-filter-bar {
            flex-direction: column;
            align-items: stretch !important;
          }

          .sa-audit-filter-bar button,
          .sa-audit-filter-bar select,
          .sa-audit-filter-bar input {
            width: 100%;
            margin-left: 0 !important;
          }

          .sa-audit-pagination {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
