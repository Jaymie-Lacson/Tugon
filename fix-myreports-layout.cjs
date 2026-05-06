const fs = require('fs');
let content = fs.readFileSync('src/app/pages/CitizenMyReports.tsx', 'utf8');

const regex = /<CitizenPageLayout[\s\S]*?mainOnScroll=\{[\s\S]*?\}\n\s*>/;
content = content.replace(regex, `<CitizenPageLayout
        activeNavKey="myreports"
      >`);

fs.writeFileSync('src/app/pages/CitizenMyReports.tsx', content);
