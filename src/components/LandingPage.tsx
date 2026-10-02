import React, { useEffect, useState } from 'react';
import { GraduationCap, LogIn, UserPlus, ArrowRight, ExternalLink } from 'lucide-react';
import { AppSettings, UserAccount } from '../types';
import { MODULE_REGISTRY, isModuleHidden, resolveModuleMeta } from '../lib/modules';
import { getCachedLanding, getLandingConfig, LandingBanner, LandingConfig } from '../lib/landing';
import { setDefaultApps } from '../lib/moduleAccess';

// Trang đầu của EduGo cho khách: giới thiệu tiện ích, nút Đăng nhập và Đăng ký, lưới banner do admin quản lý.
// Bố cục giống trang Thư viện bên trong nhưng không có thanh bên và không mở ứng dụng.

const COLORS: Record<string, { bg: string; text: string }> = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-500' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-500' },
  red: { bg: 'bg-red-100', text: 'text-red-500' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-500' },
};

// Các mục quản trị không giới thiệu ở trang đầu.
const HIDDEN_ON_LANDING = new Set(['users', 'permissions', 'settings', 'notifications', 'notifications_admin']);

const SIZE_CLASS: Record<string, string> = {
  normal: '',
  wide: 'sm:col-span-2',
  tall: 'row-span-2',
  big: 'sm:col-span-2 row-span-2',
};

function Banner({ b }: { b: LandingBanner }) {
  const external = !!b.link && /^https?:\/\//i.test(b.link) && !b.link.startsWith(window.location.origin);
  const inner = (
    <>
      {b.image
        ? <img src={b.image} alt={b.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        : <div className="absolute inset-0 bg-gradient-to-br from-brand-light to-white" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-left">
        <p className="text-base font-bold leading-snug text-white drop-shadow-sm">{b.title}</p>
        {b.desc && <p className="mt-1 line-clamp-2 text-[13px] text-white/85">{b.desc}</p>}
        {b.link && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">
            Xem thêm {external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </span>
        )}
      </div>
    </>
  );
  const cls = `group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm ${SIZE_CLASS[b.size || 'normal'] || ''}`;
  return b.link
    ? <a href={b.link} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={cls}>{inner}</a>
    : <div className={cls}>{inner}</div>;
}

export default function LandingPage({ settings, currentUser, onLogin, onRegister, onEnter }: {
  settings: AppSettings;
  currentUser: UserAccount | null;
  onLogin: () => void;
  onRegister: () => void;
  onEnter: () => void;
}) {
  const [cfg, setCfg] = useState<LandingConfig>(getCachedLanding());
  useEffect(() => {
    getLandingConfig().then(c => { setCfg(c); setDefaultApps(c.defaultApps); }).catch(() => {});
  }, []);

  const features = MODULE_REGISTRY
    .filter(m => !HIDDEN_ON_LANDING.has(m.id) && !isModuleHidden(m.id, settings))
    .map(m => resolveModuleMeta(m, settings));

  const hasBg = !!settings.dashboardBannerImage;
  const title = cfg.heroTitle || 'Nền tảng học tập và làm việc trực tuyến';
  const desc = cfg.heroDesc || 'Quản lý lớp học, bài tập, trắc nghiệm, bài giảng E-Learning, dựng phim, AR, VR 360 và nhiều tiện ích khác, gom vào một chỗ.';

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Thanh đầu trang */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {settings.webAppIcon
              ? <img src={settings.webAppIcon} alt="EduGo" className="h-9 w-9 rounded-xl object-cover" />
              : <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><GraduationCap className="h-5 w-5" /></span>}
            <span className="truncate font-display text-lg font-bold text-slate-800">EduGo</span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <button onClick={onEnter} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
                Vào EduGo <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button onClick={onLogin} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-brand/40 hover:text-brand">
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </button>
                <button onClick={onRegister} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
                  <UserPlus className="h-4 w-4" /> Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 md:py-8">
        {/* Khối giới thiệu đầu trang, cùng kiểu với trang Thư viện bên trong */}
        <section
          className="relative overflow-hidden rounded-3xl border border-slate-100"
          style={hasBg
            ? { backgroundImage: `url(${settings.dashboardBannerImage})`, backgroundSize: 'cover', backgroundPosition: settings.dashboardBannerPosition || 'center' }
            : { background: 'linear-gradient(135deg, var(--color-brand-light, #ecfdf5) 0%, #ffffff 55%, var(--color-brand-light, #ecfdf5) 100%)' }}
        >
          {hasBg && <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/35 to-white/55" />}
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-12 text-center md:py-16">
            <h1 className="font-display text-4xl font-black tracking-tight text-brand md:text-5xl">EduGo</h1>
            <p className="text-lg font-bold text-slate-800 md:text-xl">{title}</p>
            <p className="text-sm text-slate-600 md:text-base">{desc}</p>
            {!currentUser ? (
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button onClick={onRegister} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
                  <UserPlus className="h-4 w-4" /> Đăng ký miễn phí
                </button>
                <button onClick={onLogin} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:border-brand/40 hover:text-brand">
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </button>
              </div>
            ) : (
              <button onClick={onEnter} className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
                Vào EduGo <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        {/* Lưới banner do admin quản lý */}
        {cfg.banners.length > 0 && (
          <section>
            <div className="grid auto-rows-[200px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cfg.banners.map(b => <Banner key={b.id} b={b} />)}
            </div>
          </section>
        )}

        {/* Giới thiệu tiện ích */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Tiện ích trong EduGo</h2>
            <p className="mt-1 text-[13px] text-slate-500">Đăng ký tài khoản để bắt đầu dùng các tiện ích dưới đây.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map(m => {
              const Icon = m.icon; const c = COLORS[m.color] || COLORS.emerald;
              return (
                <div key={m.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl ${c.bg} ${c.text}`}>
                    {m.iconUrl ? <img src={m.iconUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-[13px] text-slate-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} EduGo</span>
          <a href="/tracuu.html" className="font-semibold hover:text-brand">Tra cứu điểm báo khoa học</a>
        </div>
      </footer>
    </div>
  );
}
