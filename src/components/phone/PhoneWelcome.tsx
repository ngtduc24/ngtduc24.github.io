import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import type { AppSettings, UserAccount } from '../../types';
import { getCachedLanding, getLandingConfig, PhoneWelcomeConfig, PhoneWelcomeBanner } from '../../lib/landing';
import { setDefaultApps } from '../../lib/moduleAccess';
import { loginWithPassword, registerAccount, sendResetMail } from '../../lib/authActions';
import './phoneWelcome.css';

// Màn chào EduGo trên điện thoại khi chưa đăng nhập: nền minh hoạ phủ kín màn hình, lời chào, banner quảng cáo,
// thẻ kính mờ có sẵn ô đăng nhập. Bấm chữ đăng ký thì thẻ chuyển sang ô đăng ký ngay tại chỗ, không mở bảng nổi.
// Admin chỉnh nền, lời chào, kính mờ, banner trong Cấu hình hệ thống, mục Trang đầu.

export const PW_TONES = [
  'linear-gradient(135deg,#7c3aed,#db2777)', 'linear-gradient(135deg,#0f766e,#22c55e)', 'linear-gradient(135deg,#1d4ed8,#06b6d4)',
  'linear-gradient(135deg,#be123c,#fb7185)', 'linear-gradient(135deg,#a16207,#facc15)', 'linear-gradient(135deg,#334155,#64748b)',
];
export const PW_COLORS = ['#059669', '#0284c7', '#7c3aed', '#e11d48', '#ea580c', '#0f172a'];
export const PW_DEFAULT_BANNERS: PhoneWelcomeBanner[] = [
  { id: 'd1', tag: 'Giảng viên', title: 'Soạn bài giảng và giao Quizz ngay trên điện thoại', sub: 'Tạo lớp, giao bài, chấm điểm trong vài chạm', tone: 0, on: true },
  { id: 'd2', tag: 'Sinh viên', title: 'Nộp bài, làm Quizz, xem điểm mọi lúc', sub: 'Nhận nhắc hạn nộp và kết quả chấm ngay khi có', tone: 2, on: true },
];

