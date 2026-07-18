const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  /const saveNotifications = \(newNotifications: AppNotification\[\]\) => \{[\s\S]*?window\.dispatchEvent\(new Event\('app_notifications_changed'\)\);\n  \};/m,
  `const saveNotifications = (newNotifications: AppNotification[]) => {
    setNotifications(newNotifications);
    const key = \`notifications_\${currentUser.id}\`;
    localStorage.setItem(key, JSON.stringify(newNotifications));
    window.dispatchEvent(new Event('app_notifications_changed'));
  };`
);

code = code.replace(
  /const handleMarkAsRead = \(id: string\) => \{[\s\S]*?saveNotifications\(updated\);\n  \};/m,
  `const handleMarkAsRead = (id: string) => {
    const readKey = \`notif_read_\${currentUser.id}_\${id}\`;
    localStorage.setItem(readKey, 'true');
    const updated = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    saveNotifications(updated);
  };`
);

code = code.replace(
  /const handleMarkAllAsRead = \(\) => \{[\s\S]*?saveNotifications\(updated\);\n  \};/m,
  `const handleMarkAllAsRead = () => {
    notifications.forEach(n => {
      const readKey = \`notif_read_\${currentUser.id}_\${n.id}\`;
      localStorage.setItem(readKey, 'true');
    });
    const updated = notifications.map(n => ({ ...n, unread: false }));
    saveNotifications(updated);
  };`
);

code = code.replace(
  /const handleClearAll = \(\) => \{[\s\S]*?saveNotifications\(\[\]\);\n  \};/m,
  `const handleClearAll = () => {
    notifications.forEach(n => {
      localStorage.setItem(\`notif_deleted_\${currentUser.id}_\${n.id}\`, 'true');
    });
    saveNotifications([]);
  };`
);

code = code.replace(
  /const handleDeleteNotification = \(id: string, e: React.MouseEvent\) => \{[\s\S]*?saveNotifications\(updated\);\n  \};/m,
  `const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(\`notif_deleted_\${currentUser.id}_\${id}\`, 'true');
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };`
);

// We also need to fix `handleNotifChange` and `loadSystemNotifs` logic in Header to not filter by 'notif-'.
fs.writeFileSync('src/components/Header.tsx', code);
