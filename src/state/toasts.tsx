import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = (message: string) => void;

const ToastContext = createContext<Toast>(() => {});

export function useToast(): Toast {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Array<{ id: number; message: string }>>([]);
  const toast = useCallback<Toast>(message => {
    const id = Date.now() + Math.random();
    setItems(list => [...list.slice(-2), { id, message }]);
    window.setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
        aria-live="polite"
      >
        {items.map(t => (
          <div
            key={t.id}
            className="rise pointer-events-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-[14.5px] font-medium text-bg shadow-lift"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
