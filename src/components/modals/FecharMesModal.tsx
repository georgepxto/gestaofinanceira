import React from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { formatCurrency, formatCurrencyInput } from "../../utils/calculations";
import { formatMonthYear } from "../../utils/calculations";

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
  if (!show || !pessoa) return null;

  const restanteReal = totalDevido - jaPago;
  const valorPago = parseFloat(
    valorPagoFecharMes.replace(/[R$\s.]/g, "").replace(",", ".") || "0"
  );
  const valorParaDebito = Math.max(0, restanteReal - valorPago);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Fechar Mês - {pessoa}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info do mês */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Mês:</span>
              <span className="text-white font-medium">
                {formatMonthYear(mesVisualizacao)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total do mês:</span>
              <span className="text-white font-medium">
                {formatCurrency(totalDevido)}
              </span>
            </div>
            {jaPago > 0 && (
              <div className="flex justify-between">
                <span className="text-green-400">Já pago:</span>
                <span className="text-green-300 font-medium">
                  {formatCurrency(jaPago)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-600 pt-2">
              <span className="text-yellow-400">Falta pagar:</span>
              <span className="text-yellow-300 font-bold">
                {formatCurrency(restanteReal)}
              </span>
            </div>
          </div>

          {/* Campo de valor pago */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quanto {pessoa} vai pagar agora?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                R$
              </span>
              <input
                type="text"
                value={valorPagoFecharMes}
                onChange={(e) =>
                  onValorChange(formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
                className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() =>
                  onValorChange(
                    restanteReal.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  )
                }
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
              >
                Restante ({formatCurrency(restanteReal)})
              </button>
              <button
                onClick={() => onValorChange("")}
                className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
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
                  ? "bg-orange-900/30 border border-orange-700"
                  : "bg-green-900/30 border border-green-700"
              }`}
            >
              <p className="text-sm text-gray-300 mb-2">Resumo:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Pagando agora:</span>
                  <span className="text-green-400 font-medium">
                    {formatCurrency(valorPago)}
                  </span>
                </div>
                {valorParaDebito > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      Vai para Saldo Devedor:
                    </span>
                    <span className="text-orange-400 font-medium">
                      {formatCurrency(valorParaDebito)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400 font-medium">
                      Quitado ✓
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors ${
                saving
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(pessoa)}
              disabled={saving}
              className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                saving
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
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
      </div>
    </div>
  );
};
