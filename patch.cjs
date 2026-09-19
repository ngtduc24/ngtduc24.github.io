const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);',
  `const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const cached = localStorage.getItem('logged_in_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });`
);

code = code.replace(
  `      } else {
        setCurrentUser(null);
        localStorage.removeItem('logged_in_user');
      }`,
  `      } else {
        try {
          const cached = JSON.parse(localStorage.getItem('logged_in_user') || 'null');
          if (cached && cached.id === 'admin-id') {
            setCurrentUser(cached);
          } else {
            setCurrentUser(null);
            localStorage.removeItem('logged_in_user');
          }
        } catch (e) {
          setCurrentUser(null);
          localStorage.removeItem('logged_in_user');
        }
      }`
);

fs.writeFileSync('src/App.tsx', code);
