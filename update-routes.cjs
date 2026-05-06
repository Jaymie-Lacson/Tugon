const fs = require('fs');
let content = fs.readFileSync('src/app/routes.ts', 'utf8');

// Add lazy route
content = content.replace(
  /const CitizenMyReports = lazyRoute\(\(\) => import\('\.\/pages\/CitizenMyReports'\)\);/,
  `const CitizenMyReports = lazyRoute(() => import('./pages/CitizenMyReports'));\nconst CitizenSettings = lazyRoute(() => import('./pages/CitizenSettings'));`
);

// Add guard
content = content.replace(
  /function CitizenReportsGuard\(\) \{[\s\S]*?\}/,
  `$&

function CitizenSettingsGuard() {
  return React.createElement(
    RequireRole,
    { roles: ['CITIZEN'], fallbackPath: '/app' },
    React.createElement(CitizenSettings),
  );
}`
);

// Add route
content = content.replace(
  /path: '\/citizen\/verification',[\s\S]*?\},/,
  `$&
  {
    path: '/citizen/settings',
    errorElement,
    Component: () =>
      React.createElement(
        RequireAuth,
        null,
        React.createElement(CitizenSettingsGuard),
      ),
  },`
);

fs.writeFileSync('src/app/routes.ts', content);
