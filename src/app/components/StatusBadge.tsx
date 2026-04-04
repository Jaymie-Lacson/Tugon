import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Severity, IncidentStatus, IncidentType, severityConfig, statusConfig, incidentTypeConfig } from '../data/incidents';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';

const severityIcons: Record<Severity, React.ReactNode> = {
  critical: <AlertTriangle size={11} />,
  high: <AlertCircle size={11} />,
  medium: <Info size={11} />,
  low: <CheckCircle size={11} />,
};

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const isSmall = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-sm)] font-semibold uppercase tracking-wider ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-[3px] text-[11px]'}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {severityIcons[severity]}
      <span
        className={`inline-block shrink-0 rounded-full ${isSmall ? 'size-[5px]' : 'size-1.5'}`}
        style={{ backgroundColor: config.dotColor }}
      />
      {config.label}
    </span>
  );
}

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function StatusBadge({ status, size = 'md', pulse = false }: StatusBadgeProps) {
  const config = statusConfig[status];
  const isSmall = size === 'sm';
  const isActive = status === 'active' || status === 'responding';
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-sm)] font-semibold uppercase tracking-wider ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-[3px] text-[11px]'}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {isActive && pulse ? (
        <span className="relative inline-flex size-2 shrink-0">
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-40"
            style={{ backgroundColor: config.color }}
          />
          <span
            className="relative size-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
        </span>
      ) : (
        <span
          className={`inline-block shrink-0 rounded-full ${isSmall ? 'size-[5px]' : 'size-1.5'}`}
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}

interface TypeBadgeProps {
  type: IncidentType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const config = incidentTypeConfig[type];
  const isSmall = size === 'sm';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-[var(--radius-sm)] font-semibold uppercase tracking-wider ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-[3px] text-[11px]'}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {getCategoryLabelForIncidentType(type)}
    </span>
  );
}
