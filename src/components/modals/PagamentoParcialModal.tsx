import React from "react";
import { X, Loader2, Banknote } from "lucide-react";
import { formatCurrency, formatCurrencyInput } from "../../utils/calculations";
import { formatMonthYear } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";

interface PagamentoParcialModalProps {
  show: boolean;
  pessoa: string | null;
  mesVisualizacao: Date;
  totalDevido: number;
  jaPago: number;
  valorPagamento: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onValorChange: (valor: string) => void;
  onSubmit: (pessoa: string) => void;
}

export const PagamentoParcialModal: React.FC<PagamentoParcialModalProps> = ({
  show,
  pessoa,
  mesVisualizacao,
  totalDevido,
  jaPago,
  valorPagamento,
  saving,
  error,
  onClose,
  onValorChange,
  onSubmit,
}) => {
  const dialogRef = useFocusTrap(onClose, show && !!pessoa);

  if (!show || !pessoa) return null;

  const restante = totalDevido - jaPago;

  return (
    <div className="fixed inset-0 bg-black/40 z-modal flex items-end sm:items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pag-parcial-modal-title"
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 id="pag-parcial-modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            Pagamento Parcial - {pessoa}
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
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Mês:</span>
              <span className="text-gray-800 dark:text-gray-100 font-medium">
                {formatMonthYear(mesVisualizacao)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total do mês:</span>
              <span className="text-gray-800 dark:text-gray-100 font-medium">
                {formatCurrency(totalDevido)}
              </span>
            </div>
            {jaPago > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-emerald-600">Já pago:</span>
                  <span className="text-emerald-700 font-medium">
                    {formatCurrency(jaPago)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-800 pt-2">
                  <span className="text-amber-600">Falta pagar:</span>
                  <span className="text-yellow-300 font-bold">
                    {formatCurrency(restante)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Valor do pagamento
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                R$
              </span>
              <input
                type="text"
                value={valorPagamento}
                onChange={(e) =>
                  onValorChange(formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
                className="w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
                inputMode="numeric"
              />
            </div>
            {restante > 0 && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() =>
                    onValorChange(
                      restante.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )
                  }
                  className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                >
                  Tudo ({formatCurrency(restante)})
                </button>
                <button
                  onClick={() =>
                    onValorChange(
                      (restante / 2).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )
                  }
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded font-medium transition-colors"
                >
                  Metade ({formatCurrency(restante / 2)})
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 py-3 text-gray-800 dark:text-gray-100 font-medium rounded-lg transition-colors ${
                saving
                  ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(pessoa)}
              disabled={restante <= 0 || saving}
              className={`flex-1 py-3 text-gray-800 dark:text-gray-100 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                saving || restante <= 0
                  ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Registrar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
