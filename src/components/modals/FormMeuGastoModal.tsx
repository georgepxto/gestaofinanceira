import React from "react";
import {
  X,
  Loader2,
  AlertCircle,
  User,
  Users,
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
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto border-t sm:border border-gray-700">
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? "Editar Gasto Pessoal" : "Novo Gasto Pessoal"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Gasto
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  onFormChange({
                    ...formData,
                    categoria: "pessoal",
                  })
                }
                className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "pessoal"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs">Pessoal</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onFormChange({
                    ...formData,
                    categoria: "dividido",
                  })
                }
                className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "dividido"
                    ? "bg-pink-600 border-pink-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Dividido</span>
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
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <Repeat className="w-5 h-5" />
                <span className="text-xs">Fixo</span>
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) =>
                onFormChange({ ...formData, descricao: e.target.value })
              }
              placeholder="Ex: Netflix, Almoço, etc."
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Valor Total
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
                className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Campos para Dividido */}
          {formData.categoria === "dividido" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dividido com
                </label>
                <input
                  type="text"
                  value={formData.dividido_com}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      dividido_com: e.target.value,
                    })
                  }
                  placeholder="Ex: João, Maria, etc."
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Minha Parte
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </>
          )}

          {/* Campo para Fixo */}
          {formData.categoria === "fixo" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Dia do Vencimento (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_vencimento}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    dia_vencimento: e.target.value,
                  })
                }
                placeholder="Ex: 10"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          {/* Categoria de Gasto */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Categoria do Gasto
            </label>
            <select
              value={formData.categoria_gasto || ""}
              onChange={(e) =>
                onFormChange({ ...formData, categoria_gasto: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Selecione uma categoria</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Data (não para fixo) */}
          {formData.categoria !== "fixo" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) =>
                  onFormChange({ ...formData, data: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          {/* Tipo (Crédito/Débito) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
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
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
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
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Cartão de Crédito
              </label>
              <select
                value={formData.cartao_id}
                onChange={(e) =>
                  onFormChange({ ...formData, cartao_id: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Conta Bancária (opcional)
              </label>
              <select
                value={formData.conta_id}
                onChange={(e) =>
                  onFormChange({ ...formData, conta_id: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="">Selecione uma conta (opcional)</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.banco ? `(${c.banco})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Se selecionada, o valor será descontado do saldo.</p>
            </div>
          )}

          {/* Parcelas (apenas para Crédito e não fixo) */}
          {formData.tipo === "credito" && formData.categoria !== "fixo" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  <p className="text-sm text-gray-400 mt-1">
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
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={saving}
            className={`w-full py-3 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              saving
                ? "bg-gray-600 cursor-not-allowed"
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
