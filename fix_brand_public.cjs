const fs = require('fs');
let content = fs.readFileSync('src/components/PortfolioWebsite.tsx', 'utf8');

// Replace emerald with brand
content = content.replace(/-emerald-500/g, '-brand');
content = content.replace(/-emerald-600/g, '-brand-hover');
content = content.replace(/-emerald-700/g, '-brand-hover');
content = content.replace(/-emerald-50/g, '-brand-light');
content = content.replace(/-emerald-100/g, '-brand-light');
content = content.replace(/-emerald-400/g, '-brand');
content = content.replace(/-emerald-200/g, '-brand-light');
content = content.replace(/-emerald-300/g, '-brand-light');
content = content.replace(/-emerald-800/g, '-brand-hover');
content = content.replace(/-emerald-900/g, '-brand-hover');
content = content.replace(/bg-emerald/g, 'bg-brand');
content = content.replace(/text-emerald/g, 'text-brand');
content = content.replace(/border-emerald/g, 'border-brand');
content = content.replace(/ring-emerald/g, 'ring-brand');

fs.writeFileSync('src/components/PortfolioWebsite.tsx', content);
