import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export const toast = {
  success: (msg: string) => document.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } })),
  error: (msg: string) => document.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: msg } })),
};

export function Toaster() {
  const [toasts, setToasts] = useState<{id: number, type: string, message: string}[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type: e.detail.type, message: e.detail.message }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    document.addEventListener('app-toast', handleToast);
    return () => document.removeEventListener('app-toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-toast flex flex-col gap-3 pointer-events-none" role="region" aria-label="Notificações" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          /* ds-ok: toast flutua sobre a tela — sombra elevada e borda própria, não é a superfície assentada do Card */
          className="animate-in slide-in-from-right-full fade-in duration-500 ease-out fill-mode-forwards bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xl shadow-black/10 dark:shadow-black/40 rounded-2xl p-4 flex items-center gap-3 min-w-[280px] max-w-sm pointer-events-auto border border-zinc-100 dark:border-zinc-800 relative z-50 overflow-hidden"
        >
          {t.type === 'success' ? (
            <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-full shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 p-1.5 rounded-full shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
          )}
          <p className="text-[15px] font-medium flex-1">{t.message}</p>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            aria-label="Fechar notificação"
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors bg-transparent border-0 outline-none cursor-pointer p-1"
          >
             <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
