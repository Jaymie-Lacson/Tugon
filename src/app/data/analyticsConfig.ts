import type { IncidentType } from './incidents';

export const ANALYTICS_PERIODS = ['Today', 'This Week', 'This Month', 'This Quarter'] as const;

export const ANALYTICS_PERIOD_DAYS: Record<(typeof ANALYTICS_PERIODS)[number], number> = {
  Today: 1,
  'This Week': 7,
  'This Month': 30,
  'This Quarter': 90,
};

export const ANALYTICS_TYPE_ORDER: IncidentType[] = [
  'flood',
  'accident',
  'medical',
  'crime',
  'infrastructure',
];

export const ANALYTICS_TYPE_LABELS: Record<IncidentType, string> = {
  flood: 'Pollution',
  accident: 'Road Hazard',
  medical: 'Noise',
  crime: 'Crime',
  infrastructure: 'Other',
  typhoon: 'Other',
};

export const ANALYTICS_TYPE_COLORS: Record<IncidentType, string> = {
  flood: '#1D4ED8',
  accident: 'var(--severity-medium)',
  medical: '#0F766E',
  crime: '#7C3AED',
  infrastructure: '#374151',
  typhoon: '#0369A1',
};

export const ANALYTICS_RESPONSE_TARGETS: Record<IncidentType, number> = {
  flood: 15,
  accident: 10,
  medical: 8,
  crime: 10,
  infrastructure: 20,
  typhoon: 25,
};

export const ANALYTICS_TREND_SERIES = [
  { key: 'flood', label: 'Pollution', color: '#1D4ED8' },
  { key: 'accident', label: 'Road Hazard', color: 'var(--severity-medium)' },
  { key: 'medical', label: 'Noise', color: '#0F766E' },
  { key: 'crime', label: 'Crime', color: '#7C3AED' },
  { key: 'infrastructure', label: 'Other', color: '#374151' },
] as const;

export const ANALYTICS_SEVERITY_SERIES = [
  { name: 'Critical', color: 'var(--severity-critical)' },
  { name: 'High', color: '#EA580C' },
  { name: 'Medium', color: 'var(--severity-medium)' },
  { name: 'Low', color: '#059669' },
] as const;

export const ANALYTICS_HOURLY_BANDS = {
  high: 10,
  medium: 7,
  highColor: 'var(--severity-critical)',
  mediumColor: 'var(--severity-medium)',
  baseColor: 'var(--primary)',
} as const;

export const ANALYTICS_UTILIZATION_BANDS = {
  high: 80,
  medium: 60,
  highColor: 'var(--severity-critical)',
  mediumColor: 'var(--severity-medium)',
  baseColor: '#059669',
} as const;

export const ANALYTICS_BARANGAY_BAR_COLORS = {
  incidents: 'var(--primary)',
  resolved: '#059669',
  active: 'var(--severity-critical)',
} as const;
