const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /const userFullName = session\?\.user\.fullName\?\.trim\(\) \|\| t\('role\.official'\);/,
  "const userFullName = session?.user.fullName?.trim() || 'Citizen';"
);

content = content.replace(
  /join\(''\) \|\| 'BO';/,
  "join('') || 'CU';"
);

content = content.replace(
  /const userRoleLabel = session\?\.user\.role === 'SUPER_ADMIN' \? t\('role\.superAdmin'\) : t\('role\.official'\);/,
  "const userRoleLabel = session?.user.barangayCode ? `Barangay ${session.user.barangayCode}` : 'Tondo Cluster';"
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
