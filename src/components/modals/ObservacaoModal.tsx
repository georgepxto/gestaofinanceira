import React from "react";
import { X, MessageSquare } from "lucide-react";
import { formatMonthYear } from "../../utils/calculations";

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
  if (!show || !pessoa) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-400" />
            Observação - {pessoa}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              Mês:{" "}
              <span className="text-white font-medium">
                {formatMonthYear(mesVisualizacao)}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Observação
            </label>
            <textarea
              value={obsTexto}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Ex: Pagou R$ 1.000 em 15/12, falta R$ 500..."
              rows={4}
              className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
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
