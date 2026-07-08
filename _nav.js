// _nav.js — Shared navigation (dark theme, transparent overlay)
(function(){
  if(location.pathname.includes('/admin')) return;
  var base = '';
  function slug(){var p=new URLSearchParams(location.search);return p.get('slug')||null;}
  function curFile(){return location.pathname.split('/').pop()||'index.html';}
  function href(m){if(m.slug==='home') return base+'index.html';return base+'page.html?slug='+m.slug;}
  function isActive(m){var f=curFile(),s=slug();if(m.slug==='home') return f==='index.html'||f===''||f==='/';return f==='page.html'&&s===m.slug;}

  var css=document.createElement('style');
  css.textContent=`
#siteNav{position:fixed;top:0;left:0;right:0;z-index:50;background:transparent;transition:background .3s,box-shadow .3s;font-family:'Plus Jakarta Sans',sans-serif}
#siteNav.scrolled{background:rgba(10,15,10,.88);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 2px 20px rgba(0,0,0,.3);border-bottom:1px solid rgba(42,53,36,.3)}
.nv-inner{display:flex;align-items:center;justify-content:space-between;max-width:1280px;margin:0 auto;padding:0 24px;height:68px}
.nv-brand{font-size:1.15rem;font-weight:900;color:#b8ff00;text-decoration:none;letter-spacing:-.02em;display:flex;align-items:center;gap:8px;flex-shrink:0}
.nv-brand img{height:32px;width:auto;object-fit:contain}
.nv-links{display:flex;align-items:center;gap:2px;flex:1;justify-content:center}
.nv-item{position:relative;display:inline-block;padding-bottom:8px;margin-bottom:-8px}
.nv-link{display:inline-block;padding:7px 14px;border-radius:999px;font-size:13.5px;font-weight:600;color:rgba(200,212,184,.75);text-decoration:none;white-space:nowrap;transition:background .15s,color .15s}
.nv-link:hover{color:#fff;background:rgba(255,255,255,.06)}
.nv-link.active{color:#b8ff00;background:rgba(184,255,0,.08)}
.nv-link.has-child::after{content:'';display:inline-block;width:12px;height:12px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23c8d4b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") center/contain no-repeat;vertical-align:middle;margin-left:2px;opacity:.5;transition:transform .2s}
.nv-item:hover .nv-link.has-child::after{transform:rotate(180deg)}
.nv-drop{display:none;position:absolute;top:100%;left:0;min-width:180px;background:rgba(21,26,21,.95);backdrop-filter:blur(20px);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.5),0 0 0 1px rgba(42,53,36,.5);padding:5px 0;z-index:100;animation:nvF .15s ease}
@keyframes nvF{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
.nv-item:hover>.nv-drop{display:block}
.nv-drop a{display:block;padding:9px 16px;color:rgba(200,212,184,.8);font-weight:600;font-size:13.5px;white-space:nowrap;text-decoration:none;transition:background .12s,color .12s}
.nv-drop a:hover{background:rgba(184,255,0,.06);color:#b8ff00}
.nv-drop a.active{color:#b8ff00;background:rgba(184,255,0,.06)}
.nv-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.nv-cta{background:#b8ff00;color:#0a0f0a;font-size:13px;font-weight:800;padding:9px 22px;border-radius:999px;text-decoration:none;transition:all .2s;box-shadow:0 0 20px rgba(184,255,0,.15);white-space:nowrap}
.nv-cta:hover{box-shadow:0 0 36px rgba(184,255,0,.3);transform:scale(1.03)}
.nv-ham{display:none;width:36px;height:36px;border-radius:999px;border:none;background:transparent;color:rgba(200,212,184,.8);cursor:pointer;align-items:center;justify-content:center}
.nv-mob{display:none;flex-direction:column;max-width:1280px;margin:0 auto;padding:8px 24px 16px;background:rgba(10,15,10,.95);backdrop-filter:blur(20px)}
.nv-mob.open{display:flex}
.nv-mob a{padding:11px 8px;font-size:14px;font-weight:600;color:rgba(200,212,184,.8);text-decoration:none;border-bottom:1px solid rgba(42,53,36,.3);transition:color .15s}
.nv-mob a:last-child{border-bottom:none}
.nv-mob a:hover,.nv-mob a.active{color:#b8ff00}
.nv-mob .nv-sub a{padding-left:24px;font-size:13px;color:rgba(138,152,120,.8)}
@media(max-width:900px){.nv-links{display:none}.nv-ham{display:flex}}
@media(max-width:500px){.nv-cta{display:none}}`;
  document.head.appendChild(css);

  // Scroll effect
  var _scrollTimer;
  window.addEventListener('scroll',function(){
    if(_scrollTimer)return;
    _scrollTimer=requestAnimationFrame(function(){
      var nav=document.getElementById('siteNav');
      if(nav){if(window.scrollY>40)nav.classList.add('scrolled');else nav.classList.remove('scrolled');}
      _scrollTimer=null;
    });
  },{passive:true});

  var DEFAULT=[{label:'Trang chủ',slug:'home',children:[]},{label:'Portfolio',slug:'portfolio',children:[]},{label:'Khóa Học',slug:'courses',children:[]},{label:'Nghiên Cứu',slug:'blog',children:[]}];

  function build(menus,brand,logo,ctaLabel,ctaLink){
    var desk=menus.map(function(m){
      var a=isActive(m),hc=m.children&&m.children.length>0;
      var ch='';
      if(hc){ch='<div class="nv-drop">'+m.children.map(function(c){return '<a href="'+href(c)+'" class="'+(isActive(c)?'active':'')+'">'+c.label+'</a>';}).join('')+'</div>';}
      return '<div class="nv-item"><a href="'+href(m)+'" class="nv-link'+(a?' active':'')+(hc?' has-child':'')+'">'+m.label+'</a>'+ch+'</div>';
    }).join('');
    var mob=menus.map(function(m){
      var h='<a href="'+href(m)+'" class="'+(isActive(m)?'active':'')+'">'+m.label+'</a>';
      if(m.children&&m.children.length){h+='<div class="nv-sub">'+m.children.map(function(c){return '<a href="'+href(c)+'" class="'+(isActive(c)?'active':'')+'">'+c.label+'</a>';}).join('')+'</div>';}
      return h;
    }).join('');
    var logoH=logo?'<img src="'+base+logo+'" alt="'+brand+'">':'<span>'+brand+'</span>';
    return '<div class="nv-inner"><a href="'+base+'index.html" class="nv-brand">'+logoH+'</a><nav class="nv-links">'+desk+'</nav><div class="nv-actions"><a href="'+base+ctaLink+'" class="nv-cta">'+ctaLabel+'</a><button class="nv-ham" id="nvHam"><span class="material-symbols-outlined" style="font-size:22px">menu</span></button></div></div><div class="nv-mob" id="nvMob">'+mob+'</div>';
  }

  function inject(menus,brand,logo,ctaLabel,ctaLink){
    var nav=document.getElementById('siteNav');
    if(!nav){nav=document.createElement('nav');nav.id='siteNav';document.body.insertBefore(nav,document.body.firstChild);}
    nav.innerHTML=build(menus,brand,logo,ctaLabel,ctaLink);
    var btn=document.getElementById('nvHam'),mob=document.getElementById('nvMob');
    if(btn&&mob)btn.addEventListener('click',function(){mob.classList.toggle('open');});
  }

  async function init(){
    inject(DEFAULT,'Andy Nguyễn','','Liên Hệ','index.html#contact');
    try{
      var r=await fetch(base+'data/content.json?t='+Date.now());if(!r.ok)return;
      var d=await r.json();
      var menus=(d.menus&&d.menus.length)?d.menus:DEFAULT;
      var brand=(d.nav&&d.nav.brand)||d.banner&&d.banner.name||'Andy Nguyễn';
      var logo=(d.nav&&d.nav.logo_url)||'';
      var ctaLabel=(d.nav&&d.nav.cta_label)||'Liên Hệ';
      var ctaLink=(d.nav&&d.nav.cta_link)||'index.html#contact';
      inject(menus,brand,logo,ctaLabel,ctaLink);
    }catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
