import React from "react";
import {
  X,
  Loader2,
  AlertCircle,
  User,
  FileText,
  DollarSign,
  Clock,
} from "lucide-react";
import type { SaldoDevedorForm } from "../../types";
import { formatCurrencyInput } from "../../utils/calculations";
import { useFocusTrap } from "../../hooks";

interface FormDividaModalProps {
  show: boolean;
  formData: SaldoDevedorForm;
  pessoas: string[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onFormChange: (data: SaldoDevedorForm) => void;
  onSubmit: () => void;
}

export const FormDividaModal: React.FC<FormDividaModalProps> = ({
  show,
  formData,
  pessoas,
  saving,
  error,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const dialogRef = useFocusTrap(onClose, show);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-end sm:items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-divida-title"
        className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800"
      >
        {/* Header do Modal */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              Cobranças
            </p>
            <h2 id="form-divida-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Nova Cobrança em Aberto
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-4 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3">
            <p className="text-sm text-amber-700 dark:text-amber-500">
              Use esta seção para registrar valores a receber que não são
              empréstimos do mês atual. Ex: alguém te deve e vai pagar aos poucos.
            </p>
          </div>

          {/* Pessoa */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Pessoa (quem deve)
            </label>
            <select
              value={formData.pessoa}
              onChange={(e) =>
                onFormChange({ ...formData, pessoa: e.target.value })
              }
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
            >
              <option value="">Selecione...</option>
              {pessoas.map((pessoa) => (
                <option key={pessoa} value={pessoa}>
                  {pessoa}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) =>
                onFormChange({ ...formData, descricao: e.target.value })
              }
              placeholder="Ex: Empréstimo de Janeiro, Dívida do carro..."
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Valor da Dívida
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                R$
              </span>
              <input
                type="text"
                value={formData.valor}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    valor: formatCurrencyInput(e.target.value),
                  })
                }
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 font-mono tabular-nums border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
                inputMode="numeric"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-3 border text-zinc-600 dark:text-zinc-400 rounded-lg transition-colors ${
                saving
                  ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-white/[0.04] cursor-not-allowed"
                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
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
                "Adicionar Cobrança"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
