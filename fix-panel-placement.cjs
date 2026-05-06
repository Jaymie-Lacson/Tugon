const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

// First, remove the panel from the old spot
content = content.replace(
  /\{notificationsOpen && \(\n\s*<CitizenNotificationsPanel[\s\S]*?\/>\n\s*\)\}\n\s*<\/div>\n\s*<\/div>/,
  `              </div>
            </div>`
);

// Second, place it right before the mobile search bar dropdown
content = content.replace(
  /\{\/\* Mobile search bar dropdown \*\/\}/,
  `{notificationsOpen && (
            <CitizenNotificationsPanel
              open={notificationsOpen}
              unreadCount={unreadCount}
              items={notificationItems as any}
              onMarkAllRead={markAllNotificationsRead}
            />
          )}

          {/* Mobile search bar dropdown */}`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
