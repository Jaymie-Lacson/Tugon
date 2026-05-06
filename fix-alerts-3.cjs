const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /const notificationItems: AdminNotificationItem\[\][\s\S]*?\}\)\);/,
  ""
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
