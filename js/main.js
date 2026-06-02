// ============================================
// BUILD MENU TỪ content.json
// ============================================
function buildMenuFromJson(menus) {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu || !menus) return;
    
    navMenu.innerHTML = '';
    
    function createMenuItem(item) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;';
        
        const link = document.createElement('a');
        link.href = item.type === 'page' ? `page.html?slug=${item.slug}` : (item.href || '#');
        link.textContent = item.label;
        link.className = 'px-4 py-2 rounded-full text-label-bold font-label-bold text-on-surface-variant hover:bg-surface-container transition-all';
        if (item.slug === 'home' && (window.location.pathname.includes('index.html') || window.location.pathname === '/')) {
            link.classList.add('text-primary', 'bg-primary-container/10');
        }
        
        wrapper.appendChild(link);
        
        // Submenu
        if (item.children && item.children.length > 0) {
            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown-menu';
            dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;min-width:200px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);padding:8px 0;z-index:60;';
            
            item.children.forEach(function(child) {
                const childLink = document.createElement('a');
                childLink.href = child.type === 'page' ? `page.html?slug=${child.slug}` : (child.href || '#');
                childLink.textContent = child.label;
                childLink.style.cssText = 'display:block;padding:10px 20px;color:#111c2d;font-weight:600;font-size:14px;white-space:nowrap;text-decoration:none;';
                childLink.onmouseover = function() { this.style.background = '#eef2ff'; this.style.color = '#4648d4'; };
                childLink.onmouseout = function() { this.style.background = ''; this.style.color = '#111c2d'; };
                dropdown.appendChild(childLink);
            });
            
            wrapper.appendChild(dropdown);
            wrapper.onmouseenter = function() { dropdown.style.display = 'block'; };
            wrapper.onmouseleave = function() { dropdown.style.display = 'none'; };
        }
        
        return wrapper;
    }
    
    menus.forEach(function(item) {
        navMenu.appendChild(createMenuItem(item));
    });
}

// ============================================
// COLOR MAP
// ============================================
const COLOR_MAP = {
  primary: { bg:'bg-primary-container/10', border:'border-primary-container/20', hover:'hover:bg-primary-container/20', icon:'text-primary', num:'text-primary' },
  secondary: { bg:'bg-secondary-container/20', border:'border-secondary-container/40', hover:'hover:bg-secondary-container/30', icon:'text-secondary', num:'text-secondary' },
  tertiary: { bg:'bg-tertiary-container/10', border:'border-tertiary-container/20', hover:'hover:bg-tertiary-container/20', icon:'text-tertiary', num:'text-tertiary' },
  'primary-container': { bg:'bg-primary-container/10', border:'border-primary-container/20', hover:'hover:bg-primary-container/20', icon:'text-primary-container', num:'text-primary-container' }
};

