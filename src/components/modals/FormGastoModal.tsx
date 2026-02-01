import React from "react";
import { X, Loader2, CreditCard, Wallet } from "lucide-react";
import type { GastoForm, CartaoCredito, ContaBancaria } from "../../types";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
} from "../../utils/calculations";
import { PARCELAS_OPTIONS } from "../../utils/constants";
import { CATEGORIAS } from "../../utils/categories";

interface FormGastoModalProps {
  show: boolean;
  isEditing: boolean;
  formData: GastoForm;
  pessoas: string[];
  cartoes?: CartaoCredito[];
  contas?: ContaBancaria[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onFormChange: (data: GastoForm) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FormGastoModal: React.FC<FormGastoModalProps> = ({
  show,
  isEditing,
  formData,
  pessoas,
  cartoes = [],
  contas = [],
  saving,
  error,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!show) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "valor_total") {
      onFormChange({ ...formData, [name]: formatCurrencyInput(value) });
    } else if (name === "num_parcelas") {
      onFormChange({ ...formData, [name]: parseInt(value, 10) });
    } else {
      onFormChange({ ...formData, [name]: value });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header do Modal */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? "Editar Lançamento" : "Novo Lançamento"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "credito" })}
                className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                  formData.tipo === "credito"
                    ? "border-purple-500 bg-purple-900/50 text-purple-300"
                    : "border-gray-600 hover:border-gray-500 text-gray-400"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Crédito
              </button>
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "debito" })}
                className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                  formData.tipo === "debito"
                    ? "border-green-500 bg-green-900/50 text-green-300"
                    : "border-gray-600 hover:border-gray-500 text-gray-400"
                }`}
              >
                <Wallet className="w-5 h-5" />
                Débito
              </button>
            </div>
          </div>

          {/* Seletor de Cartão (só para crédito) */}
          {formData.tipo === "credito" && cartoes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Cartão de Crédito
              </label>
              <select
                name="cartao_id"
                value={formData.cartao_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-gray-700 text-white"
              >
                <option value="">Selecione um cartão</option>
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} (Limite: {formatCurrency(c.limite || 0)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de Conta Bancária (só para débito) */}
          {formData.tipo === "debito" && contas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Conta Bancária (opcional)
              </label>
              <select
                name="conta_id"
                value={formData.conta_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-gray-700 text-white"
              >
                <option value="">Selecione uma conta (opcional)</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.banco ? `(${c.banco})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Se selecionada, o valor será descontado do saldo.</p>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label
              htmlFor="descricao"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Descrição
            </label>
            <input
              type="text"
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              placeholder="Ex: iPhone 15, Supermercado..."
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-700 text-white placeholder-gray-400"
              required
            />
          </div>

          {/* Pessoa */}
          <div>
            <label
              htmlFor="pessoa"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Pessoa
            </label>
            <select
              id="pessoa"
              name="pessoa"
              value={formData.pessoa}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-700 text-white"
              required
            >
              <option value="">Selecione</option>
              {pessoas.map((pessoa) => (
                <option key={pessoa} value={pessoa}>
                  {pessoa}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Gerencie pessoas em Pessoas no menu
            </p>
          </div>

          {/* Categoria */}
          <div>
            <label
              htmlFor="categoria"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Categoria
            </label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-700 text-white"
              required
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label
              htmlFor="valor_total"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Valor Total
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                R$
              </span>
              <input
                type="text"
                id="valor_total"
                name="valor_total"
                value={formData.valor_total}
                onChange={handleInputChange}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-700 text-white placeholder-gray-400"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {/* Toggle Gasto Fixo Mensal */}
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
            <div>
              <span className="text-sm font-medium text-gray-300">Gasto Fixo Mensal</span>
              <p className="text-xs text-gray-500">Este gasto se repete todo mês</p>
            </div>
            <button
              type="button"
              onClick={() => onFormChange({ ...formData, recorrente: !formData.recorrente })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formData.recorrente ? "bg-teal-500" : "bg-gray-500"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                  formData.recorrente ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Parcelas */}
          <div>
            <label
              htmlFor="num_parcelas"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Parcelas
            </label>
            <select
              id="num_parcelas"
              name="num_parcelas"
              value={formData.recorrente ? 1 : formData.num_parcelas}
              onChange={handleInputChange}
              disabled={formData.recorrente}
              className={`w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-700 text-white ${
                formData.recorrente ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {PARCELAS_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num}x{" "}
                  {formData.valor_total &&
                    `de ${formatCurrency(
                      parseCurrency(formData.valor_total) / num
                    )}`}
                </option>
              ))}
            </select>
            {formData.recorrente && (
              <p className="text-xs text-teal-400 mt-1">
                ✓ Gasto fixo: aparece todo mês automaticamente
              </p>
            )}
          </div>

          {/* Data de Início */}
          <div>
            <label
              htmlFor="data_inicio"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Data da Primeira Parcela
            </label>
            <input
              type="date"
              id="data_inicio"
              name="data_inicio"
              value={formData.data_inicio}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-700 text-white"
              required
            />
          </div>

          {/* Preview */}
          {formData.valor_total && (
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Resumo:</p>
              <p className="font-medium text-white">
                {formData.num_parcelas}x de{" "}
                {formatCurrency(
                  parseCurrency(formData.valor_total) / formData.num_parcelas
                )}
              </p>
              <p className="text-sm text-gray-400">
                Total: {formatCurrency(parseCurrency(formData.valor_total))}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 flex items-center gap-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
