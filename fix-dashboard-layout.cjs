const fs = require('fs');
let content = fs.readFileSync('src/app/pages/CitizenDashboard.tsx', 'utf8');

const regex = /<CitizenPageLayout[\s\S]*?desktopMainMaxWidth=\{1320\}\n\s*>/;
content = content.replace(regex, `<CitizenPageLayout
      activeNavKey={activeTab}
      onNavigate={(key) => {
        if (key === 'report') navigate('/citizen/report');
        else if (key === 'myreports') navigate('/citizen/my-reports');
        else if (key === 'map') setActiveTab('map');
        else if (key === 'profile') setActiveTab('profile');
        else setActiveTab('home');
      }}
      beforeMain={<AlertBanner incidents={incidents} />}
    >`);

fs.writeFileSync('src/app/pages/CitizenDashboard.tsx', content);
