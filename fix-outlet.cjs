const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /<Outlet \/>/,
  `          {beforeMain}
          {!hideVerificationPrompt && hasVerificationProgressPrompt() && (
            <div className="mb-4 px-4"><VerificationProgressCard /></div>
          )}
          {children}
          {afterMain}
          <CitizenOnboardingModal />`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
