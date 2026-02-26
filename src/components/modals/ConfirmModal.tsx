import React, { useState } from "react";
import { Loader2, Trash2, AlertTriangle, CheckCircle, Info, ShieldAlert } from "lucide-react";
import type { ModalConfirm } from "../../types/extended";

interface ConfirmModalProps {
  modal: ModalConfirm;
  saving: boolean;
  onClose: () => void;
}

const COLOR_MAP = {
  red: { bg: "bg-red-600", hover: "hover:bg-red-700", header: "bg-red-600" },
  green: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", header: "bg-emerald-600" },
  blue: { bg: "bg-blue-600", hover: "hover:bg-blue-700", header: "bg-blue-600" },
  indigo: { bg: "bg-indigo-600", hover: "hover:bg-indigo-700", header: "bg-indigo-600" },
  purple: { bg: "bg-purple-600", hover: "hover:bg-purple-700", header: "bg-purple-600" },
};

const ICON_MAP = {
  red: <Trash2 className="w-7 h-7 text-white" />,
  green: <CheckCircle className="w-7 h-7 text-white" />,
  blue: <Info className="w-7 h-7 text-white" />,
  indigo: <ShieldAlert className="w-7 h-7 text-white" />,
  purple: <AlertTriangle className="w-7 h-7 text-white" />,
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  modal,
  saving,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (!modal.show) return null;

  const isLoading = saving || isProcessing;
  const color = modal.confirmColor || "red";
  const label = modal.confirmLabel || "Excluir";
  const colors = COLOR_MAP[color];
  const icon = ICON_MAP[color];

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await modal.onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className={`p-4 ${colors.header}`}>
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-lg font-semibold text-white">{modal.titulo}</h2>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-400">{modal.mensagem}</p>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 py-3 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors ${
              isLoading
                ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isLoading
                ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                : `${colors.bg} ${colors.hover}`
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              label
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
