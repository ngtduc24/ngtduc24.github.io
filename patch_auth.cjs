const fs = require('fs');

// Patch UserManagement.tsx
let um = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

um = um.replace(
  /const userCredential = await createUserWithEmailAndPassword\([\s\S]*?\);\s*await updateProfile[\s\S]*?const authUserId = userCredential\.user\.uid;/m,
  `const authUserId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);`
);
um = um.replace(
  /import \{ createUserWithEmailAndPassword, updateProfile, deleteUser as deleteFirebaseAuthUser \} from 'firebase\/auth';/,
  `// Removed firebase/auth imports`
);
um = um.replace(
  /const userToDelete = authAdminClient\.currentUser;[\s\S]*?await deleteFirebaseAuthUser\(userToDelete\);/m,
  `// No longer using Firebase Auth, just delete from Firestore`
);
fs.writeFileSync('src/components/UserManagement.tsx', um);

// Patch LoginScreen.tsx
let login = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');
login = login.replace(
  /const userCredential = await signInWithEmailAndPassword\(auth, targetEmail, loginPassword\);[\s\S]*?if \(userCredential\.user\) \{[\s\S]*?const foundUser = users\.find\(u => u\.id === userCredential\.user\.uid \|\| u\.email\.toLowerCase\(\) === targetEmail\);[\s\S]*?if \(foundUser\) \{[\s\S]*?onLoginSuccess\(foundUser\);[\s\S]*?\} else \{[\s\S]*?onLoginSuccess\(\{[\s\S]*?\}\);[\s\S]*?\}[\s\S]*?\}/m,
  `const foundUser = users.find(u => u.email.toLowerCase() === targetEmail && u.password === loginPassword);
      if (foundUser) {
        onLoginSuccess(foundUser);
      } else {
        setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác.');
        setLoading(false);
        return;
      }`
);
login = login.replace(
  /import \{ auth \} from '\.\.\/lib\/firebase';\s*import \{ signInWithEmailAndPassword \} from 'firebase\/auth';/,
  ``
);
fs.writeFileSync('src/components/LoginScreen.tsx', login);

