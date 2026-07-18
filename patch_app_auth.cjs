const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const unsubscribeAuth = onAuthStateChanged\(auth, async \(user\) => \{[\s\S]*?\}\);/m,
  `const unsubscribeAuth = () => {};
    // Ensure we keep the local storage user on refresh
    try {
      const cached = JSON.parse(localStorage.getItem('logged_in_user') || 'null');
      if (cached) {
        setCurrentUser(cached);
      }
    } catch (e) {
      setCurrentUser(null);
      localStorage.removeItem('logged_in_user');
    }`
);

fs.writeFileSync('src/App.tsx', code);
