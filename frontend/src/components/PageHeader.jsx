import React from 'react';

export default function PageHeader({ title, description, icon: Icon, actionButton, bgColor = "bg-primary-100/10", children }) {
  return (
    <div className="bg-white/85 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-gray-150 shadow-sm relative overflow-hidden mb-4 sm:mb-6">
      <div className={`absolute top-0 right-0 w-48 h-48 ${bgColor} rounded-full filter blur-3xl pointer-events-none`}></div>
      <div className="relative z-10 flex flex-row items-center sm:items-start justify-between gap-4">
        
        <div className="flex items-start">
          {Icon && (
            <div className="mt-1 mr-3 text-primary-600 shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center">
              {title}
            </h1>
            {description && (
              <p className="hidden sm:block text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {actionButton && (
          <div className="shrink-0 flex items-center">
            {actionButton}
          </div>
        )}

      </div>
      
      {children && (
        <div className="relative z-10 mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
