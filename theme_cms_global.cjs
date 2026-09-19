const fs = require('fs');

const files = [
  'src/components/cms/AdminPortfolioCMS.tsx',
  'src/components/cms/BannerAboutCMS.tsx',
  'src/components/cms/ProjectsCoursesCMS.tsx',
  'src/components/cms/ResearchLecturesNavCMS.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/bg-purple-600/g, 'bg-emerald-500');
    content = content.replace(/shadow-purple-600\/10/g, 'shadow-emerald-500/10');
    content = content.replace(/text-purple-600/g, 'text-emerald-500');
    content = content.replace(/bg-purple-50/g, 'bg-emerald-50');
    content = content.replace(/text-purple-500/g, 'text-emerald-500');
    content = content.replace(/bg-purple-500/g, 'bg-emerald-500');
    content = content.replace(/ring-purple-500/g, 'ring-emerald-500');
    content = content.replace(/focus:border-purple-500/g, 'focus:border-emerald-500');
    content = content.replace(/hover:bg-purple-50/g, 'hover:bg-emerald-50');
    
    fs.writeFileSync(file, content);
  }
});
