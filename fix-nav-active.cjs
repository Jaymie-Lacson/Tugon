const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

// Replace active logic inside the map functions
content = content.replace(
  /const isActive = item.exact[\s\S]*?const active = item.exact \? exactActive : isActive;/g,
  `const active = item.key === activeNavKey;`
);

// We also need to fix `Layout.tsx`'s NavLink logic since CitizenPageLayout is copied from it.
// There are multiple places where NAV_ITEMS.map is used.
content = content.replace(
  /const isActive = item.exact\s*\?\s*location\.pathname === item\.path\s*:\s*location\.pathname\.startsWith\(item\.path\) && item\.path !== '\/app';\s*const exactActive = location\.pathname === '\/app';\s*const active = item\.exact \? exactActive : isActive;/g,
  "const active = item.key === activeNavKey;"
);

// Replace /app references with /citizen
content = content.replace(/\/app/g, "/citizen");

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