export function shadeHex(h: string, p: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); if (!m) return h;
  const n = parseInt(m[1], 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = p < 0 ? 0 : 255, t = Math.abs(p) / 100;
  r = Math.round((f - r) * t + r); g = Math.round((f - g) * t + g); b = Math.round((f - b) * t + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Các nền minh hoạ có sẵn (vẽ bằng SVG nên nhẹ, nét trên mọi màn hình)
export const PW_ART: Record<string, { name: string; top: (c: string) => string; thumb: (c: string) => string; svg: (c: string) => string }> = {
  edugo: {
    name: 'EduGo', top: c => shadeHex(c, -45), thumb: c => `linear-gradient(160deg,${shadeHex(c, -45)},${c})`,
    svg: c => `<defs><linearGradient id="pwa1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shadeHex(c, -45)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shadeHex(c, 25)}"/></linearGradient></defs>
    <rect width="390" height="844" fill="url(#pwa1)"/>
    <circle cx="330" cy="120" r="120" fill="#fff" opacity=".07"/><circle cx="40" cy="300" r="90" fill="#fff" opacity=".06"/>
    <g opacity=".9" transform="translate(262 262) scale(.85)"><path d="M90 30 45 8 0 30l45 22z" fill="#fde68a"/><path d="M18 40v24c14 10 40 10 54 0V40l-27 13z" fill="#fbbf24"/><path d="M90 30v26" stroke="#fde68a" stroke-width="3"/><circle cx="90" cy="58" r="4" fill="#fde68a"/></g>
    <g transform="translate(250 318) scale(.8)"><rect x="0" y="40" width="70" height="12" rx="3" fill="#fff" opacity=".9"/><rect x="6" y="28" width="62" height="12" rx="3" fill="#a7f3d0"/><rect x="2" y="16" width="66" height="12" rx="3" fill="#fff" opacity=".75"/></g>
    <path d="M0 360 C80 320 150 380 230 345 S350 310 390 330 V844 H0Z" fill="#fff" opacity=".1"/>
    <path d="M0 400 C90 370 170 420 260 385 S360 365 390 375 V844 H0Z" fill="#fff" opacity=".12"/>`,
  },
  dawn: {
    name: 'Bình minh', top: () => '#9a3412', thumb: () => 'linear-gradient(160deg,#7c2d12,#fb923c,#fde68a)',
    svg: () => `<defs><linearGradient id="pwa2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a3412"/><stop offset=".5" stop-color="#f97316"/><stop offset="1" stop-color="#fcd34d"/></linearGradient></defs>
    <rect width="390" height="844" fill="url(#pwa2)"/><circle cx="290" cy="300" r="70" fill="#fef3c7" opacity=".85"/>
    <path d="M0 330 L70 270 L120 310 L190 240 L260 320 L320 280 L390 320 V844 H0Z" fill="#7c2d12" opacity=".35"/>
    <path d="M0 380 C100 340 200 400 390 360 V844 H0Z" fill="#431407" opacity=".35"/>
    <g stroke="#fff" stroke-width="2" fill="none" opacity=".7"><path d="M70 150q6-5 12 0q6-5 12 0"/><path d="M110 130q5-4 10 0q5-4 10 0"/></g>`,
  },
  night: {
    name: 'Đêm sao', top: () => '#020617', thumb: () => 'linear-gradient(160deg,#020617,#1e3a8a)',
    svg: () => `<defs><linearGradient id="pwa3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset=".6" stop-color="#1e3a8a"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
    <rect width="390" height="844" fill="url(#pwa3)"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 390}" cy="${(i * 53) % 300 + 20}" r="${i % 3 ? 1 : 1.8}" fill="#fff" opacity="${0.4 + (i % 5) / 10}"/>`).join('')}
    <circle cx="330" cy="262" r="26" fill="#fef9c3"/><circle cx="341" cy="254" r="23" fill="#14286b"/>
    <path d="M0 400 h40v-60h30v40h25v-80h40v70h20v-40h35v60h30v-100h45v90h30v-50h40v70h55V844H0Z" fill="#020617" opacity=".75"/>`,
  },
  campus: {
    name: 'Giảng đường', top: () => '#0c4a6e', thumb: () => 'linear-gradient(160deg,#0c4a6e,#38bdf8)',
    svg: () => `<defs><linearGradient id="pwa4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c4a6e"/><stop offset=".6" stop-color="#0ea5e9"/><stop offset="1" stop-color="#bae6fd"/></linearGradient></defs>
    <rect width="390" height="844" fill="url(#pwa4)"/>
    <ellipse cx="80" cy="110" rx="40" ry="14" fill="#fff" opacity=".5"/><ellipse cx="300" cy="80" rx="50" ry="16" fill="#fff" opacity=".4"/>
    <g transform="translate(120 230)" fill="#fff"><path d="M75 0 150 35H0z" opacity=".95"/><rect x="10" y="38" width="130" height="8" opacity=".9"/>${[20, 45, 70, 95, 120].map(x => `<rect x="${x}" y="50" width="10" height="70" opacity=".85"/>`).join('')}<rect x="0" y="120" width="150" height="10" opacity=".95"/></g>
    <path d="M0 380 C120 350 260 390 390 360 V844 H0Z" fill="#14532d" opacity=".35"/>`,
  },
};

const TXT = {
  vi: { m: 'Chào buổi sáng', a: 'Chào buổi chiều', e: 'Chào buổi tối', login: 'Đăng nhập', reg: 'Đăng ký', user: 'Email hoặc tên đăng nhập', pass: 'Mật khẩu', forgot: 'Quên mật khẩu?',
    toReg: <>Nếu bạn chưa có tài khoản hãy <b>đăng ký</b></>, regTitle: 'Tạo tài khoản EduGo', regSub: 'Giảng viên và sinh viên đăng ký miễn phí', name: 'Họ và tên', mail: 'Email', newPass: 'Mật khẩu, ít nhất 6 ký tự',
    toLogin: <>Đã có tài khoản? <b>Đăng nhập</b></>, bell: 'Đăng nhập để xem thông báo của bạn.', busy: 'Đang xử lý...' },
  en: { m: 'Good morning', a: 'Good afternoon', e: 'Good evening', login: 'Sign in', reg: 'Sign up', user: 'Email or username', pass: 'Password', forgot: 'Forgot password?',
    toReg: <>No account yet? <b>Sign up</b></>, regTitle: 'Create your EduGo account', regSub: 'Free for lecturers and students', name: 'Full name', mail: 'Email', newPass: 'Password, at least 6 characters',
    toLogin: <>Already have an account? <b>Sign in</b></>, bell: 'Sign in to see your notifications.', busy: 'Please wait...' },
};

const Ic = {
  cap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.7a6 6 0 0 1 10 0" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.9 4.2A10 10 0 0 1 12 4c6.4 0 10 8 10 8a17 17 0 0 1-2.2 3.3M6.6 6.6A17 17 0 0 0 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6" /><path d="m2 2 20 20" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>,
};

const isExternal = (link: string) => /^https?:\/\//i.test(link) && !link.startsWith(window.location.origin);

export default function PhoneWelcome({ settings, users = [], onLoginSuccess, initialMode = 'login', preview }: {
  settings?: AppSettings; users?: UserAccount[]; onLoginSuccess?: (u: UserAccount) => void;
  initialMode?: 'login' | 'register';
  preview?: PhoneWelcomeConfig; // xem trước trong cài đặt admin: dùng cấu hình đang sửa, không đăng nhập thật
}) {
  const [loaded, setLoaded] = useState<PhoneWelcomeConfig>(() => getCachedLanding().phone || {});
  useEffect(() => {
    if (preview) return;
    getLandingConfig().then(c => { setLoaded(c.phone || {}); setDefaultApps(c.defaultApps); }).catch(() => {});
  }, [!!preview]); // eslint-disable-line react-hooks/exhaustive-deps
  const cfg = preview || loaded;
  const allowReg = cfg.allowRegister !== false;
  const [mode, setMode] = useState<'login' | 'register'>(initialMode === 'register' && allowReg ? 'register' : 'login');
  useEffect(() => { if (!allowReg && mode === 'register') setMode('login'); }, [allowReg, mode]);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const t = TXT[lang];

  // Màu chủ đạo: màu admin chọn riêng, không có thì theo màu hệ thống.
  const [sysColor, setSysColor] = useState('#059669');
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-hover').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) setSysColor(v);
  }, [settings]);
  const color = cfg.color && /^#[0-9a-f]{6}$/i.test(cfg.color) ? cfg.color : sysColor;
  const artKey = cfg.bg === 'image' && cfg.bgImage ? 'image' : (cfg.bg && cfg.bg !== 'image' && PW_ART[cfg.bg] ? cfg.bg : 'edugo');
  const topColor = artKey === 'image' ? '#0f172a' : PW_ART[artKey].top(color);

  // Thanh trạng thái iPhone (tai thỏ) cùng màu phần trên của nền.
  useEffect(() => {
    if (preview) return;
    const html = document.documentElement; const before = html.style.backgroundColor;
    html.style.backgroundColor = topColor; document.body.style.backgroundColor = topColor;
    let m = document.querySelector('meta[name="theme-color"]'); const prev = m?.getAttribute('content') ?? null;
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
    m.setAttribute('content', topColor);
    return () => { html.style.backgroundColor = before; document.body.style.backgroundColor = ''; if (prev === null) m?.remove(); else m?.setAttribute('content', prev); };
  }, [topColor, !!preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const shade = Math.min(70, Math.max(0, cfg.shade ?? 20)) / 100;
  const hour = new Date().getHours();
  const greet = cfg.hiMode === 'fixed' && cfg.hiFixed?.trim() ? cfg.hiFixed : hour < 11 ? t.m : hour < 18 ? t.a : t.e;
  const hiBig = cfg.hiBig?.trim() || 'Học, dạy và nghiên cứu trong một ứng dụng';
  const cardTitle = cfg.cardTitle?.trim() || 'Xin chào bạn';
  const cardSub = cfg.cardSub?.trim() || 'Đăng nhập để vào lớp học, bài giảng của bạn';
  const glass = cfg.glass !== false;
  const ga = Math.min(95, Math.max(20, cfg.glassAlpha ?? 55)) / 100;
  const gb = Math.min(40, Math.max(0, cfg.glassBlur ?? 18));

  // Banner quảng cáo phía trên thẻ đăng nhập, tự chuyển và vuốt được
  const banners = useMemo(() => (cfg.bannersOn === false ? [] : (cfg.banners || PW_DEFAULT_BANNERS).filter(b => b.on !== false && (b.title || b.image))), [cfg.bannersOn, cfg.banners]);
  const [bi, setBi] = useState(0);
  const sec = Math.min(10, Math.max(3, cfg.bannerSec ?? 4));
  useEffect(() => { if (bi >= banners.length) setBi(0); }, [banners.length, bi]);
  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setBi(i => (i + 1) % banners.length), sec * 1000);
    return () => clearInterval(id);
  }, [banners.length, sec, bi]);
  const x0 = useRef<number | null>(null);
  const moved = useRef(false);
  const openBanner = (b: PhoneWelcomeBanner) => {
    if (preview || moved.current || !b.link) return;
    if (isExternal(b.link)) window.open(b.link, '_blank', 'noopener'); else window.location.href = b.link;
  };

  // Ô nhập và xử lý đăng nhập, đăng ký, quên mật khẩu
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [name, setName] = useState(''); const [mail, setMail] = useState(''); const [np, setNp] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const switchMode = (m: 'login' | 'register') => { setMode(m); setMsg(null); setShow(false); };
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault(); if (preview || busy) return;
    if (!u.trim() || !p) { setMsg({ text: 'Nhập email hoặc tên đăng nhập và mật khẩu.' }); return; }
    setBusy(true); setMsg(null);
    try { const user = await loginWithPassword(users, u, p); onLoginSuccess?.(user); }
    catch (err: any) { setMsg({ text: err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.' }); }
    setBusy(false);
  };
  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault(); if (preview || busy) return;
    setBusy(true); setMsg(null);
    try { const user = await registerAccount(name, mail, np); onLoginSuccess?.(user); }
    catch (err: any) { setMsg({ text: err?.message || 'Không tạo được tài khoản. Vui lòng thử lại.' }); }
    setBusy(false);
  };
  const doForgot = async () => {
    if (preview || busy) return;
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await sendResetMail(users, u) }); }
    catch (err: any) { setMsg({ text: err?.message || 'Chưa gửi được thư đặt lại mật khẩu.' }); }
    setBusy(false);
  };

  const eyeBtn = <button type="button" className="eye" onClick={() => setShow(v => !v)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{show ? Ic.eyeOff : Ic.eye}</button>;
  const style = { '--pw-c': color, '--pw-b': shadeHex(color, 18) } as React.CSSProperties;

  return (
    <div className={`pw ${preview ? 'pv' : ''}`} style={style}>
      <div className="art" aria-hidden>
        {artKey === 'image'
          ? <div className="photo" style={{ backgroundImage: `url(${cfg.bgImage})`, backgroundPosition: cfg.bgPosition || 'center' }} />
          : <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice" dangerouslySetInnerHTML={{ __html: PW_ART[artKey].svg(color) }} />}
        <div className="shade" style={{ background: `linear-gradient(180deg,rgba(0,0,0,${shade}) 0%,rgba(0,0,0,${shade / 2}) 60%,transparent 100%)` }} />
      </div>
      <div className="view">
        <div className="top">
          <div className="logo"><span className="mk">{settings?.webAppIcon ? <img src={settings.webAppIcon} alt="" /> : Ic.cap}</span><span>EduGo</span></div>
          <div className="tr">
            <button type="button" className="lang" onClick={() => setLang(l => (l === 'vi' ? 'en' : 'vi'))} aria-label="Đổi ngôn ngữ">
              <i className={lang === 'en' ? 'en' : ''}>{lang === 'vi' ? '★' : 'EN'}</i><span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            </button>
            <button type="button" className="ib" aria-label="Thông báo" onClick={() => { setMode('login'); setMsg({ text: t.bell }); }}>{Ic.bell}</button>
          </div>
        </div>
        <div className="hello"><small>{greet}</small><h2>{hiBig}</h2></div>
        <div className="grow" />

        {mode === 'login' && banners.length > 0 && (
          <div className="ban">
            <div className="trk" style={{ transform: `translateX(-${bi * 100}%)` }}
              onPointerDown={e => { x0.current = e.clientX; moved.current = false; }}
              onPointerUp={e => {
                if (x0.current === null) return;
                const dx = e.clientX - x0.current; x0.current = null;
                if (Math.abs(dx) > 30 && banners.length > 1) { moved.current = true; setBi(i => (i + (dx < 0 ? 1 : banners.length - 1)) % banners.length); }
              }}>
              {banners.map(b => (
                <div key={b.id} role={b.link ? 'link' : undefined} className={`slide ${b.image ? 'img' : ''}`} onClick={() => openBanner(b)}
                  style={b.image ? { backgroundImage: `url(${b.image})` } : { background: PW_TONES[(b.tone ?? 0) % PW_TONES.length] }}>
                  {b.tag && <span className="tg">{b.tag}</span>}
                  <b>{b.title}</b>
                  {b.sub && <span className="s">{b.sub}</span>}
                  {b.btn && b.link && <span className="go">{b.btn}</span>}
                  {!b.image && <svg className="dec" viewBox="0 0 100 100" aria-hidden><circle cx="70" cy="70" r="45" fill="#fff" opacity=".15" /><circle cx="72" cy="72" r="28" fill="#fff" opacity=".18" /><path d="M58 64 72 57l14 7-14 7z" fill="#fff" opacity=".9" /></svg>}
                </div>
              ))}
            </div>
            {banners.length > 1 && <div className="dots">{banners.map((b, i) => <i key={b.id} className={i === bi ? 'on' : ''} />)}</div>}
          </div>
        )}

        <div className={`card ${glass ? 'glass' : ''}`} style={{ '--ga': ga, '--gb': `${gb}px` } as React.CSSProperties}>
          {mode === 'login' ? (
            <form key="l" className="anim" onSubmit={doLogin} noValidate>
              <div className="hi2"><b>{cardTitle}</b><span>{cardSub}</span></div>
              <label className="ipt">{Ic.user}<input value={u} onChange={e => setU(e.target.value)} placeholder={t.user} autoComplete="username" autoCapitalize="none" inputMode="email" enterKeyHint="next" /></label>
              <label className="ipt">{Ic.lock}<input type={show ? 'text' : 'password'} value={p} onChange={e => setP(e.target.value)} placeholder={t.pass} autoComplete="current-password" enterKeyHint="go" />{eyeBtn}</label>
              {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`} role="alert">{msg.text}</div>}
              <button type="button" className="fg" onClick={doForgot}>{t.forgot}</button>
              <button type="submit" className="go2" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />{t.busy}</> : <><LogIn />{t.login}</>}</button>
              {allowReg && <button type="button" className="swp" onClick={() => switchMode('register')}>{t.toReg}</button>}
            </form>
          ) : (
            <form key="r" className="anim" onSubmit={doRegister} noValidate>
              <div className="hi2"><b>{t.regTitle}</b><span>{t.regSub}</span></div>
              <label className="ipt">{Ic.user}<input value={name} onChange={e => setName(e.target.value)} placeholder={t.name} autoComplete="name" enterKeyHint="next" /></label>
              <label className="ipt">{Ic.mail}<input type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder={t.mail} autoComplete="email" autoCapitalize="none" inputMode="email" enterKeyHint="next" /></label>
              <label className="ipt">{Ic.lock}<input type={show ? 'text' : 'password'} value={np} onChange={e => setNp(e.target.value)} placeholder={t.newPass} autoComplete="new-password" enterKeyHint="go" />{eyeBtn}</label>
              {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`} role="alert">{msg.text}</div>}
              <button type="submit" className="go2" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />{t.busy}</> : <><UserPlus />{t.reg}</>}</button>
              <button type="button" className="swp" onClick={() => switchMode('login')}>{t.toLogin}</button>
            </form>
          )}
        </div>
        <div className="foot" />
      </div>
    </div>
  );
}
