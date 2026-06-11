import { useState } from "react";
import { Loader2, Trash2, AlertTriangle, CheckCircle, Info, ShieldAlert, X } from "lucide-react";
import type { ModalConfirm } from "../../types/extended";
import { toast } from "../ui/Toaster";
import { useFocusTrap } from "../../hooks";

interface ConfirmModalProps {
  modal: ModalConfirm;
  saving: boolean;
  onClose: () => void;
}

const COLOR_MAP = {
  red: { bg: "bg-red-600", hover: "hover:bg-red-700", text: "text-red-600", lightBg: "bg-red-100 dark:bg-red-500/20", border: "border-red-200 dark:border-red-500/30" },
  green: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", text: "text-emerald-600", lightBg: "bg-emerald-100 dark:bg-emerald-500/20", border: "border-emerald-200 dark:border-emerald-500/30" },
  blue: { bg: "bg-blue-600", hover: "hover:bg-blue-700", text: "text-blue-600", lightBg: "bg-blue-100 dark:bg-blue-500/20", border: "border-blue-200 dark:border-blue-500/30" },
  indigo: { bg: "bg-indigo-600", hover: "hover:bg-indigo-700", text: "text-indigo-600", lightBg: "bg-indigo-100 dark:bg-indigo-500/20", border: "border-indigo-200 dark:border-indigo-500/30" },
  purple: { bg: "bg-purple-600", hover: "hover:bg-purple-700", text: "text-purple-600", lightBg: "bg-purple-100 dark:bg-purple-500/20", border: "border-purple-200 dark:border-purple-500/30" },
};

const ICON_MAP = {
  red: Trash2,
  green: CheckCircle,
  blue: Info,
  indigo: ShieldAlert,
  purple: AlertTriangle,
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
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200"
      >
        {/* Helper visual para reforçar a cor no topo */}
        <div className={`h-2 w-full ${colors.bg}`}></div>

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-8 pb-6 flex items-start gap-4">
          <div className={`shrink-0 p-3 rounded-2xl ${colors.lightBg} ${colors.text} border ${colors.border}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1 mt-1">
            <h2 id="confirm-modal-title" className="text-xl font-bold text-gray-800 dark:text-white leading-tight">
              {modal.titulo}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              {modal.mensagem}
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-[15px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none ${
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
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                : `${colors.bg} ${colors.hover} focus:ring-${color}-500/50 hover:shadow-md`
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
