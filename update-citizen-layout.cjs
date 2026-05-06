const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

// Update imports
content = content.replace(
  "import { officialReportsApi, type ApiCrossBorderAlert } from '../services/officialReportsApi';",
  "import { citizenReportsApi } from '../services/citizenReportsApi';"
);
content = content.replace(
  "import { AdminNotifications, type AdminNotificationItem } from './AdminNotifications';",
  "import { CitizenNotificationBellTrigger, CitizenNotificationsPanel } from './CitizenNotifications';\nimport { useCitizenReportNotifications } from '../hooks/useCitizenReportNotifications';\nimport { RoleHomeLogo } from './RoleHomeLogo';\nimport { VerificationProgressCard, hasVerificationProgressPrompt } from './VerificationProgressCard';\nimport { CitizenOnboardingModal } from './CitizenOnboardingModal';"
);
content = content.replace(
  "import { officialSidebarNavDefs } from '../data/navigationConfig';",
  "import { citizenNavDefs, type CitizenNavKey } from '../data/navigationConfig';"
);

// Update component signature
content = content.replace(
  "export default function Layout() {",
  `export interface CitizenPageLayoutProps {
  activeNavKey?: CitizenNavKey;
  onNavigate?: (key: CitizenNavKey) => void;
  children: React.ReactNode;
  beforeMain?: React.ReactNode;
  afterMain?: React.ReactNode;
  hideVerificationPrompt?: boolean;
}

export function CitizenPageLayout({
  activeNavKey,
  onNavigate,
  children,
  beforeMain,
  afterMain,
  hideVerificationPrompt,
}: CitizenPageLayoutProps) {`
);

// Fix hook issues
content = content.replace(
  "const [notifications, setNotifications] = useState<ApiCrossBorderAlert[]>([]);",
  ""
);

content = content.replace(
  /const \[unreadCount, setUnreadCount\] = useState\(0\);\n/,
  "const { notificationItems, markAllNotificationsRead } = useCitizenReportNotifications();\n  const unreadCount = notificationItems.filter((item) => item.unread).length;\n"
);

// Fix NAV_ITEMS
content = content.replace(
  "const NAV_ITEMS = officialSidebarNavDefs.map((item) => ({ ...item, label: t(item.labelKey) }));",
  `const NAV_ITEMS = citizenNavDefs.map((item) => ({ ...item, path: item.key === 'home' ? '/citizen' : item.key === 'report' ? '/citizen/report' : item.key === 'myreports' ? '/citizen/my-reports' : '/citizen?tab=' + item.key, label: t(item.labelKey), exact: item.key === 'home' }));`
);

// Fix search logic
content = content.replace(
  /const { reports } = await officialReportsApi.getReports\(\{ search: q \}\);/,
  `const { reports } = await citizenReportsApi.getMyReports();\n        const filtered = reports.filter(r => r.category.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));\n        const toMap = { reports: filtered };`
);

// In the search catch block, replace toMap.reports
content = content.replace(
  /reports\.slice\(0, 5\)/,
  `toMap.reports.slice(0, 5)`
);

// Replace Outlet with children
content = content.replace(
  /<main className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">\n\s*<Outlet \/>\n\s*<\/main>/,
  `<main className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 citizen-page-layout-main">\n          {beforeMain}\n          {!hideVerificationPrompt && hasVerificationProgressPrompt() && (\n            <div className="mb-4"><VerificationProgressCard /></div>\n          )}\n          {children}\n          {afterMain}\n        </main>\n        <CitizenOnboardingModal />`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
