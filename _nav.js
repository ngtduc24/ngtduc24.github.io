// ============================================================
// _nav.js — Menu dùng chung cho TẤT CẢ các trang
// Tự động load từ data/content.json và render nav đồng nhất
// ============================================================
(function () {
  const isAdmin = location.pathname.includes('/admin');
  if (isAdmin) return; // Admin có nav riêng

  const base = (function() {
    // Tìm depth của trang so với root
    const path = location.pathname;
    if (path.includes('/admin')) return '../';
    return '';
  })();

  // ─── Helpers ───────────────────────────────────────────────
  function getCurFile() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function getCurSlug() {
    const params = new URLSearchParams(location.search);
    return params.get('slug') || null;
  }

  function resolveHref(item) {
    if (item.type === 'fixed' && item.link) return base + item.link;
    if (item.slug === 'home') return base + 'index.html';
    return base + 'page.html?slug=' + item.slug;
  }

  function isActive(item) {
    const curFile = getCurFile();
    const curSlug = getCurSlug();
    if (item.type === 'fixed' && item.link) {
      return item.link.split('/').pop() === curFile;
    }
    if (item.slug === 'home') {
      return curFile === 'index.html' || curFile === '' || curFile === '/';
    }
    // page.html?slug=xxx
    return curFile === 'page.html' && curSlug === item.slug;
  }

  // ─── CSS ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'ch-nav-style';
  style.textContent = `
    #chSiteNav {
      position: sticky; top: 0; z-index: 50;
      background: rgba(249,249,255,0.88);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(199,196,215,0.25);
      box-shadow: 0 4px 24px rgba(70,72,212,0.06);
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .ch-inner {
      display: flex; align-items: center; justify-content: space-between;
      max-width: 1280px; margin: 0 auto; padding: 0 20px; height: 68px; gap: 16px;
    }
    .ch-brand {
      font-size: 1.2rem; font-weight: 800; color: #4648d4;
      text-decoration: none; letter-spacing: -0.02em; flex-shrink: 0;
      display: flex; align-items: center; gap: 8px;
    }
    .ch-brand img { height: 34px; width: auto; object-fit: contain; }
    .ch-links { display: flex; align-items: center; gap: 2px; flex: 1; }

    /* Menu item wrapper */
    .ch-item { position: relative; display: inline-block; }

    .ch-link {
      display: inline-block; padding: 8px 14px; border-radius: 999px;
      font-size: 14px; font-weight: 700; color: #464554;
      text-decoration: none; white-space: nowrap;
      transition: background .15s, color .15s;
    }
    .ch-link:hover { color: #4648d4; background: rgba(70,72,212,0.08); }
    .ch-link.active { color: #4648d4 !important; background: rgba(70,72,212,0.1) !important; }
    .ch-link.has-child { padding-right: 10px; }
    .ch-link.has-child::after {
      content: ''; display: inline-block; width: 14px; height: 14px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%23464554' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") center/contain no-repeat;
      vertical-align: middle; margin-left: 2px; opacity: 0.6;
    }

    /* Dropdown */
    .ch-dropdown {
      display: none; position: absolute; top: calc(100% + 6px); left: 0;
      min-width: 200px; background: white; border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(199,196,215,0.3);
      padding: 6px 0; z-index: 100; animation: ch-fade .15s ease;
    }
    @keyframes ch-fade { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
    .ch-item:hover > .ch-dropdown { display: block; }
    .ch-dropdown a {
      display: block; padding: 10px 18px; color: #111c2d;
      font-weight: 600; font-size: 14px; white-space: nowrap; text-decoration: none;
      transition: background .12s, color .12s;
    }
    .ch-dropdown a:hover { background: #eef2ff; color: #4648d4; }
    .ch-dropdown a.active { color: #4648d4; background: #eef2ff; }

    /* Right actions */
    .ch-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .ch-icon {
      width: 36px; height: 36px; border-radius: 999px; border: none;
      background: transparent; color: #464554; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s;
    }
    .ch-icon:hover { background: rgba(70,72,212,0.08); color: #4648d4; }
    .ch-cta {
      background: #4648d4; color: #fff !important;
      font-size: 14px; font-weight: 700;
      padding: 9px 22px; border-radius: 999px;
      text-decoration: none;
      transition: background .2s, transform .15s;
      box-shadow: 0 4px 14px rgba(70,72,212,0.28);
      white-space: nowrap;
    }
    .ch-cta:hover { background: #3537b8; transform: scale(1.03); }
    .ch-mobile-btn { display: none; }

    /* Mobile menu */
    .ch-mobile {
      display: none; flex-direction: column;
      max-width: 1280px; margin: 0 auto; padding: 8px 20px 16px;
      border-top: 1px solid rgba(199,196,215,0.3);
      background: rgba(249,249,255,0.97);
    }
    .ch-mobile.open { display: flex; }
    .ch-mobile a {
      padding: 12px 8px; font-size: 15px; font-weight: 600;
      color: #464554; text-decoration: none;
      border-bottom: 1px solid rgba(199,196,215,0.2);
      transition: color .15s;
    }
    .ch-mobile a:last-child { border-bottom: none; }
    .ch-mobile a:hover, .ch-mobile a.active { color: #4648d4; }
    .ch-mobile .ch-mobile-sub a {
      padding-left: 24px; font-size: 14px; color: #767586;
    }

    @media (max-width: 1024px) { .ch-links { display: none; } .ch-mobile-btn { display: flex; } }
    @media (max-width: 600px) { .ch-cta { display: none; } }
  `;
  document.head.appendChild(style);

  // ─── Build HTML ────────────────────────────────────────────
  function buildNav(menus, brand, logoUrl, ctaLabel) {
    // Desktop links
    const desktopLinks = menus.map(function(item) {
      const href = resolveHref(item);
      const active = isActive(item);
      const hasChild = item.children && item.children.length > 0;

      let childHtml = '';
      if (hasChild) {
        const childItems = item.children.map(function(child) {
          const cHref = resolveHref(child);
          const cActive = isActive(child);
          return `<a href="${cHref}" class="${cActive ? 'active' : ''}">${child.label}</a>`;
        }).join('');
        childHtml = `<div class="ch-dropdown">${childItems}</div>`;
      }

      return `<div class="ch-item">
        <a href="${href}" class="ch-link${active ? ' active' : ''}${hasChild ? ' has-child' : ''}">${item.label}</a>
        ${childHtml}
      </div>`;
    }).join('');

    // Mobile links (flat)
    const mobileLinks = menus.map(function(item) {
      const href = resolveHref(item);
      const active = isActive(item);
      let html = `<a href="${href}" class="${active ? 'active' : ''}">${item.label}</a>`;
      if (item.children && item.children.length > 0) {
        const subs = item.children.map(function(child) {
          return `<a href="${resolveHref(child)}" class="${isActive(child)?'active':''}">${child.label}</a>`;
        }).join('');
        html += `<div class="ch-mobile-sub">${subs}</div>`;
      }
      return html;
    }).join('');

    const logoHtml = logoUrl
      ? `<img src="${base}${logoUrl}" alt="${brand}">`
      : `<span>${brand}</span>`;

    return `
      <div class="ch-inner">
        <a href="${base}index.html" class="ch-brand">${logoHtml}</a>
        <nav class="ch-links">${desktopLinks}</nav>
        <div class="ch-actions">
          <button class="ch-icon" title="Tìm kiếm">
            <span class="material-symbols-outlined" style="font-size:22px">search</span>
          </button>
          <a href="${base}index.html#contact" class="ch-cta" id="chNavCta">${ctaLabel}</a>
          <button class="ch-icon ch-mobile-btn" id="chMobileBtn" title="Menu">
            <span class="material-symbols-outlined" style="font-size:22px">menu</span>
          </button>
        </div>
      </div>
      <div class="ch-mobile" id="chMobile">${mobileLinks}</div>
    `;
  }

  // ─── Inject nav ────────────────────────────────────────────
  function injectNav(menus, brand, logoUrl, cta) {
    let nav = document.getElementById('chSiteNav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'chSiteNav';
      document.body.insertBefore(nav, document.body.firstChild);
    }
    nav.innerHTML = buildNav(menus, brand, logoUrl, cta);

    // Mobile toggle
    const btn = document.getElementById('chMobileBtn');
    const mob = document.getElementById('chMobile');
    if (btn && mob) {
      btn.addEventListener('click', function() {
        mob.classList.toggle('open');
      });
    }
  }

  // ─── Default (trước khi fetch) ─────────────────────────────
  const DEFAULT_MENUS = [
    { label: 'Trang chủ',           slug: 'home',      type: 'page' },
    { label: 'Portfolio',           slug: 'portfolio', type: 'fixed', link: 'portfolio.html' },
    { label: 'Các Khóa Học',        slug: 'courses',   type: 'fixed', link: 'courses.html' },
    { label: 'Kiến thức môn học',   slug: 'knowledge', type: 'page' },
    { label: 'Nghiên cứu khoa học', slug: 'research',  type: 'fixed', link: 'research.html' },
  ];

  // ─── Load từ content.json ───────────────────────────────────
  async function updateFromData() {
    try {
      const r = await fetch(base + 'Data/content.json?t=' + Date.now());
      if (!r.ok) return;
      const data = JSON.parse(await r.text());

      const menus = (data.menus && data.menus.length) ? data.menus : DEFAULT_MENUS;
      const brand = data.nav_brand
        || (data.banner && data.banner.name)
        || (data.home && data.home.name)
        || 'Nguyễn Đức';
      const logoUrl = data.nav_logo || '';
      const cta = data.nav_cta || 'Bắt Đầu';

      injectNav(menus, brand, logoUrl, cta);
    } catch(e) { /* Giữ nguyên default nếu lỗi */ }
  }

  // ─── Init ───────────────────────────────────────────────────
  function init() {
    injectNav(DEFAULT_MENUS, 'Nguyễn Đức', '', 'Bắt Đầu');
    updateFromData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
