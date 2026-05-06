const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

// For Desktop Sidebar NavLink
content = content.replace(
  /<NavLink\n\s*key=\{item\.path\}\n\s*to=\{item\.path\}\n\s*title=\{t\('nav\.openPage', \{ page: item\.label \}\)\}/g,
  `<NavLink\n                key={item.path}\n                to={item.path}\n                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate(item.key as CitizenNavKey); } }}\n                title={t('nav.openPage', { page: item.label })}`
);

// For Mobile Drawer NavLink
content = content.replace(
  /<NavLink\n\s*key=\{item\.path\}\n\s*to=\{item\.path\}\n\s*onClick=\{\(\) => setMobileDrawerOpen\(false\)\}/g,
  `<NavLink\n                  key={item.path}\n                  to={item.path}\n                  onClick={(e) => { setMobileDrawerOpen(false); if (onNavigate) { e.preventDefault(); onNavigate(item.key as CitizenNavKey); } }}`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
