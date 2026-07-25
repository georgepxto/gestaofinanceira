import { useState } from "react";
import { Loader2, Trash2, AlertTriangle, CheckCircle, X } from "lucide-react";
import type { ModalConfirm } from "../../types/extended";
import { toast } from "../ui/Toaster";
import { useFocusTrap } from "../../hooks";

interface ConfirmModalProps {
  modal: ModalConfirm;
  saving: boolean;
  onClose: () => void;
}

/** Três cores semânticas: red = perigo, emerald = ação positiva, amber = alerta. */
const COLOR_MAP = {
  red: { bg: "bg-red-600", hover: "hover:bg-red-700", ring: "focus:ring-red-500/50", text: "text-red-600", lightBg: "bg-red-100 dark:bg-red-500/20", border: "border-red-200 dark:border-red-500/30" },
  emerald: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", ring: "focus:ring-emerald-500/50", text: "text-emerald-600 dark:text-emerald-400", lightBg: "bg-emerald-100 dark:bg-emerald-500/20", border: "border-emerald-200 dark:border-emerald-500/30" },
  amber: { bg: "bg-amber-600", hover: "hover:bg-amber-700", ring: "focus:ring-amber-500/50", text: "text-amber-600", lightBg: "bg-amber-100 dark:bg-amber-500/20", border: "border-amber-200 dark:border-amber-500/30" },
};

const ICON_MAP = {
  red: Trash2,
  emerald: CheckCircle,
  amber: AlertTriangle,
};

export function ConfirmModal({
  modal,
  saving,
  onClose,
}: ConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const dialogRef = useFocusTrap(onClose, modal.show);

  if (!modal.show) return null;

  const isLoading = saving || isProcessing;
  const color = modal.confirmColor || "red";
  const label = modal.confirmLabel || "Excluir";
  const colors = COLOR_MAP[color];
  const IconComponent = ICON_MAP[color];

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await modal.onConfirm();
      if (modal.successMessage) {
        toast.success(modal.successMessage);
      } else {
        toast.success(label === "Excluir" ? "Excluído com sucesso!" : "Ação concluída com sucesso!");
      }
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-modal-top flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200"
      >
        {/* Helper visual para reforçar a cor no topo */}
        <div className={`h-2 w-full ${colors.bg}`}></div>

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-8 pb-6 flex items-start gap-4">
          <div className={`shrink-0 p-3 rounded-2xl ${colors.lightBg} ${colors.text} border ${colors.border}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1 mt-1">
            <h2 id="confirm-modal-title" className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {modal.titulo}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {modal.mensagem}
            </p>
          </div>
        </div>

        <div className="p-4 bg-zinc-50/50 dark:bg-white/[0.02] border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-[15px] font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.08] transition-colors focus:ring-2 focus:ring-emerald-500 outline-none ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-[15px] font-semibold text-white rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 ${
              isLoading
                ? "bg-zinc-400 dark:bg-zinc-600 cursor-not-allowed"
                : `${colors.bg} ${colors.hover} ${colors.ring} hover:shadow-md`
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aguarde...
              </>
            ) : (
              label
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
