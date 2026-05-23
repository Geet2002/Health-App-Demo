import React, { createContext, useContext, useState } from 'react';
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
          stripe: 'bg-red-500',
          iconBg: 'bg-red-50 text-red-600',
          icon: <AlertTriangle className="w-6 h-6" />,
          btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-100 hover:shadow-md'
        };
      case 'success':
        return {
          stripe: 'bg-emerald-500',
          iconBg: 'bg-emerald-50 text-emerald-600',
          icon: <Check className="w-6 h-6" />,
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-100 hover:shadow-md'
        };
      case 'info':
      case 'warning':
      default:
        return {
          stripe: 'bg-primary-500',
          iconBg: 'bg-primary-50 text-primary-600',
          icon: <Shield className="w-6 h-6" />,
          btnBg: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-100 hover:shadow-md'
        };
    }
  };

  const theme = getModalTheme();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 relative animate-scale-in">
            {/* Intent stripe */}
            <div className={`h-1.5 w-full ${theme.stripe}`} />
            
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-2xl shrink-0 ${theme.iconBg}`}>
                  {theme.icon}
                </div>
                <div className="flex-1 pr-6">
                  <h3 className="text-xl font-bold text-gray-900 leading-snug">
                    {modalState.title}
                  </h3>
                </div>
                <button 
                  onClick={() => handleClose(false)}
                  className="absolute top-5 right-5 p-1.5 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-500 leading-relaxed">
                {modalState.message}
              </p>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-250 text-gray-750 font-bold rounded-2xl text-sm transition-all border border-gray-200"
                >
                  {modalState.cancelText}
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className={`flex-1 py-3 px-4 font-bold rounded-2xl text-sm transition-all ${theme.btnBg}`}
                >
                  {modalState.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
