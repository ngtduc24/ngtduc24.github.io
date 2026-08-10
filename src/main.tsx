import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConfirmationProvider } from './components/ConfirmationContext';
import { NotificationProvider } from './components/NotificationContext';
import PublicARScanner from './components/PublicARScanner';

// Người quét mã QR chỉ cần trình quét AR. Việc tách nhánh ngay tại đây giúp trang AR
// không phải chạy toàn bộ vòng khởi tạo phân quyền, listener Firestore và FCM của App.
const isPublicARRoute = new URLSearchParams(window.location.search).has('ar');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <ConfirmationProvider>
        {isPublicARRoute ? <PublicARScanner /> : <App />}
      </ConfirmationProvider>
    </NotificationProvider>
  </StrictMode>,
);
