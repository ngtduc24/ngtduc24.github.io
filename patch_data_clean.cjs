const fs = require('fs');
let code = fs.readFileSync('src/lib/data.ts', 'utf8');

code = code.replace(
  /await setDoc\(doc\(db, USERS_TABLE, user\.id\), dbData, \{ merge: true \}\);/,
  `const removeUndefined = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(removeUndefined);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, removeUndefined(v)])
        );
      }
      return obj;
    };
    await setDoc(doc(db, USERS_TABLE, user.id), removeUndefined(dbData), { merge: true });`
);

fs.writeFileSync('src/lib/data.ts', code);
