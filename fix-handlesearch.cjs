const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /navigate\(`\/citizen\/incidents\?search=\$\{encodeURIComponent\(q\)\}`\);/g,
  "navigate(`/citizen/my-reports`);"
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
