const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /    if \(tabId === 'notifications_admin'\) return currentUser\.permissions\.includes\('notifications'\);\n    return currentUser\.permissions\.includes\(tabId\);/m,
  `    if (tabId === 'notifications_admin') return currentUser.permissions.includes('notifications');
    if (tabId === 'backup') return false;
    return currentUser.permissions.includes(tabId);`
);

fs.writeFileSync('src/App.tsx', code);
