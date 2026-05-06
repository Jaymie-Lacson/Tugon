const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /const currentPageLabel = currentPage\?\.label \?\? '';/,
  `let currentPageLabel = currentPage?.label ?? '';
  if (location.pathname === '/citizen/settings') {
    currentPageLabel = t('common.settings');
  }`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
