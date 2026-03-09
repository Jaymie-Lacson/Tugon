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
  coordinates: string;
  labelX: number;
  labelY: number;
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

export const barangays: BarangayProfile[] = [
  {
    id: 'brgy251',
    name: 'Barangay 251',
    captain: 'Jose Dela Cruz',
    population: 12_450,
    area: '0.42 km²',
    district: 'District IV-A North',
    color: '#1D4ED8',
    activeIncidents: 0,
    totalThisMonth: 0,
    resolvedThisMonth: 0,
    responseRate: 100,
    avgResponseMin: 0,
    responders: 0,
    registeredUsers: 0,
    alertLevel: 'normal',
    coordinates: '52,85 175,52 248,72 258,128 225,162 178,177 122,168 62,142',
    labelX: 148,
    labelY: 116,
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
    activeIncidents: 0,
    totalThisMonth: 0,
    resolvedThisMonth: 0,
    responseRate: 100,
    avgResponseMin: 0,
    responders: 0,
    registeredUsers: 0,
    alertLevel: 'normal',
    coordinates: '248,72 368,52 425,88 418,158 375,192 315,208 258,190 225,162 258,128',
    labelX: 330,
    labelY: 120,
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
    activeIncidents: 0,
    totalThisMonth: 0,
    resolvedThisMonth: 0,
    responseRate: 100,
    avgResponseMin: 0,
    responders: 0,
    registeredUsers: 0,
    alertLevel: 'normal',
    coordinates: '88,178 122,168 178,177 225,162 258,190 315,208 375,192 395,232 362,305 282,328 198,322 128,298 78,252',
    labelX: 230,
    labelY: 255,
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
