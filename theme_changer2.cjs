const fs = require('fs');

let content = fs.readFileSync('src/components/PortfolioWebsite.tsx', 'utf8');

content = content.replace(/bg-\[\#0b1220\]\/60/g, 'bg-white shadow-xl shadow-slate-200/50');
content = content.replace(/bg-\[\#040810\]/g, 'bg-white');
content = content.replace(/bg-slate-950\/70/g, 'bg-white/90');
content = content.replace(/bg-\[\#0b1220\]\/40/g, 'bg-slate-50');
content = content.replace(/border-slate-900/g, 'border-slate-100');
content = content.replace(/border-slate-200\/80/g, 'border-slate-100');
content = content.replace(/border-slate-200\/60/g, 'border-slate-100');
content = content.replace(/bg-slate-900\/50/g, 'bg-white/50');
content = content.replace(/text-slate-900\/70/g, 'text-slate-500');

fs.writeFileSync('src/components/PortfolioWebsite.tsx', content);
