import React from 'react';
import { Severity, IncidentStatus, IncidentType, severityConfig, statusConfig, incidentTypeConfig } from '../data/incidents';
import { getCategoryLabelForIncidentType } from '../utils/mapCategoryLabels';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const padding = size === 'sm' ? '2px 6px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';
  return (
    <span
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        padding,
        borderRadius: '4px',
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: size === 'sm' ? 5 : 6,
          height: size === 'sm' ? 5 : 6,
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
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
  const padding = size === 'sm' ? '2px 6px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';
  const isActive = status === 'active' || status === 'responding';
  return (
    <span
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        padding,
        borderRadius: '4px',
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {isActive && pulse ? (
        <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: config.color,
              opacity: 0.4,
              animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
          <span
            style={{
              position: 'relative',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: config.color,
            }}
          />
        </span>
      ) : (
        <span
          style={{
            width: size === 'sm' ? 5 : 6,
            height: size === 'sm' ? 5 : 6,
            borderRadius: '50%',
            backgroundColor: config.color,
            display: 'inline-block',
            flexShrink: 0,
          }}
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
  const padding = size === 'sm' ? '2px 6px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';
  return (
    <span
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        padding,
        borderRadius: '4px',
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {getCategoryLabelForIncidentType(type)}
    </span>
  );
}
