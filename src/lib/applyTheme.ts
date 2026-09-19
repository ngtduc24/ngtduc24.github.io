// Áp màu thương hiệu vào biến CSS dùng chung cho mọi entry, kể cả các trang công
// khai (tracuu, edu) để màu đồng bộ với màu admin đặt trong cấu hình hệ thống.
//
// Đồng thời lưu 3 giá trị màu đã tính vào localStorage. Đoạn script nội tuyến
// trong thẻ head của các file html đọc cache này và áp NGAY trước khi trang vẽ,
// nhờ vậy khi F5 màu đúng hiện ra liền, không còn nháy màu mặc định rồi mới đổi.

interface ThemeLike {
  themeColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const BRAND_CACHE_KEY = 'brandThemeCache';

const PRESETS: Record<string, { brand: string; hover: string; light: string }> = {
  'green-black': { brand: '#10b981', hover: '#059669', light: '#ecfdf5' },
  'purple-indigo': { brand: '#712cf9', hover: '#5b21d3', light: '#f3eeff' },
  'blue-cyan': { brand: '#3b82f6', hover: '#2563eb', light: '#eff6ff' },
  'red-orange': { brand: '#ef4444', hover: '#dc2626', light: '#fef2f2' },
  'amber-yellow': { brand: '#f59e0b', hover: '#d97706', light: '#fefbeb' },
};

export function resolveBrand(settings: ThemeLike | null | undefined) {
  if (settings?.primaryColor && settings?.secondaryColor) {
    return {
      brand: settings.primaryColor,
      hover: settings.secondaryColor,
      light: `${settings.primaryColor}15`,
    };
  }
  const theme = settings?.themeColor || 'green-black';
  return PRESETS[theme] || PRESETS['green-black'];
}

export function applyBrandTheme(settings: ThemeLike | null | undefined) {
  const { brand, hover, light } = resolveBrand(settings);
  const root = document.documentElement.style;
  root.setProperty('--color-brand', brand);
  root.setProperty('--color-brand-hover', hover);
  root.setProperty('--color-brand-light', light);

  // Lưu cache để lần tải sau áp màu ngay trong thẻ head, tránh nháy màu.
  try {
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify({ brand, hover, light }));
  } catch (_e) {
    // localStorage có thể bị chặn ở chế độ riêng tư, bỏ qua không ảnh hưởng.
  }
}
