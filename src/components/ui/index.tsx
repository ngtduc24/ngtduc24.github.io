// Bộ thành phần giao diện dùng chung cho toàn trang SmartResearch.
// Chuẩn thống nhất (chốt ngày 24/9/2026 sau khi đo 21 màn hình đang chạy):
//   bo góc nút và ô nhập 12px, thẻ 16px, nhãn tròn
//   chiều cao nút và ô nhập 40px (md) hoặc 36px (sm), nút biểu tượng 36×36px
//   cỡ chữ nội dung 14px, mô tả 13px, chú thích 12px, nhãn 11px, không dùng nhỏ hơn
//   màu chữ chính slate 800, phụ slate 600, mờ nhất slate 500, slate 400 chỉ cho biểu tượng
//   chỉ 1 sắc thương hiệu (bg-brand), sắc đậm (brand-hover) chỉ dùng khi rê chuột
import React from 'react';
import { Loader2, Search } from 'lucide-react';

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

// Thang lớp phủ cố định, dùng thay cho các giá trị z-index rời rạc.
export const Z = {
  dropdown: 'z-30',
  sticky: 'z-20',
  modal: 'z-50',
  toast: 'z-[60]',
  top: 'z-[70]',
} as const;

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerSolid';
export type ButtonSize = 'md' | 'sm';

const BTN_BASE = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SIZE: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3.5 text-[13px]',
};
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  ghost: 'bg-transparent text-brand hover:bg-brand-light',
  danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
  dangerSolid: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  full?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconRight, full, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], full && 'w-full', className)} {...rest}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // bắt buộc, dùng làm aria-label và tooltip
  variant?: 'outline' | 'ghost' | 'danger' | 'primary';
  size?: 'md' | 'sm';
}

const ICON_VARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  outline: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label} className={cx('inline-flex items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed shrink-0', size === 'md' ? 'h-9 w-9' : 'h-8 w-8', ICON_VARIANT[variant], className)} {...rest}>
      {children}
    </button>
  );
});

const FIELD = 'w-full rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-500';
const FIELD_SIZE: Record<ButtonSize, string> = { md: 'h-10 px-3 text-sm', sm: 'h-9 px-3 text-[13px]' };

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> { size?: ButtonSize; invalid?: boolean }
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ size = 'md', invalid, className, ...rest }, ref) {
  return <input ref={ref} className={cx(FIELD, FIELD_SIZE[size], invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-200', className)} {...rest} />;
});

export interface SearchInputProps extends InputProps { wrapClassName?: string }
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ wrapClassName, className, size = 'md', ...rest }, ref) {
  return (
    <div className={cx('relative', wrapClassName)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <Input ref={ref} size={size} className={cx('pl-9', className)} {...rest} />
    </div>
  );
});

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> { size?: ButtonSize }
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ size = 'md', className, children, ...rest }, ref) {
  return <select ref={ref} className={cx(FIELD, FIELD_SIZE[size], 'pr-8 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:16px_16px]', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2362748e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>{children}</select>;
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { invalid?: boolean }
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(FIELD, 'px-3 py-2.5 text-sm min-h-[96px] leading-relaxed', invalid && 'border-rose-400', className)} {...rest} />;
});

export function Label({ children, className, hint, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }) {
  return (
    <label className={cx('block text-xs font-semibold text-slate-600 mb-1.5', className)} {...rest}>
      {children}{hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

export function Field({ label, hint, children, className }: { label: React.ReactNode; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

// Thẻ: 1 hình dạng, 2 mức đệm. "item" cho thẻ mục (lớp, bài, đề), "block" cho khối chứa bảng và biểu mẫu.
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> { padding?: 'item' | 'block' | 'none'; interactive?: boolean }
export function Card({ padding = 'block', interactive, className, children, ...rest }: CardProps) {
  return (
    <div className={cx('rounded-2xl bg-white border border-slate-100 shadow-sm', padding === 'item' ? 'p-5' : padding === 'block' ? 'p-6' : '', interactive && 'transition-shadow hover:shadow-md cursor-pointer', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, description }: { children: React.ReactNode; className?: string; description?: React.ReactNode }) {
  return (
    <div className={cx('mb-4', className)}>
      <h3 className="text-base font-semibold text-slate-800">{children}</h3>
      {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
    </div>
  );
}

// Đầu trang module: ô biểu tượng 44px, tiêu đề 20px, mô tả 13px, hành động bên phải.
export function PageHeader({ icon, title, description, actions, badge, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; badge?: React.ReactNode; className?: string }) {
  return (
    <Card padding="none" className={cx('px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4', className)}>
      {icon && <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap sm:justify-end">{actions}</div>}
    </Card>
  );
}

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info' | 'brand';
const BADGE_TONE: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  neutral: 'bg-slate-100 text-slate-600',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-50 text-rose-600',
  info: 'bg-blue-50 text-blue-700',
  brand: 'bg-brand-light text-brand',
};
export function Badge({ tone = 'neutral', icon, className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; icon?: React.ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full h-[22px] px-2.5 text-[11px] font-semibold whitespace-nowrap', BADGE_TONE[tone], className)} {...rest}>
      {icon}{children}
    </span>
  );
}

// Trạng thái trống và đang tải dùng chung.
export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {icon && <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand flex items-center justify-center mb-4">{icon}</div>}
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      {description && <div className="text-[13px] text-slate-500 mt-1 max-w-md">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Đang tải...', className }: { label?: string; className?: string }) {
  return (
    <div className={cx('flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500', className)}>
      <Loader2 size={18} className="animate-spin text-brand" />{label}
    </div>
  );
}

// Lớp phủ hộp thoại dùng chung: 1 màu nền, 1 z-index, đóng bằng Escape và bấm ra ngoài.
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }: { open: boolean; onClose: () => void; title?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'md' ? 'max-w-xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-5xl';
  return (
    <div className={cx('fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4', Z.modal)} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className={cx('bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col animate-scaleUp', width, className)}>
        {(title || description) && (
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
            {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
          </div>
        )}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
