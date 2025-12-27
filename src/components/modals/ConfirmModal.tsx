import React from "react";
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
  if (!modal.show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 overflow-hidden">
        <div className="p-4 bg-red-600">
          <div className="flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-white" />
            <h2 className="text-lg font-semibold text-white">{modal.titulo}</h2>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-300">{modal.mensagem}</p>
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors ${
              saving
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={modal.onConfirm}
            disabled={saving}
            className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              saving
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {saving ? (
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
