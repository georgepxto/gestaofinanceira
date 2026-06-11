import React from "react";
import { X, Loader2, Banknote } from "lucide-react";
import { formatCurrencyInput } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";

interface PagamentoModalProps {
  show: boolean;
  dividaId: string | null;
  valorAtual: number;
  valorPagamento: string;
  obsPagamento: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onValorChange: (valor: string) => void;
  onObsChange: (obs: string) => void;
  onTudo: (valor: number) => void;
  onSubmit: (dividaId: string) => void;
}

export const PagamentoModal: React.FC<PagamentoModalProps> = ({
  show,
  dividaId,
  valorAtual,
  valorPagamento,
  obsPagamento,
  saving,
  error,
  onClose,
  onValorChange,
  onObsChange,
  onTudo,
  onSubmit,
}) => {
  const dialogRef = useFocusTrap(onClose, show && !!dividaId);

  if (!show || !dividaId) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-modal flex items-end sm:items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pagamento-modal-title"
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 id="pagamento-modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            Registrar Pagamento
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
              R$
            </span>
            <input
              type="text"
              value={valorPagamento}
              onChange={(e) =>
                onValorChange(formatCurrencyInput(e.target.value))
              }
              placeholder="0,00"
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
              inputMode="numeric"
            />
          </div>
          <button
            onClick={() => onTudo(valorAtual)}
            disabled={saving}
            className={`w-full px-4 py-2.5 text-gray-800 dark:text-gray-100 rounded-lg font-medium transition-colors text-sm ${
              saving
                ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Tudo
          </button>
          <input
            type="text"
            value={obsPagamento}
            onChange={(e) => onObsChange(e.target.value)}
            placeholder="Observação (opcional)"
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-2.5 text-gray-800 dark:text-gray-100 rounded-lg font-medium transition-colors text-sm ${
                saving
                  ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(dividaId)}
              disabled={saving}
              className={`flex-1 px-4 py-2.5 text-gray-800 dark:text-gray-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                saving
                  ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar Pagamento"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
