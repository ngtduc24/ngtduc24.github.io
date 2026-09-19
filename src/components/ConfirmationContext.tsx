import React, { useState, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import ConfirmationDialog from './ConfirmationDialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  callback?: () => void;
}

interface ConfirmationContextType {
  confirm: (
    titleOrOptions: string | ConfirmOptions,
    message?: string,
    callback?: () => void
  ) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType>({ confirm: () => Promise.resolve(false) });

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<{ 
    title: string; 
    message: string; 
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void; 
    onCancel: () => void;
  } | null>(null);

  const confirm = (
    titleOrOptions: string | ConfirmOptions,
    message?: string,
    callback?: () => void
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let finalTitle = '';
      let finalMessage = '';
      let finalConfirmText = 'Xác nhận';
      let finalCancelText = 'Hủy';
      let finalCallback = callback;

      if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
        finalTitle = titleOrOptions.title;
        finalMessage = titleOrOptions.message;
        if (titleOrOptions.confirmText) finalConfirmText = titleOrOptions.confirmText;
        if (titleOrOptions.cancelText) finalCancelText = titleOrOptions.cancelText;
        if (titleOrOptions.callback) finalCallback = titleOrOptions.callback;
      } else {
        finalTitle = titleOrOptions as string;
        finalMessage = message || '';
      }

      setDialog({
        title: finalTitle,
        message: finalMessage,
        confirmText: finalConfirmText,
        cancelText: finalCancelText,
        onConfirm: () => { 
          resolve(true); 
          setDialog(null); 
          if (finalCallback) finalCallback();
        },
        onCancel: () => { 
          resolve(false); 
          setDialog(null); 
        }
      });
    });
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {dialog && ReactDOM.createPortal(
        <ConfirmationDialog
          title={dialog.title}
          message={dialog.message}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
        />,
        document.body
      )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => useContext(ConfirmationContext);
