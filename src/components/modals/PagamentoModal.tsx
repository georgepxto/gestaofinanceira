import React from "react";
import { X, Loader2, Banknote } from "lucide-react";
import { formatCurrencyInput } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";
import { Card } from "../ui/Card";

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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <Card
        padding="nenhum"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pagamento-modal-title"
        className="w-full max-w-[460px]"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 id="pagamento-modal-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Registrar Pagamento
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-sm">
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
          <button
            onClick={() => onTudo(valorAtual)}
            disabled={saving}
            className={`w-full px-4 py-2.5 rounded-xl font-medium transition-colors text-sm ${
              saving
                ? "bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                : "bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
            }`}
          >
            Tudo
          </button>
          <input
            type="text"
            value={obsPagamento}
            onChange={(e) => onObsChange(e.target.value)}
            placeholder="Observação (opcional)"
            className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-2.5 text-zinc-800 dark:text-zinc-100 rounded-xl font-medium transition-colors text-sm ${
                saving
                  ? "bg-zinc-50 dark:bg-white/[0.04] cursor-not-allowed"
                  : "bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:bg-white/[0.07] dark:hover:bg-white/[0.08]"
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onSubmit(dividaId)}
              disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm ${
                saving
                  ? "bg-zinc-200 dark:bg-white/[0.07] text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
      </Card>
    </div>
  );
};
