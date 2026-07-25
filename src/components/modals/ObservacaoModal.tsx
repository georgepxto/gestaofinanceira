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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="obs-modal-title"
        className="bg-white dark:bg-zinc-900 rounded-[22px] w-full max-w-[460px] shadow-sm border border-zinc-200 dark:border-zinc-800"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 id="obs-modal-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            Observação - {pessoa}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-zinc-100 dark:bg-white/[0.04] rounded-lg p-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Mês:{" "}
              <span className="text-zinc-800 dark:text-zinc-100 font-medium">
                {formatMonthYear(mesVisualizacao)}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Observação
            </label>
            <textarea
              value={obsTexto}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Ex: Pagou R$ 1.000 em 15/12, falta R$ 500..."
              rows={4}
              className="w-full px-3 py-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-100 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-white/[0.08] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(pessoa)}
              className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
