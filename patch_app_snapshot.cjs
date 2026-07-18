const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const unsubscribeUsers = onSnapshot\(collection\(db, USERS_TABLE\), \(snapshot\) => \{[\s\S]*?\}\);\n    \}\);/m,
  `const unsubscribeUsers = onSnapshot(collection(db, USERS_TABLE), (snapshot) => {
      const loadedUsers = [];
      snapshot.forEach(docSnap => {
        loadedUsers.push(docSnap.data());
      });
      setUsers(loadedUsers);
      localStorage.setItem('local_users_cache', JSON.stringify(loadedUsers));
      
      setCurrentUser(prevUser => {
        if (prevUser) {
          const updatedUser = loadedUsers.find(u => u.id === prevUser.id);
          if (updatedUser) {
            // Only update if there are actual changes
            if (JSON.stringify(prevUser) !== JSON.stringify(updatedUser)) {
              localStorage.setItem('logged_in_user', JSON.stringify(updatedUser));
              return updatedUser;
            }
          }
        }
        return prevUser;
      });
    });`
);

fs.writeFileSync('src/App.tsx', code);
