import React, { useState, useEffect, createContext, useContext } from 'react';

type Notification = { id: string; message: string; type: 'success' | 'info' | 'error' };

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
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-lg shadow-lg text-white ${n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
