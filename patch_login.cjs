const fs = require('fs');
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');

code = code.replace(
  /try \{\s*\/\/\s*Authenticate with Firebase[\s\S]*?finally \{\s*setLoading\(false\);\s*\}\s*\};/m,
  `// Authenticate using loaded users list
    const foundUser = users.find(u => 
      (u.username.toLowerCase() === usernameClean || u.email.toLowerCase() === targetEmail) &&
      u.password === loginPassword
    );
    
    if (foundUser) {
      onLoginSuccess(foundUser);
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
    setLoading(false);
  };`
);

code = code.replace(
  /import \{ auth \} from '\.\.\/lib\/firebase';[\r\n]+import \{ signInWithEmailAndPassword \} from 'firebase\/auth';/g,
  ''
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
