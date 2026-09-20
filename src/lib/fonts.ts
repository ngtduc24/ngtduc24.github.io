// Danh sách phông chữ cho hệ thống. Admin chọn phông cho tiêu đề và cho nội dung trong
// màn hình Cấu hình hệ thống. Các phông đều hỗ trợ tiếng Việt và tải từ Google Fonts.

export interface FontOption {
  family: string; // tên họ phông đúng như Google Fonts
  label: string;  // nhãn hiển thị cho người dùng
  url: string;    // liên kết CSS tải phông
}

export const DEFAULT_HEADING_FONT = 'Space Grotesk';
export const DEFAULT_BODY_FONT = 'Inter';

export const FONT_OPTIONS: FontOption[] = [
  { family: 'Inter', label: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { family: 'Space Grotesk', label: 'Space Grotesk', url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { family: 'Be Vietnam Pro', label: 'Be Vietnam Pro', url: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap' },
  { family: 'Roboto', label: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { family: 'Open Sans', label: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap' },
  { family: 'Montserrat', label: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { family: 'Nunito', label: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { family: 'Nunito Sans', label: 'Nunito Sans', url: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap' },
  { family: 'Mulish', label: 'Mulish', url: 'https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap' },
  { family: 'Quicksand', label: 'Quicksand', url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap' },
  { family: 'Noto Sans', label: 'Noto Sans', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap' },
  { family: 'Lora', label: 'Lora (có chân)', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' },
  { family: 'Merriweather', label: 'Merriweather (có chân)', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap' },
  { family: 'Playfair Display', label: 'Playfair Display (có chân)', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' },
];

export function getFontOption(family?: string): FontOption | undefined {
  if (!family) return undefined;
  return FONT_OPTIONS.find(f => f.family === family);
}
