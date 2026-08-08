import React from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { formatCurrency, formatCurrencyInput, formatCurrencyValue, parseCurrency } from "../../utils/calculations";
import { formatMonthYear } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";
import { Card } from "../ui/Card";

interface FecharMesModalProps {
  show: boolean;
  pessoa: string | null;
  mesVisualizacao: Date;
  totalDevido: number;
  jaPago: number;
  valorPagoFecharMes: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onValorChange: (valor: string) => void;
  onSubmit: (pessoa: string) => void;
}

export const FecharMesModal: React.FC<FecharMesModalProps> = ({
  show,
  pessoa,
  mesVisualizacao,
  totalDevido,
  jaPago,
  valorPagoFecharMes,
  saving,
  error,
  onClose,
  onValorChange,
  onSubmit,
}) => {
  const dialogRef = useFocusTrap(onClose, show && !!pessoa);

  if (!show || !pessoa) return null;

  const restanteReal = totalDevido - jaPago;
  const valorPago = parseCurrency(valorPagoFecharMes);
  const valorParaDebito = Math.max(0, restanteReal - valorPago);

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <Card
        padding="nenhum"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fechar-mes-modal-title"
        className="w-full max-w-[460px] shadow-xl dark:shadow-black/60"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
          <h2 id="fechar-mes-modal-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Fechar Mês - {pessoa}
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
          {/* Info do mês */}
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
              <div className="flex justify-between">
                <span className="text-emerald-600 dark:text-emerald-400">Já pago:</span>
                <span className="font-mono valor text-emerald-700 dark:text-emerald-400 font-medium">
                  {formatCurrency(jaPago)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 dark:border-white/[0.06] pt-2">
              <span className="text-amber-600 dark:text-amber-400">Falta pagar:</span>
              <span className="font-mono valor text-amber-600 dark:text-amber-400 font-bold">
                {formatCurrency(restanteReal)}
              </span>
            </div>
          </div>

          {/* Campo de valor pago */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Quanto {pessoa} vai pagar agora?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                R$
              </span>
              <input
                type="text"
                value={valorPagoFecharMes}
                onChange={(e) =>
                  onValorChange(formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
                className="w-full h-11 pl-10 pr-3 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onValorChange(formatCurrencyValue(restanteReal))}
                className="px-3 py-1.5 text-xs font-mono valor bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Restante ({formatCurrency(restanteReal)})
              </button>
              <button
                onClick={() => onValorChange("")}
                className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Resumo */}
          {valorPago > 0 && (
            <div
              className={`rounded-lg p-4 ${
                valorParaDebito > 0
                  ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30"
                  : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
              }`}
            >
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Resumo:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Pagando agora:</span>
                  <span className="font-mono valor text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatCurrency(valorPago)}
                  </span>
                </div>
                {valorParaDebito > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Vai para Dívidas em Aberto:
                    </span>
                    <span className="font-mono valor text-amber-600 dark:text-amber-400 font-medium">
                      {formatCurrency(valorParaDebito)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle className="w-4 h-4" /> Quitado
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-3 text-zinc-800 dark:text-zinc-100 rounded-xl font-medium transition-colors ${
                saving
                  ? "bg-zinc-100 dark:bg-white/[0.04] cursor-not-allowed"
                  : "bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.10]"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(pessoa)}
              disabled={saving}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                saving
                  ? "bg-zinc-200 dark:bg-white/[0.07] text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Fechar Mês"
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
