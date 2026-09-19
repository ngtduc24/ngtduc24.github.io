const fs = require('fs');
let code = fs.readFileSync('src/components/UserNotifications.tsx', 'utf8');

code = code.replace(
  /const saveAndSync = \(newNotifications: AppNotification\[\]\) => \{[\s\S]*?window\.dispatchEvent\(new Event\('app_notifications_changed'\)\);\n  \};/m,
  `const saveAndSync = (newNotifications: AppNotification[]) => {
    setNotifications(newNotifications);
    const key = \`notifications_\${currentUser.id}\`;
    localStorage.setItem(key, JSON.stringify(newNotifications));
    window.dispatchEvent(new Event('app_notifications_changed'));
  };`
);

code = code.replace(
  /const handleMarkAsRead = \(id: string\) => \{[\s\S]*?saveAndSync\(updated\);\n  \};/m,
  `const handleMarkAsRead = (id: string) => {
    const readKey = \`notif_read_\${currentUser.id}_\${id}\`;
    localStorage.setItem(readKey, 'true');
    const updated = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    saveAndSync(updated);
  };`
);

code = code.replace(
  /const handleDeleteNotification = \(id: string\) => \{[\s\S]*?saveAndSync\(updated\);\n  \};/m,
  `const handleDeleteNotification = (id: string) => {
    localStorage.setItem(\`notif_deleted_\${currentUser.id}_\${id}\`, 'true');
    const updated = notifications.filter(n => n.id !== id);
    saveAndSync(updated);
  };`
);

code = code.replace(
  /const handleMarkAllRead = \(\) => \{[\s\S]*?saveAndSync\(updated\);\n  \};/m,
  `const handleMarkAllRead = () => {
    notifications.forEach(n => {
      const readKey = \`notif_read_\${currentUser.id}_\${n.id}\`;
      localStorage.setItem(readKey, 'true');
    });
    const updated = notifications.map(n => ({ ...n, unread: false }));
    saveAndSync(updated);
  };`
);

code = code.replace(
  /const handleClearAll = \(\) => \{[\s\S]*?saveAndSync\(\[\]\);\n    \}\n  \};/m,
  `const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ thông báo không?')) {
      notifications.forEach(n => {
        localStorage.setItem(\`notif_deleted_\${currentUser.id}_\${n.id}\`, 'true');
      });
      saveAndSync([]);
    }
  };`
);

fs.writeFileSync('src/components/UserNotifications.tsx', code);
