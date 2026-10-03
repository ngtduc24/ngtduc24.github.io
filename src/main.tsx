import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConfirmationProvider } from './components/ConfirmationContext';
import { NotificationProvider } from './components/NotificationContext';
import PublicARScanner from './components/PublicARScanner';
import { normalizeShareAddress, publicParam } from './lib/shareLinks';

// Link công khai dạng ?bt=, ?quiz=... đổi về đường dẫn gọn /bt/<mã>/ để chép link nào cũng có khung xem trước.
normalizeShareAddress(['bt', 'elview', 'elesson', 'quiz', 'vr', 'ar']);

// Ứng dụng thêm ra màn hình chính iPhone (chế độ standalone, thanh trạng thái trong suốt): iOS tính khung trang
// thiếu đúng chiều cao thanh trạng thái nên đáy màn hình lộ ra 1 dải màu nền. Đo phần thiếu đó và kéo các khung
// phủ kín màn, thanh dưới xuống sát đáy thật. Mở bằng Safari bình thường thì phần thiếu bằng 0, không đổi gì.
(function fixStandaloneGap() {
  try {
    const nav = navigator as any;
    const standalone = !!nav.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
    if (!standalone) return;
    const upd = () => {
      const land = window.innerWidth > window.innerHeight;
      const full = land ? Math.max(screen.width, screen.height) : Math.max(screen.height, screen.width) === screen.height ? screen.height : screen.width;
      const fullH = land ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
      const gap = Math.round((land ? fullH : full) - window.innerHeight);
      const g = gap > 0 && gap < 80 ? gap : 0;
      document.documentElement.style.setProperty('--pwa-gap', `${g}px`);
      document.documentElement.classList.toggle('pwa-gap', g > 0);
    };
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', () => setTimeout(upd, 300));
  } catch { /* bỏ qua */ }
})();

// Người quét mã QR chỉ cần trình quét AR. Việc tách nhánh ngay tại đây giúp trang AR
// không phải chạy toàn bộ vòng khởi tạo phân quyền, listener Firestore và FCM của App.
const isPublicARRoute = !!publicParam('ar');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <ConfirmationProvider>
        {isPublicARRoute ? <PublicARScanner /> : <App />}
      </ConfirmationProvider>
    </NotificationProvider>
  </StrictMode>,
);
