// ============================================================
// _nav.js — Menu dùng chung cho TẤT CẢ các trang
// Inject nav NGAY LẬP TỨC (không chờ fetch) rồi update sau
// ============================================================
(function () {
  const isAdmin = location.pathname.includes('/admin');
  const base = isAdmin ? '../' : '';

  // Menu mặc định - inject ngay, không cần chờ fetch
  const DEFAULT_MENUS = [
    { label: 'Trang chủ',           href: 'index.html' },
    { label: 'Portfolio',           href: 'index.html#portfolio' },
    { label: 'Các Khóa Học',        href: 'courses.html' },
    { label: 'Kiến thức môn học',   href: 'knowledge.html' },
    { label: 'Nghiên cứu khoa học', href: 'research.html' },
  ];

  function getCurFile() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function isActive(href) {
    const hrefFile = href.split('#')[0].split('/').pop() || 'index.html';
    return hrefFile === getCurFile();
  }

  function buildNavHTML(menus, brand, logoUrl, ctaLabel) {
    const linksHtml = menus.map(m => {
      const href = base + m.href;
      const active = isActive(m.href);
      return `<a href="${href}" class="ch-nav-link${active ? ' ch-nav-active' : ''}">${m.label}</a>`;
    }).join('');

    const logoHtml = logoUrl
      ? `<img src="${base}${logoUrl}" alt="${brand}" style="height:36px;width:auto;object-fit:contain">`
      : `<span>${brand}</span>`;

    return `<div class="ch-nav-inner">
      <a href="${base}index.html" class="ch-nav-brand">${logoHtml}</a>
      <nav class="ch-nav-links" id="chNavLinks">${linksHtml}</nav>
      <div class="ch-nav-actions">
        <button class="ch-nav-icon" title="Tìm kiếm">
          <span class="material-symbols-outlined" style="font-size:22px">search</span>
        </button>
        <a href="${base}index.html#contact" class="ch-nav-cta" id="chNavCta">${ctaLabel}</a>
        <button class="ch-nav-icon ch-mobile-toggle" id="chMobileToggle" title="Menu">
          <span class="material-symbols-outlined" style="font-size:22px">menu</span>
        </button>
      </div>
    </div>
    <div class="ch-mobile-menu" id="chMobileMenu">
      ${menus.map(m => `<a href="${base+m.href}" class="ch-mobile-link${isActive(m.href)?' ch-mobile-active':''}">${m.label}</a>`).join('')}
    </div>`;
  }

  // Inject styles ngay
  const style = document.createElement('style');
  style.textContent = `
    #chSiteNav{
      position:sticky;top:0;z-index:50;
      background:rgba(249,249,255,0.85);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      box-shadow:0 1px 0 rgba(199,196,215,0.35),0 4px 16px rgba(70,72,212,0.06);
      font-family:'Plus Jakarta Sans',sans-serif;
    }
    .ch-nav-inner{
      display:flex;align-items:center;justify-content:space-between;
      max-width:1280px;margin:0 auto;padding:0 20px;height:64px;gap:12px;
    }
    .ch-nav-brand{
      font-size:1.25rem;font-weight:800;color:#4648d4;
      text-decoration:none;letter-spacing:-0.02em;flex-shrink:0;
      display:flex;align-items:center;
    }
    .ch-nav-links{display:flex;align-items:center;gap:2px;flex:1}
    .ch-nav-link{
      padding:8px 14px;border-radius:999px;
      font-size:14px;font-weight:700;color:#464554;
      text-decoration:none;white-space:nowrap;
      transition:background .15s,color .15s;
    }
    .ch-nav-link:hover{color:#4648d4;background:rgba(70,72,212,0.08)}
    .ch-nav-active{color:#4648d4!important;background:rgba(70,72,212,0.1)!important}
    .ch-nav-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
    .ch-nav-icon{
      width:36px;height:36px;border-radius:999px;border:none;
      background:transparent;color:#464554;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:background .15s,color .15s;
    }
    .ch-nav-icon:hover{background:rgba(70,72,212,0.08);color:#4648d4}
    .ch-nav-cta{
      background:#4648d4;color:#fff!important;
      font-size:14px;font-weight:700;
      padding:9px 22px;border-radius:999px;
      text-decoration:none;
      transition:background .2s,transform .15s;
      box-shadow:0 4px 14px rgba(70,72,212,0.3);
      white-space:nowrap;
    }
    .ch-nav-cta:hover{background:#3537b8;transform:scale(1.03)}
    .ch-mobile-toggle{display:none}
    .ch-mobile-menu{
      display:none;flex-direction:column;
      max-width:1280px;margin:0 auto;padding:8px 20px 16px;
      border-top:1px solid rgba(199,196,215,0.3);
    }
    .ch-mobile-menu.open{display:flex}
    .ch-mobile-link{
      padding:11px 8px;font-size:15px;font-weight:600;
      color:#464554;text-decoration:none;border-bottom:1px solid rgba(199,196,215,0.2);
      transition:color .15s;
    }
    .ch-mobile-link:hover,.ch-mobile-active{color:#4648d4}
    @media(max-width:1024px){.ch-nav-links{display:none}.ch-mobile-toggle{display:flex}}
    @media(max-width:600px){.ch-nav-cta{display:none}}
  `;
  document.head.appendChild(style);

  // Inject nav ngay với menu mặc định
  function injectNav(menus, brand, logoUrl, cta) {
    const existing = document.getElementById('chSiteNav');
    if (existing) existing.remove();
    const nav = document.createElement('nav');
    nav.id = 'chSiteNav';
    nav.innerHTML = buildNavHTML(menus, brand, logoUrl, cta);
    document.body.insertBefore(nav, document.body.firstChild);
    // Mobile toggle
    const btn = document.getElementById('chMobileToggle');
    const menu = document.getElementById('chMobileMenu');
    if (btn && menu) btn.onclick = () => menu.classList.toggle('open');
  }

  // Inject ngay với defaults (không chờ fetch)
  function injectDefault() {
    injectNav(DEFAULT_MENUS, 'Nguyễn Đức', '', 'Bắt Đầu');
  }

  // Sau đó update từ content.json
  async function updateFromData() {
    try {
      const r = await fetch(base + 'data/content.json?t=' + Date.now());
      if (!r.ok) return;
      const txt = await r.text();
      const data = JSON.parse(txt);
      const menus = (data.menus && data.menus.length) ? data.menus : DEFAULT_MENUS;
      const brand = data.nav_brand
        || (data.banner && data.banner.name)
        || (data.home && data.home.name)
        || 'Nguyễn Đức';
      const logoUrl = data.nav_logo || '';
      const cta = data.nav_cta || 'Bắt Đầu';
      injectNav(menus, brand, logoUrl, cta);
    } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectDefault();
      updateFromData();
    });
  } else {
    injectDefault();
    updateFromData();
  }
})();
