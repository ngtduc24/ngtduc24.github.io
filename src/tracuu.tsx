import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PublicJournalSearch from './components/PublicJournalSearch.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicJournalSearch onLoginClick={() => {
      window.location.href = './';
    }} />
  </StrictMode>,
);
