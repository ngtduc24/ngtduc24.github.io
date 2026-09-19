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
    
    // Wipe out borders on standard cards/blocks that might have been missed
    content = content.replace(/border border-slate-150/g, 'shadow-sm');
    content = content.replace(/border border-slate-100/g, ''); 
    // Wait, replacing all `border border-slate-100` might remove borders from inputs and tables, which we might want to keep or it might look broken.
    // The previous script already did a targeted replacement for cards and frames.
    
    fs.writeFileSync(file, content);
  }
});
