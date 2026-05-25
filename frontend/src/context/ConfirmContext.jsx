import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Shield, Check, X, HelpCircle } from 'lucide-react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Are you sure?',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning', // 'warning', 'danger', 'success', 'info'
    resolve: null
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        resolve
      });
    });
  };

  const handleClose = (value) => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (modalState.resolve) {
      modalState.resolve(value);
    }
  };

  // Helper for determining modal styles
  const getModalTheme = () => {
    switch (modalState.type) {
      case 'danger':
        return {
          iconBg: 'bg-red-50/50 text-red-500',
          icon: <AlertTriangle className="w-5 h-5" />,
          btnBg: 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm ring-gray-900'
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600',
          icon: <Check className="w-5 h-5" />,
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
        };
      case 'info':
      case 'warning':
      default:
        return {
          iconBg: 'bg-primary-50 text-primary-600',
          icon: <Shield className="w-5 h-5" />,
          btnBg: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
        };
    }
  };

  const theme = getModalTheme();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modalState.isOpen && createPortal(
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-[400px] w-full shadow-xl border border-gray-100 relative animate-scale-in p-6">
            <button 
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-2.5 rounded-full shrink-0 ${theme.iconBg}`}>
                {theme.icon}
              </div>
              <div className="pt-0.5 flex-1 pr-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                  {modalState.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {modalState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg text-sm transition-all border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
              >
                {modalState.cancelText}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 font-medium rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50 ${theme.btnBg} ${modalState.type === 'danger' ? 'focus:ring-gray-900' : 'focus:ring-primary-500'}`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

