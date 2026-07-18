const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(
    /const exists = updated\.some\(n => n\.id === expId\);\n\s*if \(\!exists\) \{/g,
    `const exists = updated.some(n => n.id === expId);
            const isDeleted = localStorage.getItem(\`notif_deleted_\${currentUser.id}_\${expId}\`) === 'true';
            if (!exists && !isDeleted) {`
  );

  code = code.replace(
    /const exists = updated\.some\(n => n\.id === assignId\);\n\s*if \(\!exists\) \{/g,
    `const exists = updated.some(n => n.id === assignId);
            const isDeleted = localStorage.getItem(\`notif_deleted_\${currentUser.id}_\${assignId}\`) === 'true';
            if (!exists && !isDeleted) {`
  );

  fs.writeFileSync(file, code);
}

patchFile('src/components/Header.tsx');
patchFile('src/components/UserNotifications.tsx');