// ============================================
// LOAD DATA
// ============================================
async function loadData() {
  try {
    const r = await fetch('Data/content.json?t=' + Date.now());
    if (r.ok) {
      const text = await r.text();
      const data = JSON.parse(text);
      
      // Xây menu từ dữ liệu
      if (data.menus) {
        buildMenuFromJson(data.menus);
      }
      
      return data;
    }
  } catch(e) { console.error('loadData:', e); }
  return null;
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderBanner(b) {
  if (!b) return;
  if (b.badge) document.getElementById('hero-badge').textContent = b.badge;
  if (b.title_line1) document.getElementById('hero-line1').textContent = b.title_line1;
  if (b.title_line2) document.getElementById('hero-line2').textContent = b.title_line2;
  if (b.name) { document.getElementById('hero-name').textContent = b.name; document.title = 'Portfolio - ' + b.name; document.getElementById('nav-brand').textContent = b.name; }
  if (b.description) document.getElementById('hero-desc').textContent = b.description;
  if (b.btn_primary) document.getElementById('hero-btn1').textContent = b.btn_primary;
  if (b.avatar_url) document.getElementById('hero-avatar').src = b.avatar_url;
}

function renderSkills(skills) {
  const g = document.getElementById('skills-grid');
  if (!skills || !skills.length) { g.innerHTML = '<p class="text-on-surface-variant col-span-3">Chưa có kỹ năng.</p>'; return; }
  g.innerHTML = skills.map(s => {
    const c = COLOR_MAP[s.color] || COLOR_MAP.primary;
    return `<div class="aspect-square flex flex-col items-center justify-center p-4 ${c.bg} border ${c.border} rounded-2xl ${c.hover} transition-colors">
      <span class="material-symbols-outlined ${c.icon} text-4xl mb-3">${s.icon}</span>
      <span class="text-label-bold font-label-bold text-on-surface text-center">${s.name}</span>
      <span class="${c.num} text-headline-md font-bold mt-1">${s.percent}</span>
    </div>`;
  }).join('');
}

function renderExperience(exp) {
  const el = document.getElementById('experience-list');
  if (!exp || !exp.length) { el.innerHTML = '<p class="text-on-surface-variant">Chưa có kinh nghiệm.</p>'; return; }
  el.innerHTML = exp.map(e => `
    <div class="relative">
      <div class="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-${e.color} border-4 border-surface shadow-sm"></div>
      <h4 class="text-headline-md font-headline-md text-on-surface">${e.title}</h4>
      <p class="text-label-bold font-label-bold text-${e.color} mt-1 mb-3">${e.company} | ${e.period}</p>
      <p class="text-body-md text-on-surface-variant">${e.desc}</p>
    </div>
  `).join('');
}

function renderPortfolio(items) {
  const g = document.getElementById('portfolio-grid');
  if (!items || !items.length) { g.innerHTML = '<div class="rounded-3xl border-2 border-dashed border-outline-variant/40 p-16 text-center text-on-surface-variant">Chưa có dự án nào. Thêm từ trang <a href="admin/" class="text-primary underline">Admin</a>.</div>'; return; }
  g.innerHTML = items.map(p => {
    const tagHtml = (p.tags||[]).map((t,i) => {
      const col = (p.tag_colors||[])[i];
      return col === 'white'
        ? `<span class="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/30">${t}</span>`
        : `<span class="bg-${col||'primary'}/90 backdrop-blur-md text-on-primary px-4 py-1.5 rounded-full text-sm font-bold">${t}</span>`;
    }).join('');
    return `<div class="relative group overflow-hidden rounded-[32px] ambient-shadow cursor-pointer border border-white/20">
      <div class="aspect-[21/9] w-full overflow-hidden">
        <img alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" src="${p.image||''}">
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>
      <div class="absolute inset-0 flex flex-col justify-end p-8 md:p-12 transition-transform duration-500 transform translate-y-4 group-hover:translate-y-0">
        <div class="flex items-center gap-3 mb-4">${tagHtml}</div>
        <h3 class="text-display-lg text-white font-display-lg mb-4">${p.title}</h3>
        <p class="text-white/80 text-body-lg max-w-2xl mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">${p.desc}</p>
        <div class="flex items-center gap-4">
          <a href="${p.link||'#'}" class="bg-white text-on-surface py-3 px-8 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2">
            View Case Study <span class="material-symbols-outlined">arrow_outward</span>
          </a>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderLearn(courses, research, community) {
  const g = document.getElementById('learn-grid');
  let html = '';
  const c = (courses||[])[0];
  if (c) {
    html += `<div class="md:col-span-2 md:row-span-2 rounded-3xl p-8 relative overflow-hidden bg-primary-fixed flex flex-col justify-between ambient-shadow border border-white/40 group">
      <div class="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl opacity-20 -mr-20 -mt-20 group-hover:opacity-40 transition-opacity duration-700"></div>
      <div class="relative z-10 flex justify-between items-start">
        <span class="bg-primary text-on-primary px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">${c.badge}</span>
        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-primary">
          <span class="material-symbols-outlined">school</span>
        </div>
      </div>
      <div class="relative z-10 mt-auto">
        <h3 class="text-headline-lg font-headline-lg text-on-surface mb-3 w-4/5 leading-tight">${c.title}</h3>
        <p class="text-body-lg font-body-lg text-on-surface-variant mb-6 w-3/4">${c.desc}</p>
        <a href="${c.link||'#'}" class="bg-on-surface text-surface-bright py-3 px-8 rounded-full font-bold hover:bg-primary transition-colors inline-flex items-center gap-2">
          ${c.btn} <span class="material-symbols-outlined text-[18px]">arrow_right_alt</span>
        </a>
      </div>
    </div>`;
  }
  (research||[]).slice(0,1).forEach(r => {
    html += `<div class="rounded-3xl p-6 bg-secondary-fixed flex flex-col justify-between ambient-shadow relative overflow-hidden">
      <div class="absolute -right-8 -bottom-8 opacity-20"><span class="material-symbols-outlined text-[120px]">science</span></div>
      <div>
        <span class="text-on-secondary-fixed-variant font-bold text-sm uppercase tracking-wider mb-2 block">${r.label}</span>
        <h4 class="text-headline-md font-headline-md text-on-secondary-fixed leading-tight mb-2">${r.title}</h4>
      </div>
      <a class="inline-flex items-center gap-1 text-on-secondary-fixed-variant font-bold mt-4 hover:underline" href="${r.link||'#'}">
        Đọc Bài Viết <span class="material-symbols-outlined text-[16px]">chevron_right</span>
      </a>
    </div>`;
  });
  if (community) {
    html += `<div class="rounded-3xl p-6 bg-surface-container-high flex flex-col justify-center items-center text-center ambient-shadow border border-outline-variant/30">
      <div class="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container mb-4 transform rotate-12 shadow-inner">
        <span class="material-symbols-outlined text-[32px]">group_add</span>
      </div>
      <h4 class="text-headline-md font-headline-md text-on-surface mb-2">${community.title}</h4>
      <p class="text-body-md text-on-surface-variant mb-4 text-sm">${community.desc}</p>
      <a href="${community.link||'#'}" class="w-full py-2.5 bg-white rounded-full text-primary font-bold shadow-sm border border-outline-variant/20 hover:bg-surface-bright transition-colors block text-center">${community.btn}</a>
    </div>`;
  }
  g.innerHTML = html || '<div class="col-span-3 text-center text-on-surface-variant p-16">Chưa có nội dung. Thêm từ <a href="admin/" class="text-primary underline">Admin</a>.</div>';
}

function renderFooter(f) {
  if (!f) return;
  if (f.brand) document.getElementById('footer-brand').textContent = f.brand;
  if (f.copyright) document.getElementById('footer-copy').textContent = f.copyright;
  if (f.links) {
    document.getElementById('footer-links').innerHTML = f.links.map(l =>
      `<a class="text-surface-variant/70 hover:text-tertiary-fixed transition-colors font-bold" href="${l.href}">${l.label}</a>`
    ).join('');
  }
}

// ============================================
// INIT
// ============================================
async function init() {
  const data = await loadData();
  if (!data) return;
  renderBanner(data.banner);
  renderSkills(data.skills);
  renderExperience(data.experience);
  renderPortfolio(data.portfolio);
  renderLearn(data.courses, data.research, data.community);
  renderFooter(data.footer);
}

// ============================================
// MOBILE MENU TOGGLE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  init();
  
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function() {
      if (navMenu.style.display === 'flex') {
        navMenu.style.display = 'none';
      } else {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '70px';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.background = 'white';
        navMenu.style.padding = '20px';
        navMenu.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
        navMenu.style.zIndex = '50';
      }
    });
  }
});
