const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /handleSearchResultClick\(`\/citizen\/incidents\?incident=\$\{encodeURIComponent\(incident\.id\)\}`\)/g,
  `handleSearchResultClick('/citizen/my-reports')`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
