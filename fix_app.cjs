const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  /<PublicJournalSearch \n          onLoginClick=\{\(\) => setShowPublicSearch\(false\)\} \n        \/>/g,
  '<PortfolioWebsite onEnterSystem={() => setShowPublicSearch(false)} />'
);
fs.writeFileSync('src/App.tsx', content);
