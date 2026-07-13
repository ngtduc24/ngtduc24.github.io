import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConfirmationProvider } from './components/ConfirmationContext';
import { NotificationProvider } from './components/NotificationContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <ConfirmationProvider>
        <App />
      </ConfirmationProvider>
    </NotificationProvider>
  </StrictMode>,
);
