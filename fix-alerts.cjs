const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /useEffect\(\(\) => \{\n\s*let active = true;\n\s*const fetchNotifications[\s\S]*?\}, \[notificationsOpen, authRedirecting, handleAuthFailure\]\);\n/,
  ""
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
