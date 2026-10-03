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
