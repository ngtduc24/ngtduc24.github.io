const fs = require('fs');
let code = fs.readFileSync('src/components/TaskForm.tsx', 'utf8');

code = code.replace(
  /users\.filter\(u => \(u\.role === 'admin' \|\| \(u\.permissions \|\| \[\]\)\.includes\('tasks'\)\)\)\.map/g,
  `users.filter(u => (u.role === 'admin' || u.canReceiveTask || (u.permissions || []).includes('tasks'))).map`
);

fs.writeFileSync('src/components/TaskForm.tsx', code);
