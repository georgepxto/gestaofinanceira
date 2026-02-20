import React, { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { ModalConfirm } from "../../types/extended";

interface ConfirmModalProps {
  modal: ModalConfirm;
  saving: boolean;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  modal,
  saving,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!modal.show) return null;

  const isLoading = saving || isDeleting;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await modal.onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 bg-red-600">
          <div className="flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{modal.titulo}</h2>
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
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isLoading
                ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
