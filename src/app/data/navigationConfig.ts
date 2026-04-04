import {
  Activity,
  AlertTriangle,
  BarChart2,
  FileText,
  Home,
  LayoutDashboard,
  Map,
  Plus,
  Settings,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type CitizenNavKey = 'home' | 'report' | 'map' | 'myreports' | 'profile';

export type NavItemDef = {
  key: string;
  path: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const citizenNavDefs: Array<Omit<NavItemDef, 'path' | 'exact'> & { key: CitizenNavKey }> = [
  { key: 'home', labelKey: 'nav.home', icon: Home },
  { key: 'report', labelKey: 'nav.report', icon: Plus },
  { key: 'map', labelKey: 'nav.map', icon: Map },
  { key: 'myreports', labelKey: 'nav.myReports', icon: FileText },
  { key: 'profile', labelKey: 'common.profile', icon: User },
];

export const officialSidebarNavDefs: NavItemDef[] = [
  { key: 'dashboard', path: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { key: 'incidents', path: '/app/incidents', labelKey: 'nav.incidents', icon: AlertTriangle },
  { key: 'map', path: '/app/map', labelKey: 'nav.map', icon: Map },
  { key: 'analytics', path: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart2 },
  { key: 'reports', path: '/app/reports', labelKey: 'nav.reports', icon: FileText },
  { key: 'verifications', path: '/app/verifications', labelKey: 'nav.verifications', icon: UserCheck },
];

export const officialBottomNavDefs: NavItemDef[] = [
  { key: 'dashboard', path: '/app', labelKey: 'nav.home', icon: LayoutDashboard, exact: true },
  { key: 'incidents', path: '/app/incidents', labelKey: 'nav.incidents', icon: AlertTriangle },
  { key: 'map', path: '/app/map', labelKey: 'nav.map', icon: Map },
  { key: 'reports', path: '/app/reports', labelKey: 'nav.reports', icon: FileText },
  { key: 'settings', path: '/app/settings', labelKey: 'common.settings', icon: Settings },
];

export const superAdminSidebarNavDefs: NavItemDef[] = [
  { key: 'overview', path: '/superadmin', labelKey: 'nav.overview', icon: LayoutDashboard, exact: true },
  { key: 'barangayMap', path: '/superadmin/map', labelKey: 'nav.barangayMap', icon: Map },
  { key: 'analytics', path: '/superadmin/analytics', labelKey: 'nav.analytics', icon: BarChart2 },
  { key: 'users', path: '/superadmin/users', labelKey: 'nav.users', icon: Users },
  { key: 'auditLogs', path: '/superadmin/audit-logs', labelKey: 'nav.auditLogs', icon: Activity },
  { key: 'settings', path: '/superadmin/settings', labelKey: 'nav.settings', icon: Settings },
];

export const superAdminBottomNavDefs: NavItemDef[] = [
  { key: 'overview', path: '/superadmin', labelKey: 'nav.overview', icon: LayoutDashboard, exact: true },
  { key: 'map', path: '/superadmin/map', labelKey: 'nav.barangayMap', icon: Map },
  { key: 'analytics', path: '/superadmin/analytics', labelKey: 'nav.analytics', icon: BarChart2 },
  { key: 'users', path: '/superadmin/users', labelKey: 'nav.users', icon: Users },
  { key: 'settings', path: '/superadmin/settings', labelKey: 'nav.settings', icon: Settings },
];
