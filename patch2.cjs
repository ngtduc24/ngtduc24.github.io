const fs = require('fs');
let code = fs.readFileSync('src/components/TaskDetailModal.tsx', 'utf8');

code = code.replace(
  "{creator ? creator.fullName.charAt(0) : '?'}",
  "{creator?.fullName ? creator.fullName.charAt(0) : '?'}"
);

code = code.replace(
  "{assignee ? assignee.fullName.charAt(0) : '?'}",
  "{assignee?.fullName ? assignee.fullName.charAt(0) : '?'}"
);

fs.writeFileSync('src/components/TaskDetailModal.tsx', code);
