const fs = require('fs');
let content = fs.readFileSync('src/app/components/CitizenPageLayout.tsx', 'utf8');

// Remove handleMarkAllRead
content = content.replace(/const handleMarkAllRead = async \(\) => \{[\s\S]*?catch[\s\S]*?\}[\s\S]*?\};/, '');

// Remove handleNotificationClick
content = content.replace(/const handleNotificationClick = async \(item[\s\S]*?\};/, '');

fs.writeFileSync('src/app/components/CitizenPageLayout.tsx', content);
