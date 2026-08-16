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
import { Rotulo } from "../ui/Rotulo";
import { Card } from "../ui/Card";

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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <Card
        padding="nenhum"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-divida-title"
        className="w-full max-w-[460px] max-h-[88vh] overflow-y-auto shadow-xl dark:shadow-black/60"
      >
        {/* Header do Modal */}
        <div className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-6 py-5 border-b border-zinc-100 dark:border-white/[0.05] flex items-center justify-between z-10">
          <div>
            <Rotulo>
              Cobranças
            </Rotulo>
            <h2 id="form-divida-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />
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
            <p className="text-sm text-amber-700 dark:text-amber-400">
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
              className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
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
              className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
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
                className="w-full h-11 pl-12 pr-3.5 font-mono tabular-nums border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
                inputMode="numeric"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-300 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-3 border text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors ${
                saving
                  ? "border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.04] cursor-not-allowed"
                  : "border-zinc-200 dark:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
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
                "Adicionar Cobrança"
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
