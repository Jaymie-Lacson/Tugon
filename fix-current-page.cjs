const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /const currentPage = NAV_ITEMS[\s\S]*?\|\| NAV_ITEMS\[0\];/,
  `const currentPage = NAV_ITEMS.find((n) => n.key === activeNavKey) || NAV_ITEMS[0];`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
