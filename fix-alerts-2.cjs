const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /useEffect\(\(\) => \{\n\s*let active = true;\n\s*const loadNotifications[\s\S]*?\}, \[authRedirecting, handleAuthFailure\]\);\n/,
  ""
);

content = content.replace(
  /const notificationItems: AdminNotificationItem\[\][\s\S]*?item\.createdAt,\n\s*\}\)\);\n/,
  ""
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
