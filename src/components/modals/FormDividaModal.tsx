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
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header do Modal */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Nova Dívida Pendente
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-4 space-y-4">
          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
            <p className="text-sm text-orange-300">
              Use esta seção para registrar dívidas que não são gastos do mês
              atual. Ex: Alguém te deve dinheiro e vai pagar aos poucos.
            </p>
          </div>

          {/* Pessoa */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Pessoa (quem deve)
            </label>
            <select
              value={formData.pessoa}
              onChange={(e) =>
                onFormChange({ ...formData, pessoa: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none appearance-none bg-gray-700 text-white"
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
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
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-gray-700 text-white placeholder-gray-400"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Valor da Dívida
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
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
                className="w-full pl-12 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-gray-700 text-white placeholder-gray-400"
                inputMode="numeric"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 px-4 py-3 border text-gray-300 rounded-lg transition-colors ${
                saving
                  ? "border-gray-700 bg-gray-800 cursor-not-allowed"
                  : "border-gray-600 hover:bg-gray-700"
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                saving
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Adicionar Dívida"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
