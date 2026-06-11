import React from "react";
import { X, MessageSquare } from "lucide-react";
import { formatMonthYear } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";

interface ObservacaoModalProps {
  show: boolean;
  pessoa: string | null;
  mesVisualizacao: Date;
  obsTexto: string;
  saving: boolean;
  onClose: () => void;
  onTextChange: (text: string) => void;
  onSave: (pessoa: string) => void;
}

export const ObservacaoModal: React.FC<ObservacaoModalProps> = ({
  show,
  pessoa,
  mesVisualizacao,
  obsTexto,
  onClose,
  onTextChange,
  onSave,
}) => {
  const dialogRef = useFocusTrap(onClose, show && !!pessoa);

  if (!show || !pessoa) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-modal flex items-end sm:items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="obs-modal-title"
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 id="obs-modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            Observação - {pessoa}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mês:{" "}
              <span className="text-gray-800 dark:text-gray-100 font-medium">
                {formatMonthYear(mesVisualizacao)}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Observação
            </label>
            <textarea
              value={obsTexto}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Ex: Pagou R$ 1.000 em 15/12, falta R$ 500..."
              rows={4}
              className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(pessoa)}
              className="flex-1 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
