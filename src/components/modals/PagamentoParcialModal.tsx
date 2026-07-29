import React from "react";
import { X, Loader2, Banknote } from "lucide-react";
import { formatCurrency, formatCurrencyInput, formatCurrencyValue } from "../../utils/calculations";
import { formatMonthYear } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";
import { Card } from "../ui/Card";

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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <Card
        padding="nenhum"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pag-parcial-modal-title"
        className="w-full max-w-[460px]"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 id="pag-parcial-modal-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Pagamento Parcial - {pessoa}
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
          <div className="bg-zinc-100 dark:bg-white/[0.04] rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Mês:</span>
              <span className="text-zinc-800 dark:text-zinc-100 font-medium">
                {formatMonthYear(mesVisualizacao)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Total do mês:</span>
              <span className="font-mono valor text-zinc-900 dark:text-zinc-100 font-medium">
                {formatCurrency(totalDevido)}
              </span>
            </div>
            {jaPago > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400">Já pago:</span>
                  <span className="font-mono valor text-emerald-700 dark:text-emerald-500 font-medium">
                    {formatCurrency(jaPago)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2">
                  <span className="text-amber-600">Falta pagar:</span>
                  <span className="font-mono valor text-amber-600 dark:text-amber-500 font-bold">
                    {formatCurrency(restante)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Valor do pagamento
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                R$
              </span>
              <input
                type="text"
                value={valorPagamento}
                onChange={(e) =>
                  onValorChange(formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
                className="w-full h-11 pl-10 pr-3 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                inputMode="numeric"
              />
            </div>
            {restante > 0 && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onValorChange(formatCurrencyValue(restante))}
                  className="px-3 py-1.5 text-xs font-mono valor bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tudo ({formatCurrency(restante)})
                </button>
                <button
                  onClick={() => onValorChange(formatCurrencyValue(restante / 2))}
                  className="px-3 py-1.5 text-xs font-mono valor bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  Metade ({formatCurrency(restante / 2)})
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 py-3 text-zinc-800 dark:text-zinc-100 font-medium rounded-xl transition-colors ${
                saving
                  ? "bg-zinc-50 dark:bg-white/[0.04] cursor-not-allowed"
                  : "bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-200 dark:bg-white/[0.07] dark:hover:bg-white/[0.08]"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(pessoa)}
              disabled={restante <= 0 || saving}
              className={`flex-1 py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                saving || restante <= 0
                  ? "bg-zinc-200 dark:bg-white/[0.07] text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-50"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
      </Card>
    </div>
  );
};
