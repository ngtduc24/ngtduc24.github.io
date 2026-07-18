const fs = require('fs');
let code = fs.readFileSync('src/lib/tasks.ts', 'utf8');

code = code.replace(
  /const taskRef = doc\(db, TASKS_TABLE, task\.id\);\s*await setDoc\(taskRef, task, \{ merge: true \}\);/,
  `const taskRef = doc(db, TASKS_TABLE, task.id);
    // Remove undefined properties before saving to Firestore to prevent errors
    const cleanTask = Object.fromEntries(Object.entries(task).filter(([_, v]) => v !== undefined));
    await setDoc(taskRef, cleanTask, { merge: true });`
);

fs.writeFileSync('src/lib/tasks.ts', code);
