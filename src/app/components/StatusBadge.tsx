import React from 'react';
import { Severity, IncidentStatus, IncidentType, severityConfig, statusConfig, incidentTypeConfig } from '../data/incidents';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#DC2626',
  high: '#D97706',
  medium: '#D97706',
  low: '#16A34A',
};

const STATUS_DOT_COLORS: Record<IncidentStatus, string> = {
  active: '#DC2626',
  responding: '#2563EB',
  contained: '#D97706',
  resolved: '#16A34A',
};

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const color = SEVERITY_COLORS[severity] ?? '#64748B';
  const label = severityConfig[severity]?.label ?? severity;
  return (
    <span
      className="inline-block font-mono text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap"
      style={{ color }}
    >
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  const dotColor = STATUS_DOT_COLORS[status] ?? '#94A3B8';
  const config = statusConfig[status];
  const isActive = status === 'active' || status === 'responding';
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {isActive && pulse ? (
        <span className="relative inline-flex size-[7px] shrink-0">
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-50"
            style={{ backgroundColor: dotColor }}
          />
          <span className="relative size-[7px] rounded-full" style={{ backgroundColor: dotColor }} />
        </span>
      ) : (
        <span className="inline-block size-[7px] shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      )}
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: dotColor }}
      >
        {config?.label ?? status}
      </span>
    </span>
  );
}

interface TypeBadgeProps {
  type: IncidentType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const config = incidentTypeConfig[type];
  return (
    <span
      className="inline-block text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap"
      style={{ color: config?.color ?? '#475569' }}
    >
      {getCategoryLabelForIncidentType(type)}
    </span>
  );
}
