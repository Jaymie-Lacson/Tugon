const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();

function read(relativePath) {
  const full = path.join(ROOT, relativePath);
  return fs.readFileSync(full, 'utf8');
}

function assertIncludes(content, needle, message, failures) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

function assertOrderedIncludes(content, needles, message, failures) {
  let lastIndex = -1;
  for (const needle of needles) {
    const index = content.indexOf(needle);
    if (index === -1 || index <= lastIndex) {
      failures.push(message);
      return;
    }
    lastIndex = index;
  }
}

function run() {
  const failures = [];

  const landing = read('src/app/pages/Landing.tsx');
  assertIncludes(
    landing,
    'className="skip-link"',
    'Landing: missing visible skip link class.',
    failures,
  );
  assertIncludes(
    landing,
    'href="#landing-main-content"',
    'Landing: skip link must target #landing-main-content.',
    failures,
  );
  assertIncludes(
    landing,
    '<main id="landing-main-content">',
    'Landing: missing main landmark id landing-main-content.',
    failures,
  );

  const officialLayout = read('src/app/components/Layout.tsx');
  assertIncludes(
    officialLayout,
    'aria-controls="layout-mobile-drawer"',
    'Official Layout: mobile menu toggle must expose aria-controls for drawer.',
    failures,
  );
  assertIncludes(
    officialLayout,
    'id="layout-mobile-drawer"',
    'Official Layout: mobile drawer must expose stable id for aria-controls.',
    failures,
  );

  const superAdminLayout = read('src/app/pages/superadmin/SuperAdminLayout.tsx');
  assertIncludes(
    superAdminLayout,
    'aria-controls="superadmin-mobile-drawer"',
    'Super Admin Layout: mobile menu toggle must expose aria-controls for drawer.',
    failures,
  );
  assertIncludes(
    superAdminLayout,
    'id="superadmin-mobile-drawer"',
    'Super Admin Layout: mobile drawer must expose stable id for aria-controls.',
    failures,
  );
  assertIncludes(
    superAdminLayout,
    'aria-label="Close navigation drawer"',
    'Super Admin Layout: drawer close icon button must have aria-label.',
    failures,
  );

  const incidents = read('src/app/pages/Incidents.tsx');
  assertIncludes(
    incidents,
    'aria-label="Close incident details"',
    'Incidents: close button in incident details modal must have aria-label.',
    failures,
  );

  const incidentReport = read('src/app/pages/IncidentReport.tsx');
  assertOrderedIncludes(
    incidentReport,
    [
      'aria-label="Go to citizen home"',
      '<CitizenMobileMenu',
      '<CitizenNotificationBellTrigger',
      'aria-label="Open profile actions"',
    ],
    'IncidentReport: header controls must preserve keyboard tab order (home, menu, notifications, profile).',
    failures,
  );

  const citizenMyReports = read('src/app/pages/CitizenMyReports.tsx');
  assertOrderedIncludes(
    citizenMyReports,
    [
      'aria-label="Go to citizen home"',
      '<CitizenMobileMenu',
      '<CitizenNotificationBellTrigger',
      'aria-label="Open profile actions"',
    ],
    'CitizenMyReports: header controls must preserve keyboard tab order (home, menu, notifications, profile).',
    failures,
  );

  const mapView = read('src/app/pages/MapView.tsx');
  assertOrderedIncludes(
    mapView,
    [
      'className="map-public-login-modal-secondary"',
      'className="map-public-login-modal-primary"',
    ],
    'MapView: public login modal actions must preserve keyboard order (Close before Log In).',
    failures,
  );

  const theme = read('src/styles/theme.css');
  assertIncludes(
    theme,
    '--a11y-focus-ring',
    'Theme: missing shared --a11y-focus-ring token.',
    failures,
  );
  assertIncludes(
    theme,
    'a:focus-visible',
    'Theme: missing global focus-visible styling rule.',
    failures,
  );

  if (failures.length === 0) {
    console.log('A11y smoke checks passed.');
    process.exit(0);
  }

  console.error('A11y smoke checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

run();
