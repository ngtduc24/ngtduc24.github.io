// ============================================================
// _nav.js — Menu dùng chung cho TẤT CẢ các trang
// Cách dùng: <script src="_nav.js"></script>  (trang gốc)
//            <script src="../_nav.js"></script> (trang con admin/)
// ============================================================
(function () {
  // Detect base path (admin/ cần ../  để quay lại gốc)
  const isAdmin = location.pathname.includes('/admin');
  const base = isAdmin ? '../' : '';

  // ── Load data rồi render nav ──
  async function loadAndRender() {
    let data = {};
    try {
      const r = await fetch(base + 'data/content.json?t=' + Date.now());
      if (r.ok) {
        const txt = await r.text();
        data = JSON.parse(txt);
      }
    } catch (e) {}

    // Lấy menu từ data.menus hoặc dùng mặc định
    const defaultMenus = [
      { label: 'Trang chủ',           href: 'index.html' },
      { label: 'Portfolio',           href: 'index.html#portfolio' },
      { label: 'Các Khóa Học',        href: 'courses.html' },
      { label: 'Kiến thức môn học',   href: 'knowledge.html' },
      { label: 'Nghiên cứu khoa học', href: 'research.html' },
    ];
    const menus = (data.menus && data.menus.length) ? data.menus : defaultMenus;

    // Brand (logo hoặc tên)
    const brand = data.nav_brand || (data.banner && data.banner.name) || (data.home && data.home.name) || 'CreativeHub';
    const logoUrl = data.nav_logo || '';          // URL ảnh logo (nếu có)
    const ctaLabel = data.nav_cta || 'Bắt Đầu';  // Nút CTA

    // Detect trang hiện tại để highlight active
    const curFile = location.pathname.split('/').pop() || 'index.html';
    const curHash = location.hash; // vd: #courses

    function isActive(href) {
      const hrefFile = href.split('#')[0].split('/').pop() || 'index.html';
      const hrefHash = href.includes('#') ? '#' + href.split('#')[1] : '';
      if (hrefFile === curFile) {
        if (hrefHash && curHash) return hrefHash === curHash;
        return true;
      }
      return false;
    }

    // Build logo HTML
    const logoHtml = logoUrl
      ? `<img src="${base}${logoUrl}" alt="${brand}" class="h-8 w-auto object-contain">`
      : `<span id="nav-brand-text">${brand}</span>`;

    // Build nav links
    const linksHtml = menus.map(m => {
      const href = base + m.href;
      const active = isActive(m.href);
      return `<a href="${href}" class="nav-item${active ? ' nav-active' : ''}">${m.label}</a>`;
    }).join('');

    // Insert styles
    if (!document.getElementById('_nav_styles')) {
      const style = document.createElement('style');
      style.id = '_nav_styles';
      style.textContent = `
        #_site_nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(249,249,255,0.85);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 1px 0 rgba(199,196,215,0.4), 0 4px 20px rgba(70,72,212,0.06);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        #_site_nav .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1280px; margin: 0 auto; padding: 0 20px; height: 64px; gap: 8px;
        }
        #_site_nav .nav-brand {
          font-size: 1.25rem; font-weight: 800; color: #4648d4;
          text-decoration: none; letter-spacing: -0.02em;
          flex-shrink: 0; display: flex; align-items: center;
        }
        #_site_nav .nav-links {
          display: flex; align-items: center; gap: 2px; flex: 1;
        }
        #_site_nav .nav-item {
          padding: 8px 14px; border-radius: 999px;
          font-size: 14px; font-weight: 700; color: #464554;
          text-decoration: none; white-space: nowrap;
          transition: background .15s, color .15s;
        }
        #_site_nav .nav-item:hover { color: #4648d4; background: rgba(70,72,212,0.08); }
        #_site_nav .nav-active {
          color: #4648d4 !important;
          background: rgba(70,72,212,0.1) !important;
        }
        #_site_nav .nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        #_site_nav .nav-icon-btn {
          width: 36px; height: 36px; border-radius: 999px; border: none;
          background: transparent; color: #464554; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s;
        }
        #_site_nav .nav-icon-btn:hover { background: rgba(70,72,212,0.08); color: #4648d4; }
        #_site_nav .nav-cta {
          background: #4648d4; color: #fff;
          font-size: 14px; font-weight: 700;
          padding: 9px 22px; border-radius: 999px;
          text-decoration: none; border: none; cursor: pointer;
          transition: background .2s, transform .15s;
          box-shadow: 0 4px 14px rgba(70,72,212,0.3);
        }
        #_site_nav .nav-cta:hover { background: #3537b8; transform: scale(1.03); }
        @media (max-width: 1024px) { #_site_nav .nav-links { display: none; } }
        @media (max-width: 640px)  { #_site_nav .nav-cta { display: none; } }
      `;
      document.head.appendChild(style);
    }

    // Build HTML
    const navEl = document.createElement('nav');
    navEl.id = '_site_nav';
    navEl.innerHTML = `
      <div class="nav-inner">
        <a href="${base}index.html" class="nav-brand">${logoHtml}</a>
        <div class="nav-links">${linksHtml}</div>
        <div class="nav-actions">
          <button class="nav-icon-btn" title="Tìm kiếm">
            <span class="material-symbols-outlined" style="font-size:22px">search</span>
          </button>
          <button class="nav-icon-btn" title="Thông báo">
            <span class="material-symbols-outlined" style="font-size:22px">notifications</span>
          </button>
          <a href="${base}index.html#contact" class="nav-cta">${ctaLabel}</a>
        </div>
      </div>`;

    // Insert trước body content (sau khi DOM sẵn sàng)
    document.body.insertBefore(navEl, document.body.firstChild);
  }

  // Chạy khi DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndRender);
  } else {
    loadAndRender();
  }
})();
