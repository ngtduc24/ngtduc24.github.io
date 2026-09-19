const fs = require('fs');
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

code = code.replace(
  /id: authUserId, \/\/ Store the UUID from Supabase Auth\s*username: newUsername\.trim\(\),/m,
  `id: authUserId, // Store the UUID\n        username: newUsername.trim(),\n        password: newPassword.trim(),`
);

fs.writeFileSync('src/components/UserManagement.tsx', code);
