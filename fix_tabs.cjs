const fs = require('fs');
let content = fs.readFileSync('src/components/PortfolioCMS.tsx', 'utf8');

// The tabs are currently:
/*
              className={`flex items-center gap-2 px-5 py-4 text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                isSelected
                  ? 'border-emerald-500 text-emerald-600 bg-white rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
              }`}
*/

content = content.replace(
  /className=\{`flex items-center gap-2 px-5 py-4 text-\[13px\] font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 \$\{[\s\S]*?\}\`\}/,
  "className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${isSelected ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}"
);

// Remove the border-b from the container
content = content.replace(/border-b border-slate-100 pb-0 overflow-x-auto/, 'pb-2 overflow-x-auto');

fs.writeFileSync('src/components/PortfolioCMS.tsx', content);
