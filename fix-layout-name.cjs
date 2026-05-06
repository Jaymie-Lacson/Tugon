const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  "function Layout() {",
  `export interface CitizenPageLayoutProps {
  activeNavKey?: CitizenNavKey | string;
  onNavigate?: (key: CitizenNavKey) => void;
  children?: React.ReactNode;
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

content = content.replace("export default Layout;", "");

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
