import { useState, useEffect } from "react";
import { Check, AlertCircle, X } from "lucide-react";

type TipoToast = "success" | "error";

export const toast = {
  success: (msg: string) =>
    document.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "success", message: msg } })),
  error: (msg: string) =>
    document.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "error", message: msg } })),
};

/**
 * Aviso curto de resultado. --surface-2 com borda --line, ícone e texto. No
 * celular fica acima da barra inferior; no desktop, no canto inferior direito.
 */
export function Toaster() {
  const [toasts, setToasts] = useState<{ id: number; type: TipoToast; message: string }[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const { type, message } = (e as CustomEvent<{ type: TipoToast; message: string }>).detail;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    document.addEventListener("app-toast", handleToast);
    return () => document.removeEventListener("app-toast", handleToast);
  }, []);

  return (
    <div
      role="region"
      aria-label="Avisos"
      aria-live="polite"
      className="fixed z-toast inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 flex flex-col gap-2 items-stretch md:items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 bg-surface-2 border border-line rounded pl-4 pr-2 py-2.5 md:min-w-[280px] md:max-w-sm animate-[entra-item_200ms_ease-out]"
        >
          {t.type === "success" ? (
            <Check className="w-4 h-4 shrink-0 text-fg-2" strokeWidth={2} aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-danger-ink" strokeWidth={1.5} aria-hidden="true" />
          )}
          <p className="flex-1 text-sm text-fg">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Fechar aviso"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded text-fg-3 hover:text-fg transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
