const fs = require('fs');

let content = fs.readFileSync('src/components/PortfolioWebsite.tsx', 'utf8');

const navCode = `
            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1.5">
              {navigation
                .filter(item => item.visible && (item.deviceType === 'all' || item.deviceType === 'desktop' || !item.deviceType))
                .filter(item => !item.parentId)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(item => {
                  const children = navigation.filter(child => child.parentId === item.id && child.visible && (child.deviceType === 'all' || child.deviceType === 'desktop' || !child.deviceType)).sort((a, b) => a.sortOrder - b.sortOrder);
                  const hasChildren = children.length > 0;
                  
                  return (
                    <div key={item.id} className="relative group">
                      <a
                        href={item.link}
                        target={item.target}
                        className={\`px-4 py-2 rounded-[2rem] flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-all duration-300 \${
                          activeSection === item.link.replace('#', '')
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 border border-transparent'
                        } \${item.isFeatured ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : ''}\`}
                      >
                        {item.label}
                        {hasChildren && <ChevronDown className="w-3 h-3 ml-1 opacity-50 group-hover:rotate-180 transition-transform" />}
                      </a>
                      
                      {hasChildren && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-100 shadow-lg rounded-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
                          {children.map(child => (
                            <a
                              key={child.id}
                              href={child.link}
                              target={child.target}
                              className={\`block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-emerald-600 \${child.isFeatured ? 'font-bold text-amber-600' : ''}\`}
                            >
                              {child.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
              })}
`;

content = content.replace(/\{\/\* Desktop Navigation Links \*\/\}[\s\S]*?\{\/\* Internal System Portal Button \*\/}/, navCode + '\n              {/* Internal System Portal Button */}');

const mobileNavCode = `
            >
              <div className="px-4 pt-2 pb-6 space-y-2 bg-white border-b border-slate-100 shadow-sm max-h-[80vh] overflow-y-auto">
                {navigation
                  .filter(item => item.visible && (item.deviceType === 'all' || item.deviceType === 'mobile' || !item.deviceType))
                  .filter(item => !item.parentId)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(item => {
                    const children = navigation.filter(child => child.parentId === item.id && child.visible && (child.deviceType === 'all' || child.deviceType === 'mobile' || !child.deviceType)).sort((a, b) => a.sortOrder - b.sortOrder);
                    return (
                      <div key={item.id} className="space-y-1">
                        <a
                          href={item.link}
                          target={item.target}
                          onClick={() => setActiveNavMenu(false)}
                          className={\`block px-4 py-3 rounded-xl text-sm font-bold \${item.isFeatured ? 'bg-amber-50 text-amber-700' : 'text-slate-700 bg-slate-50 hover:bg-slate-100'}\`}
                        >
                          {item.label}
                        </a>
                        {children.length > 0 && (
                          <div className="pl-4 border-l-2 border-slate-100 ml-4 space-y-1 mt-1">
                            {children.map(child => (
                              <a
                                key={child.id}
                                href={child.link}
                                target={child.target}
                                onClick={() => setActiveNavMenu(false)}
                                className={\`block px-4 py-2.5 rounded-xl text-sm \${child.isFeatured ? 'font-bold text-amber-600 bg-amber-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}\`}
                              >
                                {child.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                })}
`;

content = content.replace(/>\s*<div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">[\s\S]*?(?=<button\s*onClick=\{\(\) => \{)/, mobileNavCode);

fs.writeFileSync('src/components/PortfolioWebsite.tsx', content);
