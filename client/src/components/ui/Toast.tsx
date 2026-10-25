import { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { ToastContext, Toast, ToastType } from './ToastContext';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto p-4 rounded-card border shadow-lg text-sm font-medium transition-all animate-in slide-in-from-bottom-2',
              toast.type === 'success' && 'bg-emerald-50 text-emerald-900 border-emerald-200',
              toast.type === 'error' && 'bg-red-50 text-red-900 border-red-200',
              toast.type === 'info' && 'bg-surface text-navy border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <span>{toast.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="ml-2 text-muted hover:text-navy text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
