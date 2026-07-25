import React, { useEffect, useState } from "react";
import { CheckCircle2, X, Info } from "lucide-react";
import type { ModalFeedback } from "../../types/extended";
import { useFocusTrap } from "../../hooks";

interface FeedbackModalProps {
  modal: ModalFeedback;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  modal,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const dialogRef = useFocusTrap(onClose, modal.show);

  useEffect(() => {
    if (modal.show) {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [modal.show]);

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-0">
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className={`relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 transition-all duration-200 ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 sm:translate-y-8"
        }`}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              modal.tipo === "sucesso"
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500"
            }`}>
              {modal.tipo === "sucesso" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Info className="w-6 h-6" />
              )}
            </div>

            <h3 id="feedback-modal-title" className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {modal.titulo}
            </h3>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line mb-6">
              {modal.mensagem}
            </p>

            <button
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 focus:ring-4 focus:outline-none ${
                modal.tipo === "sucesso"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-600/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-600/20"
              }`}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
