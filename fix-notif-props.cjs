const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /<CitizenNotificationsPanel[\s\S]*?\/>/,
  `<CitizenNotificationsPanel
                      open={notificationsOpen}
                      unreadCount={unreadCount}
                      items={notificationItems as any}
                      onMarkAllRead={markAllNotificationsRead}
                    />`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
