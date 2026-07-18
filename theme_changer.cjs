const fs = require('fs');

let content = fs.readFileSync('src/components/PortfolioWebsite.tsx', 'utf8');

// Global background and text
content = content.replace(/bg-\[\#060a13\]/g, 'bg-slate-50');
content = content.replace(/text-slate-100/g, 'text-slate-800');
content = content.replace(/bg-\[\#0a0f1d\]/g, 'bg-white');
content = content.replace(/bg-\[\#0a0f1d\]\/80/g, 'bg-white/80');

// Navigation background
content = content.replace(/bg-\[\#060a13\]\/80/g, 'bg-white/80');

// Slate and Dark colors
content = content.replace(/border-slate-800\/60/g, 'border-slate-200/60');
content = content.replace(/border-slate-800/g, 'border-slate-200');
content = content.replace(/bg-slate-800\/30/g, 'bg-slate-100/50');
content = content.replace(/bg-slate-800\/40/g, 'bg-slate-100/60');
content = content.replace(/bg-slate-800/g, 'bg-white shadow-sm border border-slate-100');
content = content.replace(/bg-slate-900\/50/g, 'bg-white/50');
content = content.replace(/bg-slate-900/g, 'bg-white shadow-sm border border-slate-100');
content = content.replace(/border-slate-700/g, 'border-slate-200');
content = content.replace(/text-slate-300/g, 'text-slate-600');
content = content.replace(/text-slate-400/g, 'text-slate-500');

// Purple/Pink gradients to Emerald/Teal gradients
content = content.replace(/from-purple-600 to-pink-500/g, 'from-emerald-500 to-teal-400');
content = content.replace(/from-purple-600 to-pink-600/g, 'from-emerald-500 to-teal-500');
content = content.replace(/from-purple-500 to-pink-500/g, 'from-emerald-400 to-teal-400');
content = content.replace(/from-purple-500\/20 to-transparent/g, 'from-emerald-500/10 to-transparent');
content = content.replace(/from-slate-900 to-\[\#060a13\]/g, 'from-white to-slate-50');
content = content.replace(/from-\[\#060a13\] to-slate-900/g, 'from-slate-50 to-white');
content = content.replace(/from-slate-800/g, 'from-slate-100');

// Accent Colors
content = content.replace(/text-purple-400/g, 'text-emerald-600');
content = content.replace(/text-purple-300/g, 'text-emerald-600');
content = content.replace(/text-purple-500/g, 'text-emerald-500');
content = content.replace(/text-pink-400/g, 'text-teal-600');
content = content.replace(/bg-purple-500\/10/g, 'bg-emerald-500/10');
content = content.replace(/bg-purple-500\/20/g, 'bg-emerald-500/10');
content = content.replace(/bg-pink-500\/10/g, 'bg-teal-500/10');
content = content.replace(/border-purple-500\/20/g, 'border-emerald-500/20');
content = content.replace(/border-purple-500\/30/g, 'border-emerald-500/30');
content = content.replace(/shadow-purple-500\/20/g, 'shadow-emerald-500/20');
content = content.replace(/shadow-purple-500\/15/g, 'shadow-emerald-500/15');
content = content.replace(/bg-purple-400/g, 'bg-emerald-400');
content = content.replace(/bg-purple-500/g, 'bg-emerald-500');
content = content.replace(/bg-purple-600/g, 'bg-emerald-600');

// Cards and Surfaces
content = content.replace(/bg-slate-800\/50/g, 'bg-white shadow-md shadow-slate-200/50 border border-slate-100');
content = content.replace(/hover:bg-slate-700/g, 'hover:bg-slate-50');
content = content.replace(/hover:border-purple-500\/50/g, 'hover:border-emerald-500/50');
content = content.replace(/hover:border-slate-600/g, 'hover:border-slate-300');
content = content.replace(/ring-slate-800/g, 'ring-slate-200');

// Rounded corners - increase roundness to match Wellora UI
content = content.replace(/rounded-xl/g, 'rounded-2xl');
content = content.replace(/rounded-2xl/g, 'rounded-3xl');
content = content.replace(/rounded-lg/g, 'rounded-xl');
content = content.replace(/rounded-3xl/g, 'rounded-[2rem]');

// Explicitly fix any text-white that should be text-slate-900 in light mode
content = content.replace(/text-white/g, 'text-slate-900');
content = content.replace(/text-slate-900\/5/g, 'text-white/5'); // fixing artifacts
content = content.replace(/text-slate-900\/10/g, 'text-white/10');
content = content.replace(/text-slate-900\/15/g, 'text-white/15');

// But keep text-slate-900 for buttons which we just changed
content = content.replace(/bg-emerald-500 text-slate-900/g, 'bg-emerald-500 text-white');
content = content.replace(/bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900/g, 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white');
content = content.replace(/from-emerald-500 to-teal-400 text-slate-900/g, 'from-emerald-500 to-teal-400 text-white');

// Header Text in dark mode was white, now it's slate-900
content = content.replace(/text-slate-900 uppercase font-display tracking-tight/g, 'text-slate-900 uppercase font-display tracking-tight');

fs.writeFileSync('src/components/PortfolioWebsite.tsx', content);
