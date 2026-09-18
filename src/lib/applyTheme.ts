// Áp màu thương hiệu vào biến CSS dùng chung cho mọi entry, kể cả các trang công
// khai (tracuu, edu) để màu đồng bộ với màu admin đặt trong cấu hình hệ thống.
// Logic giữ giống hệt App.tsx để không lệch nhau.

interface ThemeLike {
  themeColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function applyBrandTheme(settings: ThemeLike | null | undefined) {
  const root = document.documentElement;
  const theme = settings?.themeColor || 'green-black';

  if (settings?.primaryColor && settings?.secondaryColor) {
    root.style.setProperty('--color-brand', settings.primaryColor);
    root.style.setProperty('--color-brand-hover', settings.secondaryColor);
    root.style.setProperty('--color-brand-light', `${settings.primaryColor}15`);
    return;
  }

  if (theme === 'green-black') {
    root.style.setProperty('--color-brand', '#10b981');
    root.style.setProperty('--color-brand-hover', '#059669');
    root.style.setProperty('--color-brand-light', '#ecfdf5');
  } else if (theme === 'purple-indigo') {
    root.style.setProperty('--color-brand', '#712cf9');
    root.style.setProperty('--color-brand-hover', '#5b21d3');
    root.style.setProperty('--color-brand-light', '#f3eeff');
  } else if (theme === 'blue-cyan') {
    root.style.setProperty('--color-brand', '#3b82f6');
    root.style.setProperty('--color-brand-hover', '#2563eb');
    root.style.setProperty('--color-brand-light', '#eff6ff');
  } else if (theme === 'red-orange') {
    root.style.setProperty('--color-brand', '#ef4444');
    root.style.setProperty('--color-brand-hover', '#dc2626');
    root.style.setProperty('--color-brand-light', '#fef2f2');
  } else if (theme === 'amber-yellow') {
    root.style.setProperty('--color-brand', '#f59e0b');
    root.style.setProperty('--color-brand-hover', '#d97706');
    root.style.setProperty('--color-brand-light', '#fefbeb');
  }
}
