const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const unsubscribeUsers = onSnapshot\(collection\(db, USERS_TABLE\), \(snapshot\) => \{[\s\S]*?\}\);/,
  `const unsubscribeUsers = onSnapshot(collection(db, USERS_TABLE), (snapshot) => {
      getUsers().then(loadedUsers => {
        setUsers(loadedUsers);
        localStorage.setItem('local_users_cache', JSON.stringify(loadedUsers));
        
        // Update currentUser if their permissions or data changed
        setCurrentUser(prevUser => {
          if (prevUser) {
            const updatedUser = loadedUsers.find(u => u.id === prevUser.id);
            if (updatedUser) {
              localStorage.setItem('logged_in_user', JSON.stringify(updatedUser));
              return updatedUser;
            }
          }
          return prevUser;
        });
      });
    });`
);

fs.writeFileSync('src/App.tsx', code);
