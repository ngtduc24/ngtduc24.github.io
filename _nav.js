// SHARED NAV + FOOTER — included on every page
// Usage: <script src="../_nav.js"></script> or <script src="_nav.js"></script>

(function(){
  const pages = [
    { label: 'Trang chủ',           href: 'index.html' },
    { label: 'Portfolio',           href: 'portfolio.html' },
    { label: 'Các Khóa Học',        href: 'courses.html' },
    { label: 'Kiến thức môn học',   href: 'knowledge.html' },
    { label: 'Nghiên cứu khoa học', href: 'research.html' },
  ];

  function currentPage() {
    const p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function buildNav(base) {
    base = base || '';
    const cur = currentPage();
    return pages.map(p => {
      const href = base + p.href;
      const active = cur === p.href || (cur === '' && p.href === 'index.html');
      return `<a href="${href}" class="nav-link${active?' nav-active':''}">${p.label}</a>`;
    }).join('');
  }

  function buildFooterLinks(base) {
    base = base || '';
    return pages.map(p => `<a href="${base+p.href}" class="text-on-surface-variant hover:text-primary transition-colors text-sm">${p.label}</a>`).join('');
  }

  // Detect if we're in a subfolder
  const base = location.pathname.includes('/admin') ? '../' : '';

  // Inject global styles for nav
  const style = document.createElement('style');
  style.textContent = `
    .nav-link { font-size:15px; color:#464554; text-decoration:none; padding:6px 4px; transition:color .2s; position:relative; }
    .nav-link:hover { color:#4648d4; }
    .nav-active { color:#4648d4 !important; font-weight:700; }
    .nav-active::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px; background:#4648d4; border-radius:2px; }
    #site-header { background:rgba(249,249,255,0.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:0 4px 20px rgba(70,72,212,0.08); position:fixed; top:0; left:0; right:0; z-index:100; height:72px; display:flex; align-items:center; }
    #site-header .inner { max-width:1280px; margin:0 auto; padding:0 24px; width:100%; display:flex; justify-content:space-between; align-items:center; gap:32px; }
    #site-header .logo { font-size:1.25rem; font-weight:800; color:#4648d4; text-decoration:none; letter-spacing:-0.02em; white-space:nowrap; }
    #site-header nav { display:flex; gap:24px; align-items:center; }
    #site-header .actions { display:flex; gap:12px; align-items:center; flex-shrink:0; }
    #site-header .btn-signin { background:linear-gradient(135deg,#6063ee,#4648d4); color:#fff; font-weight:700; font-size:14px; padding:10px 22px; border-radius:999px; text-decoration:none; white-space:nowrap; box-shadow:0 4px 12px rgba(70,72,212,0.3); transition:opacity .2s,transform .15s; }
    #site-header .btn-signin:hover { opacity:.88; transform:translateY(-1px); }
    .site-footer { background:#f0f3ff; border-top:1px solid #e7eeff; padding:48px 24px 32px; margin-top:80px; }
    .site-footer .inner { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:32px; }
    .site-footer .brand { font-size:1.1rem; font-weight:800; color:#4648d4; margin-bottom:8px; }
    .site-footer .col-title { font-size:13px; font-weight:700; color:#111c2d; margin-bottom:12px; text-transform:uppercase; letter-spacing:.06em; }
    .site-footer .col-links { display:flex; flex-direction:column; gap:8px; }
    .site-footer .copyright { grid-column:1/-1; padding-top:24px; border-top:1px solid #c7c4d7; text-align:center; font-size:13px; color:#767586; }
    @media(max-width:900px){ #site-header nav{display:none;} .site-footer .inner{grid-template-columns:1fr 1fr;} }
    @media(max-width:600px){ .site-footer .inner{grid-template-columns:1fr;} }
    body { padding-top: 72px; }
  `;
  document.head.appendChild(style);

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', function(){
    // Build header
    const header = document.createElement('header');
    header.id = 'site-header';
    header.innerHTML = `
      <div class="inner">
        <a href="${base}index.html" class="logo">CreativeHub</a>
        <nav>${buildNav(base)}</nav>
        <div class="actions">
          <span class="material-symbols-outlined" style="color:#4648d4;cursor:pointer;font-size:22px">search</span>
          <span class="material-symbols-outlined" style="color:#4648d4;cursor:pointer;font-size:22px">notifications</span>
          <span class="material-symbols-outlined" style="color:#4648d4;cursor:pointer;font-size:22px">account_circle</span>
          <a href="#" class="btn-signin">Bắt đầu</a>
        </div>
      </div>`;
    document.body.insertBefore(header, document.body.firstChild);

    // Build footer
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="inner">
        <div>
          <div class="brand">CreativeHub</div>
          <p style="font-size:14px;color:#464554;line-height:1.6">Nền tảng học tập và sáng tạo Multimedia hàng đầu, kết nối sáng tạo và công nghệ.</p>
        </div>
        <div>
          <div class="col-title">Điều hướng</div>
          <div class="col-links">${buildFooterLinks(base)}</div>
        </div>
        <div>
          <div class="col-title">Liên kết</div>
          <div class="col-links">
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">About Us</a>
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">Contact</a>
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">Privacy Policy</a>
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">Terms of Service</a>
          </div>
        </div>
        <div>
          <div class="col-title">Kết nối</div>
          <div class="col-links">
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">Facebook</a>
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">Instagram</a>
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">LinkedIn</a>
            <a href="#" style="color:#464554;text-decoration:none;font-size:14px">YouTube</a>
          </div>
        </div>
        <div class="copyright">© 2024 Creative Multimedia LMS. All rights reserved.</div>
      </div>`;
    document.body.appendChild(footer);
  });
})();
