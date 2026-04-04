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
      [14.6151576, 120.9778668],
      [14.6151269, 120.9780734],
      [14.6138576, 120.9777379],
      [14.6138881, 120.9775742],
      [14.6139514, 120.9772961],
      [14.6139695, 120.9771491],
      [14.6140086, 120.9771571],
      [14.6152725, 120.9774630],
    ],
    center: [14.6146, 120.9777],
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
      [14.6152725, 120.9774630],
      [14.6140086, 120.9771571],
      [14.6139695, 120.9771491],
      [14.6138726, 120.9771203],
      [14.6138888, 120.9770354],
      [14.6137142, 120.9769944],
      [14.6137978, 120.9766256],
      [14.6140525, 120.9766893],
      [14.6146931, 120.9768373],
      [14.6153845, 120.9770152],
    ],
    center: [14.6144, 120.9769],
  },
  {
    id: 'brgy256',
    name: 'Barangay 256',
    captain: 'Ricardo Reyes',
    population: 9_870,
    area: '0.55 km²',
    district: 'District IV-A South',
    color: 'var(--severity-medium)',
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
      [14.6165934, 120.9785196],
      [14.6165675, 120.9787716],
      [14.6164604, 120.9788136],
      [14.6163550, 120.9788522],
      [14.6161790, 120.9789493],
      [14.6159963, 120.9790463],
      [14.6157071, 120.9791867],
      [14.6155382, 120.9792674],
      [14.6153803, 120.9793486],
      [14.6152404, 120.9794005],
      [14.6151315, 120.9794212],
      [14.6148209, 120.9794200],
      [14.6148861, 120.9791266],
      [14.6149511, 120.9788318],
      [14.6149661, 120.9787605],
      [14.6150187, 120.9785164],
      [14.6150567, 120.9783709],
      [14.6150973, 120.9782174],
      [14.6151269, 120.9780734],
      [14.6151576, 120.9778668],
      [14.6157229, 120.9779947],
      [14.6162620, 120.9781291],
      [14.6166307, 120.9781571],
    ],
    center: [14.6157, 120.9788],
  },
];
