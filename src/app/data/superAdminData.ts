// Super Admin Mock Data — TUGON System
// Municipality of Tugon — fictional centre ≈ 14.2055°N, 121.1540°E (Region IV-A / CALABARZON)

export interface BarangayProfile {
  id: string;
  name: string;
  captain: string;
  population: number;
  area: string;
  district: string;
  color: string;
  activeIncidents: number;
  totalThisMonth: number;
  resolvedThisMonth: number;
  responseRate: number;
  avgResponseMin: number;
  responders: number;
  registeredUsers: number;
  alertLevel: 'normal' | 'elevated' | 'critical';
  // SVG polygon points (legacy — kept for analytics tab)
  coordinates: string;
  labelX: number;
  labelY: number;
  // GeoJSON-style polygon for Leaflet [[lat,lng],...]
  boundary: [number, number][];
  center: [number, number];
}

export interface SAUser {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: 'Super Admin' | 'Barangay Admin' | 'MDRRMO Officer' | 'Responder' | 'Viewer';
  barangay: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  avatarColor: string;
}

export interface SystemLog {
  id: number;
  timestamp: string;
  type: 'login' | 'incident' | 'alert' | 'system' | 'user';
  message: string;
  barangay?: string;
  user?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

// ─── Barangay profiles ───────────────────────────────────────────────────────
export const barangays: BarangayProfile[] = [
  {
    id: 'brgy251',
    name: 'Barangay 251',
    captain: 'Jose Dela Cruz',
    population: 12_450,
    area: '0.42 km²',
    district: 'District IV-A North',
    color: '#1D4ED8',
    activeIncidents: 8,
    totalThisMonth: 34,
    resolvedThisMonth: 26,
    responseRate: 87,
    avgResponseMin: 8.3,
    responders: 18,
    registeredUsers: 42,
    alertLevel: 'elevated',
    // Legacy SVG coords
    coordinates: '52,85 175,52 248,72 258,128 225,162 178,177 122,168 62,142',
    labelX: 148, labelY: 116,
    // Real Leaflet polygon (NW quadrant of Tugon)
    boundary: [
      [14.2115, 121.1420],
      [14.2130, 121.1480],
      [14.2120, 121.1545],
      [14.2095, 121.1555],
      [14.2078, 121.1538],
      [14.2075, 121.1470],
      [14.2090, 121.1430],
    ],
    center: [14.2103, 121.1488],
  },
  {
    id: 'brgy252',
    name: 'Barangay 252',
    captain: 'Maria Santos',
    population: 15_230,
    area: '0.38 km²',
    district: 'District IV-A Central',
    color: '#0F766E',
    activeIncidents: 12,
    totalThisMonth: 47,
    resolvedThisMonth: 35,
    responseRate: 91,
    avgResponseMin: 6.7,
    responders: 24,
    registeredUsers: 56,
    alertLevel: 'critical',
    coordinates: '248,72 368,52 425,88 418,158 375,192 315,208 258,190 225,162 258,128',
    labelX: 330, labelY: 120,
    // NE quadrant
    boundary: [
      [14.2120, 121.1545],
      [14.2130, 121.1480],
      [14.2135, 121.1615],
      [14.2110, 121.1660],
      [14.2080, 121.1650],
      [14.2058, 121.1620],
      [14.2060, 121.1560],
      [14.2078, 121.1538],
      [14.2095, 121.1555],
    ],
    center: [14.2097, 121.1590],
  },
  {
    id: 'brgy256',
    name: 'Barangay 256',
    captain: 'Ricardo Reyes',
    population: 9_870,
    area: '0.55 km²',
    district: 'District IV-A South',
    color: '#B4730A',
    activeIncidents: 5,
    totalThisMonth: 28,
    resolvedThisMonth: 23,
    responseRate: 94,
    avgResponseMin: 11.2,
    responders: 14,
    registeredUsers: 31,
    alertLevel: 'normal',
    coordinates: '88,178 122,168 178,177 225,162 258,190 315,208 375,192 395,232 362,305 282,328 198,322 128,298 78,252',
    labelX: 230, labelY: 255,
    // South quadrant
    boundary: [
      [14.2078, 121.1538],
      [14.2060, 121.1560],
      [14.2058, 121.1620],
      [14.2038, 121.1640],
      [14.2008, 121.1618],
      [14.1992, 121.1570],
      [14.1998, 121.1500],
      [14.2035, 121.1468],
      [14.2062, 121.1468],
      [14.2075, 121.1470],
    ],
    center: [14.2032, 121.1562],
  },
];

// ─── Incident markers on the Leaflet map ────────────────────────────────────
export const mapIncidents = [
  { id: 1,  lat: 14.2092, lng: 121.1465, type: 'fire',     severity: 'critical', barangay: 'Brgy 251', label: 'Structure Fire' },
  { id: 2,  lat: 14.2108, lng: 121.1510, type: 'flood',    severity: 'high',     barangay: 'Brgy 251', label: 'Flash Flood' },
  { id: 3,  lat: 14.2080, lng: 121.1490, type: 'crime',    severity: 'high',     barangay: 'Brgy 251', label: 'Armed Robbery' },
  { id: 4,  lat: 14.2115, lng: 121.1572, type: 'fire',     severity: 'critical', barangay: 'Brgy 252', label: 'Bldg. Fire' },
  { id: 5,  lat: 14.2098, lng: 121.1610, type: 'accident', severity: 'high',     barangay: 'Brgy 252', label: 'MVA' },
  { id: 6,  lat: 14.2068, lng: 121.1588, type: 'medical',  severity: 'critical', barangay: 'Brgy 252', label: 'Mass Casualty' },
  { id: 7,  lat: 14.2090, lng: 121.1640, type: 'flood',    severity: 'high',     barangay: 'Brgy 252', label: 'Road Flooding' },
  { id: 8,  lat: 14.2042, lng: 121.1555, type: 'accident', severity: 'medium',   barangay: 'Brgy 256', label: 'Collision' },
  { id: 9,  lat: 14.2025, lng: 121.1600, type: 'flood',    severity: 'high',     barangay: 'Brgy 256', label: 'Creek Overflow' },
  { id: 10, lat: 14.2018, lng: 121.1528, type: 'fire',     severity: 'medium',   barangay: 'Brgy 256', label: 'Grass Fire' },
];

// ─── Heatmap circle data for Leaflet ────────────────────────────────────────
export const heatCircles = [
  { lat: 14.2092, lng: 121.1465, radius: 120, color: '#B91C1C', opacity: 0.28 },
  { lat: 14.2108, lng: 121.1510, radius: 90,  color: '#B91C1C', opacity: 0.22 },
  { lat: 14.2080, lng: 121.1490, radius: 70,  color: '#B4730A', opacity: 0.18 },
  { lat: 14.2115, lng: 121.1572, radius: 140, color: '#B91C1C', opacity: 0.32 },
  { lat: 14.2098, lng: 121.1610, radius: 100, color: '#B91C1C', opacity: 0.25 },
  { lat: 14.2068, lng: 121.1588, radius: 80,  color: '#B4730A', opacity: 0.20 },
  { lat: 14.2090, lng: 121.1640, radius: 70,  color: '#1D4ED8', opacity: 0.18 },
  { lat: 14.2042, lng: 121.1555, radius: 90,  color: '#B91C1C', opacity: 0.22 },
  { lat: 14.2025, lng: 121.1600, radius: 80,  color: '#1D4ED8', opacity: 0.18 },
  { lat: 14.2018, lng: 121.1528, radius: 65,  color: '#B4730A', opacity: 0.16 },
];

// ─── Legacy SVG heatmap cells (Analytics page only) ─────────────────────────
export const heatmapCells: { x: number; y: number; r: number; opacity: number; color: string }[] = [
  { x: 120, y: 100, r: 38, opacity: 0.55, color: '#B91C1C' },
  { x: 175, y: 130, r: 28, opacity: 0.42, color: '#B91C1C' },
  { x: 95,  y: 135, r: 22, opacity: 0.35, color: '#B4730A' },
  { x: 145, y: 155, r: 18, opacity: 0.28, color: '#1D4ED8' },
  { x: 310, y: 95,  r: 45, opacity: 0.65, color: '#B91C1C' },
  { x: 360, y: 130, r: 32, opacity: 0.48, color: '#B91C1C' },
  { x: 278, y: 158, r: 26, opacity: 0.38, color: '#B4730A' },
  { x: 395, y: 105, r: 20, opacity: 0.30, color: '#1D4ED8' },
  { x: 335, y: 175, r: 18, opacity: 0.28, color: '#7C3AED' },
  { x: 195, y: 255, r: 30, opacity: 0.42, color: '#B91C1C' },
  { x: 280, y: 278, r: 25, opacity: 0.35, color: '#1D4ED8' },
  { x: 148, y: 240, r: 20, opacity: 0.30, color: '#B4730A' },
  { x: 330, y: 250, r: 18, opacity: 0.26, color: '#0F766E' },
];

// ─── Weekly trend ────────────────────────────────────────────────────────────
export const weeklyTrend = [
  { day: 'Feb 28', brgy251: 4, brgy252: 6, brgy256: 3 },
  { day: 'Mar 1',  brgy251: 5, brgy252: 7, brgy256: 4 },
  { day: 'Mar 2',  brgy251: 6, brgy252: 8, brgy256: 5 },
  { day: 'Mar 3',  brgy251: 3, brgy252: 9, brgy256: 2 },
  { day: 'Mar 4',  brgy251: 7, brgy252: 10, brgy256: 6 },
  { day: 'Mar 5',  brgy251: 6, brgy252: 8, brgy256: 4 },
  { day: 'Mar 6',  brgy251: 3, brgy252: 5, brgy256: 2 },
];

export const monthlyTrend = [
  { month: 'Oct', brgy251: 21, brgy252: 29, brgy256: 15 },
  { month: 'Nov', brgy251: 25, brgy252: 33, brgy256: 18 },
  { month: 'Dec', brgy251: 18, brgy252: 24, brgy256: 12 },
  { month: 'Jan', brgy251: 28, brgy252: 35, brgy256: 22 },
  { month: 'Feb', brgy251: 32, brgy252: 41, brgy256: 19 },
  { month: 'Mar', brgy251: 34, brgy252: 47, brgy256: 28 },
];

export const responseTimeData = [
  { day: 'Mon', brgy251: 9.2, brgy252: 7.1, brgy256: 12.3, target: 10 },
  { day: 'Tue', brgy251: 8.7, brgy252: 6.5, brgy256: 11.8, target: 10 },
  { day: 'Wed', brgy251: 7.9, brgy252: 6.9, brgy256: 10.5, target: 10 },
  { day: 'Thu', brgy251: 8.5, brgy252: 7.3, brgy256: 11.2, target: 10 },
  { day: 'Fri', brgy251: 9.1, brgy252: 6.4, brgy256: 12.1, target: 10 },
  { day: 'Sat', brgy251: 7.8, brgy252: 5.8, brgy256: 9.8,  target: 10 },
  { day: 'Sun', brgy251: 7.2, brgy252: 5.2, brgy256: 9.4,  target: 10 },
];

export const incidentTypeDist = [
  { type: 'Fire',   brgy251: 8,  brgy252: 12, brgy256: 5,  color: '#B91C1C' },
  { type: 'Flood',  brgy251: 10, brgy252: 14, brgy256: 9,  color: '#1D4ED8' },
  { type: 'Accident', brgy251: 6, brgy252: 9, brgy256: 4,  color: '#B4730A' },
  { type: 'Medical',  brgy251: 5, brgy252: 7, brgy256: 6,  color: '#0F766E' },
  { type: 'Crime',    brgy251: 3, brgy252: 4, brgy256: 2,  color: '#7C3AED' },
  { type: 'Infra.',   brgy251: 2, brgy252: 1, brgy256: 2,  color: '#374151' },
];

// ─── Users ───────────────────────────────────────────────────────────────────
export const saUsers: SAUser[] = [
  { id: 1,  name: 'Admin Rodriguez',       initials: 'AR', email: 'admin@tugon.gov.ph',          role: 'Super Admin',     barangay: 'All Barangays', status: 'active',    lastActive: '2026-03-06T06:45:00', avatarColor: '#7C3AED' },
  { id: 2,  name: 'Maria Santos',          initials: 'MS', email: 'm.santos@tugon.gov.ph',        role: 'Barangay Admin',  barangay: 'Brgy. 252',    status: 'active',    lastActive: '2026-03-06T06:30:00', avatarColor: '#0F766E' },
  { id: 3,  name: 'Jose Dela Cruz',        initials: 'JD', email: 'j.delacruz@tugon.gov.ph',      role: 'Barangay Admin',  barangay: 'Brgy. 251',    status: 'active',    lastActive: '2026-03-06T05:45:00', avatarColor: '#1D4ED8' },
  { id: 4,  name: 'Ricardo Reyes',         initials: 'RR', email: 'r.reyes@tugon.gov.ph',         role: 'Barangay Admin',  barangay: 'Brgy. 256',    status: 'active',    lastActive: '2026-03-06T04:20:00', avatarColor: '#B4730A' },
  { id: 5,  name: 'Ana Gonzales',          initials: 'AG', email: 'a.gonzales@tugon.gov.ph',      role: 'MDRRMO Officer',  barangay: 'Brgy. 251',    status: 'active',    lastActive: '2026-03-06T06:10:00', avatarColor: '#1D4ED8' },
  { id: 6,  name: 'Pedro Bautista',        initials: 'PB', email: 'p.bautista@tugon.gov.ph',      role: 'Responder',       barangay: 'Brgy. 252',    status: 'active',    lastActive: '2026-03-06T05:55:00', avatarColor: '#0F766E' },
  { id: 7,  name: 'Linda Cruz',            initials: 'LC', email: 'l.cruz@tugon.gov.ph',          role: 'Responder',       barangay: 'Brgy. 252',    status: 'inactive',  lastActive: '2026-03-05T20:30:00', avatarColor: '#0F766E' },
  { id: 8,  name: 'Roberto Tan',           initials: 'RT', email: 'r.tan@tugon.gov.ph',           role: 'MDRRMO Officer',  barangay: 'Brgy. 256',    status: 'active',    lastActive: '2026-03-06T06:00:00', avatarColor: '#B4730A' },
  { id: 9,  name: 'Carmen Flores',         initials: 'CF', email: 'c.flores@tugon.gov.ph',        role: 'Viewer',          barangay: 'Brgy. 251',    status: 'active',    lastActive: '2026-03-05T18:00:00', avatarColor: '#1D4ED8' },
  { id: 10, name: 'Dante Villanueva',      initials: 'DV', email: 'd.villanueva@tugon.gov.ph',    role: 'Responder',       barangay: 'Brgy. 256',    status: 'suspended', lastActive: '2026-03-04T11:30:00', avatarColor: '#B4730A' },
  { id: 11, name: 'Cristina Magtanggol',  initials: 'CM', email: 'c.magtanggol@tugon.gov.ph',    role: 'MDRRMO Officer',  barangay: 'Brgy. 252',    status: 'active',    lastActive: '2026-03-06T06:25:00', avatarColor: '#0F766E' },
  { id: 12, name: 'Manuel Espiritu',       initials: 'ME', email: 'm.espiritu@tugon.gov.ph',      role: 'Responder',       barangay: 'Brgy. 251',    status: 'active',    lastActive: '2026-03-06T05:30:00', avatarColor: '#1D4ED8' },
  { id: 13, name: 'Josefa Torres',         initials: 'JT', email: 'j.torres@tugon.gov.ph',        role: 'Viewer',          barangay: 'Brgy. 256',    status: 'active',    lastActive: '2026-03-05T22:45:00', avatarColor: '#B4730A' },
  { id: 14, name: 'Ernesto Villacorta',    initials: 'EV', email: 'e.villacorta@tugon.gov.ph',    role: 'Responder',       barangay: 'Brgy. 252',    status: 'active',    lastActive: '2026-03-06T04:50:00', avatarColor: '#0F766E' },
  { id: 15, name: 'Angelica Delos Santos', initials: 'AD', email: 'a.delossantos@tugon.gov.ph',   role: 'Viewer',          barangay: 'Brgy. 251',    status: 'inactive',  lastActive: '2026-03-03T09:15:00', avatarColor: '#1D4ED8' },
];

// ─── System logs ─────────────────────────────────────────────────────────────
export const systemLogs: SystemLog[] = [
  { id: 1,  timestamp: '2026-03-06T06:45:00', type: 'incident', message: 'New CRITICAL incident: Structure fire at Brgy 252, Purok 4', barangay: 'Brgy 252', severity: 'error' },
  { id: 2,  timestamp: '2026-03-06T06:32:00', type: 'user',     message: 'Admin login: Maria Santos (Brgy Admin – Brgy 252)', user: 'Maria Santos', severity: 'info' },
  { id: 3,  timestamp: '2026-03-06T06:28:00', type: 'alert',    message: 'Brgy 252 incident threshold exceeded – 12 active incidents', barangay: 'Brgy 252', severity: 'warning' },
  { id: 4,  timestamp: '2026-03-06T06:20:00', type: 'incident', message: 'Incident INC-2026-0304 resolved: Flash Flood (Brgy 251)', barangay: 'Brgy 251', severity: 'success' },
  { id: 5,  timestamp: '2026-03-06T06:10:00', type: 'user',     message: 'Admin login: Ana Gonzales (MDRRMO Officer – Brgy 251)', user: 'Ana Gonzales', severity: 'info' },
  { id: 6,  timestamp: '2026-03-06T06:00:00', type: 'incident', message: 'Responder dispatch: 3 units assigned to INC-2026-0307 (Brgy 252)', barangay: 'Brgy 252', severity: 'info' },
  { id: 7,  timestamp: '2026-03-06T05:50:00', type: 'system',   message: 'Automated backup completed successfully – DB snapshot saved', severity: 'success' },
  { id: 8,  timestamp: '2026-03-06T05:45:00', type: 'user',     message: 'Password reset request: Jose Dela Cruz (Brgy 251)', user: 'Jose Dela Cruz', severity: 'info' },
  { id: 9,  timestamp: '2026-03-06T05:30:00', type: 'alert',    message: 'Weather advisory: Moderate rainfall forecast for all barangays', severity: 'warning' },
  { id: 10, timestamp: '2026-03-06T05:15:00', type: 'incident', message: 'New HIGH incident: Creek overflow near Brgy 256 boundary', barangay: 'Brgy 256', severity: 'warning' },
];

export const systemStats = {
  totalIncidentsToday: 25,
  activeIncidents: 25,
  resolvedToday: 8,
  totalUsers: 15,
  activeUsers: 11,
  systemUptime: '99.87%',
  avgResponseTime: 8.7,
  totalBarangays: 3,
  incidentsTrend: +12.5,
  responseTimeTrend: -4.2,
};
