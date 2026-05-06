const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

content = content.replace(
  /<AdminNotifications[\s\S]*?\/>/,
  `<div className="relative">
                <CitizenNotificationBellTrigger
                  unreadCount={unreadCount}
                  open={notificationsOpen}
                  onClick={() => {
                    setNotificationsOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                    setMobileSearchOpen(false);
                  }}
                />
                {notificationsOpen && (
                  <div className="absolute right-0 top-11 z-[2200]">
                    <CitizenNotificationsPanel
                      items={notificationItems}
                      onMarkAllAsRead={markAllNotificationsRead}
                      onClose={() => setNotificationsOpen(false)}
                    />
                  </div>
                )}
              </div>`
);

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
