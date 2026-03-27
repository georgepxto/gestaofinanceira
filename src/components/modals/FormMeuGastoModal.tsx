import React from "react";
import {
  X,
  Loader2,
  AlertCircle,
  User,
  Wallet,
  CreditCard,
  Repeat,
} from "lucide-react";
import type { MeuGastoForm, CartaoCredito, ContaBancaria } from "../../types";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
} from "../../utils/calculations";
import { CATEGORIAS } from "../../utils/categories";

interface FormMeuGastoModalProps {
  show: boolean;
  isEditing: boolean;
  formData: MeuGastoForm;
  saving: boolean;
  error: string | null;
  cartoes?: CartaoCredito[];
  contas?: ContaBancaria[];
  pessoas?: string[];
  onClose: () => void;
  onFormChange: (data: MeuGastoForm) => void;
  onSubmit: () => void;
}

export const FormMeuGastoModal: React.FC<FormMeuGastoModalProps> = ({
  show,
  isEditing,
  formData,
  saving,
  error,
  cartoes = [],
  contas = [],
  pessoas = [],
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!show) return null;

  const isDividido = !!formData.dividido_com || formData.categoria === 'dividido';
  const selectedPessoas = formData.dividido_com ? formData.dividido_com.split(',').map(p => p.trim()).filter(Boolean) : [];

  const togglePessoa = (pessoa: string) => {
    let newPessoas;
    if (selectedPessoas.includes(pessoa)) {
      newPessoas = selectedPessoas.filter(p => p !== pessoa);
    } else {
      newPessoas = [...selectedPessoas, pessoa];
    }
    onFormChange({ ...formData, dividido_com: newPessoas.join(', ') });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto border-t sm:border border-gray-200 dark:border-gray-800">
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {isEditing ? "Editar Gasto Pessoal" : "Novo Gasto Pessoal"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Tipo de Gasto
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onFormChange({
                    ...formData,
                    categoria: "pessoal",
                  })
                }
                className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "pessoal" || formData.categoria === "dividido"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs">Único</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onFormChange({
                    ...formData,
                    categoria: "fixo",
                  })
                }
                className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "fixo"
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                <Repeat className="w-5 h-5" />
                <span className="text-xs">Fixo</span>
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) =>
                onFormChange({ ...formData, descricao: e.target.value })
              }
              placeholder="Ex: Netflix, Almoço, etc."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Valor Total
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
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
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                inputMode="numeric"
              />
            </div>
          </div>

{/* Toggle Dividir Gasto */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Dividir gasto com outras pessoas?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isDividido) {
                  onFormChange({ ...formData, dividido_com: " " });
                } else {
                  onFormChange({ ...formData, dividido_com: "", minha_parte: "" });
                }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isDividido ? "bg-emerald-500" : "bg-gray-500"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-gray-900 rounded-full transition-all duration-200 ${
                  isDividido ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Campos para Dividido */}
          {isDividido && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Selecione as pessoas
                </label>
                {pessoas.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {pessoas.map((pessoa) => (
                      <label key={pessoa} className="flex items-center gap-2 p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedPessoas.includes(pessoa)}
                          onChange={() => togglePessoa(pessoa)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{pessoa}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-1">Nenhuma pessoa cadastrada no sistema.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sua Parte (Quanto você vai pagar disso)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formData.minha_parte}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        minha_parte: formatCurrencyInput(e.target.value),
                      })
                    }
                    placeholder="0,00"
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campo para Fixo */}
          {formData.categoria === "fixo" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Dia do Vencimento (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_vencimento}
                onChange={(e) => {
                  const dayStr = e.target.value.padStart(2, '0');
                  const newData = formData.data.substring(0, 8) + (dayStr === '00' ? '01' : dayStr);
                  onFormChange({
                    ...formData,
                    dia_vencimento: e.target.value,
                    data: e.target.value ? newData : formData.data,
                  });
                }}
                placeholder="Ex: 10"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          {/* Categoria de Gasto */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Categoria do Gasto
            </label>
            <select
              value={formData.categoria_gasto || ""}
              onChange={(e) =>
                onFormChange({ ...formData, categoria_gasto: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Selecione uma categoria</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {formData.categoria === "fixo" ? "Data de Início" : "Data"}
            </label>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => {
                const newData = e.target.value;
                const newDay = newData.substring(8, 10);
                onFormChange({ 
                  ...formData, 
                  data: newData,
                  dia_vencimento: formData.categoria === 'fixo' ? parseInt(newDay).toString() : formData.dia_vencimento
                });
              }}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Tipo (Crédito/Débito) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onFormChange({
                    ...formData,
                    tipo: "debito",
                    num_parcelas: "1",
                  })
                }
                className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo === "debito"
                    ? "bg-green-600 border-green-500 text-white"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                <Wallet className="w-5 h-5" />
                Débito
              </button>
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "credito" })}
                className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo === "credito"
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Crédito
              </button>
            </div>
          </div>

          {/* Cartão de Crédito - aparece para TODOS os gastos no crédito */}
          {formData.tipo === "credito" && cartoes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Cartão de Crédito
              </label>
              <select
                value={formData.cartao_id}
                onChange={(e) =>
                  onFormChange({ ...formData, cartao_id: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">Selecione um cartão</option>
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conta Bancária - aparece para débito */}
          {formData.tipo === "debito" && contas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Conta Bancária (opcional)
              </label>
              <select
                value={formData.conta_id}
                onChange={(e) =>
                  onFormChange({ ...formData, conta_id: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="">Selecione uma conta (opcional)</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.banco ? `(${c.banco})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Se selecionada, o valor será descontado do saldo.</p>
            </div>
          )}

          {/* Parcelas (apenas para Crédito e não fixo) */}
          {formData.tipo === "credito" && formData.categoria !== "fixo" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Número de Parcelas
                </label>
                <select
                  value={formData.num_parcelas}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      num_parcelas: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}x{" "}
                      {num === 1
                        ? "(à vista)"
                        : `de ${
                            formData.valor
                              ? formatCurrency(
                                  parseCurrency(formData.valor) / num
                                )
                              : "R$ 0,00"
                          }`}
                    </option>
                  ))}
                </select>
                {parseInt(formData.num_parcelas) > 1 && formData.valor && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formData.num_parcelas}x de{" "}
                    {formatCurrency(
                      parseCurrency(formData.valor) /
                        parseInt(formData.num_parcelas)
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={saving}
            className={`w-full py-3 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              saving
                ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              <>Salvar Alterações</>
            ) : (
              <>
                {formData.categoria === "fixo"
                  ? "Adicionar Gasto Fixo"
                  : "Adicionar Gasto"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
