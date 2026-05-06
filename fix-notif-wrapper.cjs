const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /<div className="absolute right-0 top-11 z-\[2200\]">\n\s*(<CitizenNotificationsPanel[\s\S]*?\/>)\n\s*<\/div>/,
  `$1`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
