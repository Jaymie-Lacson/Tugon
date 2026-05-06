const fs = require('fs');
let content = fs.readFileSync('src/app/pages/CitizenVerification.tsx', 'utf8');

const regex = /<CitizenPageLayout\n\s*hideVerificationPrompt\n\s*header=\{[\s\S]*?mainOnScroll=\{[\s\S]*?\}\n\s*>/m;
content = content.replace(regex, `<CitizenPageLayout
      hideVerificationPrompt
      activeNavKey="profile"
    >`);

fs.writeFileSync('src/app/pages/CitizenVerification.tsx', content);
