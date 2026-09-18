import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PublicJournalSearch from './components/PublicJournalSearch.tsx';
import EduPublicAssignment from './components/edu/EduPublicAssignment.tsx';
import './index.css';
import { NotificationProvider } from './components/NotificationContext.tsx';
import { ConfirmationProvider } from './components/ConfirmationContext.tsx';

function TraCuuRoot() {
  const [eduLinkId, setEduLinkId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const edu = params.get('edu');
    if (edu) {
      setEduLinkId(edu);
    }
  }, []);

  if (eduLinkId) {
    return <EduPublicAssignment shareLinkId={eduLinkId} />;
  }

  return (
    <PublicJournalSearch onLoginClick={() => {
      window.location.href = './';
    }} />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <ConfirmationProvider>
        <TraCuuRoot />
      </ConfirmationProvider>
    </NotificationProvider>
  </StrictMode>,
);
