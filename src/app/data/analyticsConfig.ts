import type { IncidentType } from './incidents';

export const ANALYTICS_PERIODS = ['Today', 'This Week', 'This Month', 'This Quarter'] as const;

export const ANALYTICS_PERIOD_DAYS: Record<(typeof ANALYTICS_PERIODS)[number], number> = {
  Today: 1,
  'This Week': 7,
  'This Month': 30,
  'This Quarter': 90,
};

export const ANALYTICS_TYPE_ORDER: IncidentType[] = [
  'fire',
  'flood',
  'accident',
  'medical',
  'crime',
  'infrastructure',
];

export const ANALYTICS_TYPE_LABELS: Record<IncidentType, string> = {
  fire: 'Fire',
  flood: 'Flood',
  accident: 'Accident',
  medical: 'Medical',
  crime: 'Crime',
  infrastructure: 'Infra.',
  typhoon: 'Typhoon',
};

export const ANALYTICS_TYPE_COLORS: Record<IncidentType, string> = {
  fire: '#B91C1C',
  flood: '#1D4ED8',
  accident: '#B4730A',
  medical: '#0F766E',
  crime: '#7C3AED',
  infrastructure: '#374151',
  typhoon: '#0369A1',
};

export const ANALYTICS_RESPONSE_TARGETS: Record<IncidentType, number> = {
  fire: 8,
  flood: 15,
  accident: 10,
  medical: 8,
  crime: 10,
  infrastructure: 20,
  typhoon: 25,
};

export const ANALYTICS_TREND_SERIES = [
  { key: 'fire', label: 'Fire', color: '#B91C1C' },
  { key: 'flood', label: 'Flood', color: '#1D4ED8' },
  { key: 'accident', label: 'Accident', color: '#B4730A' },
  { key: 'medical', label: 'Medical', color: '#0F766E' },
  { key: 'crime', label: 'Crime', color: '#7C3AED' },
  { key: 'infrastructure', label: 'Infra.', color: '#374151' },
] as const;

export const ANALYTICS_SEVERITY_SERIES = [
  { name: 'Critical', color: '#B91C1C' },
  { name: 'High', color: '#EA580C' },
  { name: 'Medium', color: '#B4730A' },
  { name: 'Low', color: '#059669' },
] as const;

export const ANALYTICS_HOURLY_BANDS = {
  high: 10,
  medium: 7,
  highColor: '#B91C1C',
  mediumColor: '#B4730A',
  baseColor: '#1E3A8A',
} as const;

export const ANALYTICS_UTILIZATION_BANDS = {
  high: 80,
  medium: 60,
  highColor: '#B91C1C',
  mediumColor: '#B4730A',
  baseColor: '#059669',
} as const;

export const ANALYTICS_BARANGAY_BAR_COLORS = {
  incidents: '#1E3A8A',
  resolved: '#059669',
  active: '#B91C1C',
} as const;
