const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenNotifications.tsx', 'utf8');

content = content.replace(
  /className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg bg-white\/\[0\.12\] text-white"/,
  'className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--surface-container-low)] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"'
);

fs.writeFileSync('src/app/components/CitizenNotifications.tsx', content);
