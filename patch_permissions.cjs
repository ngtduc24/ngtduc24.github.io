const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /    if \(tabId === 'users' \|\| tabId === 'settings'\) return false; \/\/ Only admin can ever see users or settings panel/m,
  `    if (tabId === 'users') return false; // Only admin can ever see users panel
    if (tabId === 'settings') return currentUser.permissions.includes('settings');
    if (tabId === 'notifications_admin') return currentUser.permissions.includes('notifications');`
);

fs.writeFileSync('src/App.tsx', code);
