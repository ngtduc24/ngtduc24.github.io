import React, { useEffect } from 'react';
import { usePhoneMaybe } from '../phone/PhoneShell';
import { ArrowLeft } from 'lucide-react';

// Header cố định khi cuộn cho các trang xem chi tiết (bài tập, giáo trình trong ứng dụng).
// Máy tính hiện đủ chữ trên nút, điện thoại chỉ hiện biểu tượng cho gọn một hàng.
export interface HeadAction { key: string; label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }
export default function StickyHead({ onBack, backTitle, icon, title, subtitle, actions }: {
  onBack?: () => void; backTitle?: string; icon?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; actions?: HeadAction[];
}) {
  const phone = usePhoneMaybe();
  const own = !!phone && !!onBack;
  // Điện thoại: header này thay luôn thanh trên của ứng dụng (giống trang xem giáo trình), không hiện 2 thanh chồng nhau.
  useEffect(() => {
    if (!own) return;
    document.documentElement.classList.add('ph-own-head');
    return () => document.documentElement.classList.remove('ph-own-head');
  }, [own]);
  if (own) return (
    <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-3 border-b border-slate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90"
      style={{ borderTop: 'env(safe-area-inset-top) solid var(--color-brand-hover, #059669)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onBack} title={backTitle} aria-label={backTitle || 'Quay lại'} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-[14px] font-bold leading-snug text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        {!!actions?.length && (
          <div className="flex shrink-0 items-center gap-1.5">
            {actions.map(a => (
              <button key={a.key} onClick={a.onClick} title={a.label} aria-label={a.label}
                className={`grid h-9 min-w-9 place-items-center rounded-xl px-2.5 ${a.primary ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                {a.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 pb-1 pt-0 sm:-mx-2 sm:px-2">
      <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white/95 p-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:gap-4 sm:p-4">
        {onBack && <button onClick={onBack} title={backTitle} aria-label={backTitle || 'Quay lại'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-brand-light hover:text-brand sm:h-11 sm:w-11"><ArrowLeft className="h-5 w-5" /></button>}
        {icon && <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand sm:grid">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-[15px] font-black leading-snug tracking-tight text-slate-900 sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>
        {!!actions?.length && (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {actions.map(a => (
              <button key={a.key} onClick={a.onClick} title={a.label} aria-label={a.label}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition-colors sm:px-3 ${a.primary ? 'bg-brand text-white hover:bg-brand-hover' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand/30 hover:text-brand'}`}>
                {a.icon}<span className="hidden sm:inline">{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
