const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(
    /const localOnly = prev\.filter\(n => !n\.id\.startsWith\('notif-'\)(?: && !n\.id\.includes\('-notif-'\))?\);/g,
    `const localOnly = prev.filter(n => n.id.startsWith('task-'));`
  );

  code = code.replace(
    /const localOnly = updated\.filter\(n => !n\.id\.startsWith\('notif-'\)\);/g,
    `const localOnly = updated.filter(n => n.id.startsWith('task-'));`
  );

  code = code.replace(
    /const systemNotifs = prev\.filter\(n => n\.id\.startsWith\('notif-'\) && /g,
    `const systemNotifs = prev.filter(n => !n.id.startsWith('task-') && `
  );

  fs.writeFileSync(file, code);
}

patchFile('src/components/Header.tsx');
patchFile('src/components/UserNotifications.tsx');
