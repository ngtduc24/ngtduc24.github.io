import React from 'react';
import { Wrench, Lock, ShieldCheck } from 'lucide-react';

interface Props {
  variant: 1 | 2;
  date?: string;
  title?: string;
  onAdminLogin: () => void;
}

// Trang hiển thị khi hệ thống được admin tạm tắt. Có 2 giao diện theo lựa chọn của admin.
export default function MaintenanceScreen({ variant, date, title, onAdminLogin }: Props) {
  const isUpgrade = variant === 2;
  const dateText = (() => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  })();

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-xl">
        <div className={`mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl ${isUpgrade ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>
          {isUpgrade ? <Wrench className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>

        {title && <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-brand">{title}</p>}

        {isUpgrade ? (
          <>
            <h1 className="font-display text-2xl font-black text-slate-900">Hệ thống đang nâng cấp</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Chúng tôi đang bảo trì và nâng cấp hệ thống để phục vụ tốt hơn.
              {dateText ? <> Vui lòng truy cập lại vào ngày {dateText}.</> : <> Vui lòng quay lại sau.</>}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-black text-slate-900">Hệ thống tạm thời đóng</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Hệ thống hiện đang tạm ngưng phục vụ. Xin lỗi vì sự bất tiện này và vui lòng quay lại sau.
            </p>
          </>
        )}

        <button
          onClick={onAdminLogin}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-brand-light hover:text-brand"
        >
          <ShieldCheck className="h-4 w-4" /> Đăng nhập quản trị
        </button>
      </div>
    </div>
  );
}
