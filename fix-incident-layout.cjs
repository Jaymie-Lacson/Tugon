const fs = require('fs');
let content = fs.readFileSync('src/app/pages/IncidentReport/index.tsx', 'utf8');

const regex = /<CitizenPageLayout\n\s*header=\{[\s\S]*?sidebar=\{<CitizenDesktopNav activeKey="report" \/>\}\n\s*beforeMain=\{<StepIndicator current=\{step\} \/>\}\n\s*afterMain=\{/m;

content = content.replace(regex, `<CitizenPageLayout
        activeNavKey="report"
        beforeMain={<StepIndicator current={step} />}
        afterMain={`);

// Also remove the extra props at the end
const endRegex = /        \}\n\s*mobileMainPaddingBottom=\{96\}\n\s*desktopMainPaddingBottom=\{24\}\n\s*desktopMainMaxWidth=\{1320\}\n\s*mainOnClick=\{[\s\S]*?\}\n\s*mainOnScroll=\{[\s\S]*?\}\n\s*>/m;
content = content.replace(endRegex, `        }\n      >`);

fs.writeFileSync('src/app/pages/IncidentReport/index.tsx', content);
