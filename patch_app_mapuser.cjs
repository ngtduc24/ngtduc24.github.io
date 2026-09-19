const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /import \{ saveUser, deleteUser, getUsers, /g,
  `import { saveUser, deleteUser, getUsers, mapUserFromDB, `
);

code = code.replace(
  /snapshot\.forEach\(docSnap => \{\n\s*loadedUsers\.push\(docSnap\.data\(\)\);\n\s*\}\);/g,
  `snapshot.forEach(docSnap => {
        loadedUsers.push(mapUserFromDB(docSnap.data()));
      });`
);

fs.writeFileSync('src/App.tsx', code);
