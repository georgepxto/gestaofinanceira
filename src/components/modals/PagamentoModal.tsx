import React from "react";
import { X, Loader2, Banknote } from "lucide-react";
import { formatCurrencyInput } from "../../utils/calculations";

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
  if (!show || !dividaId) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-400" />
            Registrar Pagamento
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              R$
            </span>
            <input
              type="text"
              value={valorPagamento}
              onChange={(e) =>
                onValorChange(formatCurrencyInput(e.target.value))
              }
              placeholder="0,00"
              className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
              inputMode="numeric"
            />
          </div>
          <button
            onClick={() => onTudo(valorAtual)}
            disabled={saving}
            className={`w-full px-4 py-2.5 text-white rounded-lg font-medium transition-colors text-sm ${
              saving
                ? "bg-gray-700 cursor-not-allowed"
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
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors text-sm ${
                saving
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(dividaId)}
              disabled={saving}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                saving
                  ? "bg-gray-600 cursor-not-allowed"
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
