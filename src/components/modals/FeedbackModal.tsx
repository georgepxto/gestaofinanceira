import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import type { ModalFeedback } from "../../types/extended";

interface FeedbackModalProps {
  modal: ModalFeedback;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  modal,
  onClose,
}) => {
  if (!modal.show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 overflow-hidden">
        <div
          className={`p-4 ${
            modal.tipo === "sucesso" ? "bg-green-600" : "bg-blue-600"
          }`}
        >
          <div className="flex items-center gap-3">
            {modal.tipo === "sucesso" ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 text-white" />
            )}
            <h2 className="text-lg font-semibold text-white">{modal.titulo}</h2>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-300 whitespace-pre-line">{modal.mensagem}</p>
        </div>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              modal.tipo === "sucesso"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
