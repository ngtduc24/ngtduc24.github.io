const fs = require('fs');
let code = fs.readFileSync('src/lib/tasks.ts', 'utf8');

code = code.replace(
  /const cleanTask = Object\.fromEntries\(Object\.entries\(task\)\.filter\(\(\[_, v\]\) => v !== undefined\)\);/,
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
    const cleanTask = removeUndefined(task);`
);

fs.writeFileSync('src/lib/tasks.ts', code);
