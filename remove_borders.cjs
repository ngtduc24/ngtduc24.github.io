const fs = require('fs');

const cmsFiles = [
  'src/components/PortfolioCMS.tsx',
  'src/components/cms/BannerAboutCMS.tsx',
  'src/components/cms/ProjectsCoursesCMS.tsx',
  'src/components/cms/ResearchLecturesNavCMS.tsx',
  'src/components/cms/AdminPortfolioCMS.tsx'
];

cmsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Status cards and main content frame
    content = content.replace(/bg-white rounded-\[1\.5rem\] border border-slate-100 p-6 shadow-sm/g, 'bg-white rounded-[1.5rem] p-6 shadow-sm');
    content = content.replace(/bg-white rounded-\[1\.5rem\] border border-slate-100 p-5 sm:p-8 shadow-sm/g, 'bg-white rounded-[1.5rem] p-5 sm:p-8 shadow-sm');
    content = content.replace(/bg-white rounded-2xl border border-slate-100 p-4 shadow-sm/g, 'bg-white rounded-2xl p-4 shadow-sm');

    // Remove general card borders
    content = content.replace(/bg-white border border-slate-100 rounded-2xl/g, 'bg-white shadow-sm rounded-2xl');
    content = content.replace(/bg-white border border-slate-100 rounded-xl/g, 'bg-white shadow-sm rounded-xl');
    content = content.replace(/bg-slate-50 border border-slate-100 rounded-xl/g, 'bg-slate-50 shadow-sm rounded-xl');
    content = content.replace(/bg-white rounded-2xl border border-slate-100 p-6/g, 'bg-white rounded-2xl shadow-sm p-6');
    content = content.replace(/bg-white rounded-2xl border border-slate-100/g, 'bg-white rounded-2xl shadow-sm');
    content = content.replace(/bg-slate-50 rounded-2xl border border-slate-100/g, 'bg-slate-50 rounded-2xl shadow-sm');
    
    // General border border-slate-100 removal for cards and forms
    // Search/Filter blocks, Forms
    content = content.replace(/border border-slate-100/g, ''); // Too aggressive? Let's be careful.
    
    fs.writeFileSync(file, content);
  }
});
