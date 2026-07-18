import React, { useState, useEffect, createContext, useContext } from 'react';

type Notification = { id: string; message: string; type: 'success' | 'info' | 'error' | 'warning' };

interface NotificationContextType {
  addNotification: (message: string, type?: Notification['type']) => void;
  notifications: Notification[];
}

const NotificationContext = createContext<NotificationContextType>({ addNotification: () => {}, notifications: [] });

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ addNotification, notifications }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[120] w-[min(24rem,calc(100vw-2rem))] space-y-2" aria-live="polite" aria-atomic="true">
        {notifications.map(n => (
          <div key={n.id} role="status" className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl animate-slideUp ${
            n.type === 'success' ? 'bg-emerald-600' :
            n.type === 'error' ? 'bg-rose-600' :
            n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-600'
          }`}>
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
