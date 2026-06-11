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
import { useFocusTrap } from "../../hooks";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
} from "../../utils/calculations";
import { CATEGORIAS } from "../../utils/categories";
import {
  PARCELAS_OPTIONS,
  PARCELAS_PRESET_MAX,
  PARCELAS_MAX,
} from "../../utils/constants";

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
  const parcelasSelecionadas = parseInt(formData.num_parcelas, 10) || 1;
  const [customParcelasMode, setCustomParcelasMode] = React.useState(
    parcelasSelecionadas > PARCELAS_PRESET_MAX
  );
  const [customParcelasInput, setCustomParcelasInput] = React.useState(
    formData.num_parcelas
  );
  const ultimaMinhaParteAutomaticaRef = React.useRef<string>("");
  const dialogRef = useFocusTrap(onClose, show);

  React.useEffect(() => {
    if (show) {
      setCustomParcelasMode(parcelasSelecionadas > PARCELAS_PRESET_MAX);
      setCustomParcelasInput(formData.num_parcelas);
    }
  }, [show]);

  React.useEffect(() => {
    if (formData.categoria !== "dividido") return;

    const pessoasSelecionadas = formData.dividido_com_pessoas || [];
    if (pessoasSelecionadas.length === 0) return;

    const valorTotal = parseCurrency(formData.valor);
    if (valorTotal <= 0) return;

    const totalParticipantes = pessoasSelecionadas.length + 1;
    const minhaParteAutomatica = valorTotal / totalParticipantes;
    const minhaParteFormatada = formatCurrency(minhaParteAutomatica).replace("R$\u00a0", "");

    if (
      formData.minha_parte.trim() === "" ||
      formData.minha_parte === ultimaMinhaParteAutomaticaRef.current
    ) {
      ultimaMinhaParteAutomaticaRef.current = minhaParteFormatada;
      onFormChange({
        ...formData,
        minha_parte: minhaParteFormatada,
      });
    }
  }, [formData.categoria, formData.dividido_com_pessoas, formData.valor]);

  const handleCustomParcelasChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = e.target.value;
    if (!/^\d*$/.test(nextValue)) return;

    setCustomParcelasInput(nextValue);

    if (nextValue === "") return;

    const parsed = parseInt(nextValue, 10);
    if (parsed >= 1 && parsed <= PARCELAS_MAX) {
      onFormChange({ ...formData, num_parcelas: String(parsed) });
    }
  };

  const handleCustomParcelasBlur = () => {
    if (customParcelasInput === "") {
      return;
    }

    const parsed = parseInt(customParcelasInput, 10);
    const safeParcelas = Math.min(Math.max(parsed, 1), PARCELAS_MAX);
    setCustomParcelasInput(String(safeParcelas));
    onFormChange({ ...formData, num_parcelas: String(safeParcelas) });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-modal flex items-end sm:items-center justify-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-meu-gasto-title"
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto border-t sm:border border-gray-200 dark:border-gray-800"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10">
          <h2 id="form-meu-gasto-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? "Editar Gasto Pessoal" : "Novo Gasto Pessoal"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
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
                    ? "bg-blue-600 border-blue-500 text-gray-900 dark:text-gray-100"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
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
                    ? "bg-pink-600 border-pink-500 text-gray-900 dark:text-gray-100"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
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
                    ? "bg-amber-600 border-amber-500 text-gray-900 dark:text-gray-100"
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
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Campos para Dividido */}
          {formData.categoria === "dividido" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Dividido com (selecione uma ou mais pessoas)
                </label>
                {pessoas && pessoas.length > 0 ? (
                  <div className="space-y-3">
                    {/* Pills com pessoas selecionadas */}
                    {(formData.dividido_com_pessoas || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(formData.dividido_com_pessoas || []).map((pessoa) => (
                          <div
                            key={pessoa}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-full text-emerald-900 dark:text-emerald-100 text-sm font-medium"
                          >
                            <span>{pessoa}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const pessoasSelecionadas = formData.dividido_com_pessoas || [];
                                const novaSelecao = pessoasSelecionadas.filter((p) => p !== pessoa);
                                onFormChange({
                                  ...formData,
                                  dividido_com_pessoas: novaSelecao,
                                  dividido_com: novaSelecao.length > 0 ? novaSelecao[0] : "",
                                });
                              }}
                              className="hover:opacity-70 transition-opacity ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Botões para adicionar pessoas */}
                    <div className="grid grid-cols-2 gap-2">
                      {pessoas.map((pessoa) => {
                        const isSelected = (formData.dividido_com_pessoas || []).includes(pessoa);
                        return (
                          <button
                            key={pessoa}
                            type="button"
                            onClick={() => {
                              if (!isSelected) {
                                const pessoasSelecionadas = formData.dividido_com_pessoas || [];
                                const novaSelecao = [...pessoasSelecionadas, pessoa];
                                onFormChange({
                                  ...formData,
                                  dividido_com_pessoas: novaSelecao,
                                  dividido_com: novaSelecao.length > 0 ? novaSelecao[0] : "",
                                });
                              }
                            }}
                            className={`px-3 py-2 rounded-lg border transition-colors font-medium text-sm ${
                              isSelected
                                ? "bg-emerald-600 border-emerald-500 text-white opacity-50 cursor-default"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            disabled={isSelected}
                          >
                            {pessoa}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                    Nenhuma pessoa cadastrada
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sua parte
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
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                    inputMode="numeric"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Preenchida automaticamente com a divisão igual entre você e as pessoas selecionadas. Você pode ajustar manualmente.
                </p>
              </div>
            </>
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
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    dia_vencimento: e.target.value,
                  })
                }
                placeholder="Ex: 10"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
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
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) =>
                  onFormChange({ ...formData, data: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

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
                    ? "bg-green-600 border-green-500 text-gray-900 dark:text-gray-100"
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
                    ? "bg-purple-600 border-purple-500 text-gray-900 dark:text-gray-100"
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
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none"
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
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
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
                  value={customParcelasMode ? "custom" : formData.num_parcelas}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setCustomParcelasMode(true);
                      setCustomParcelasInput("");
                      return;
                    }

                    setCustomParcelasMode(false);
                    setCustomParcelasInput(e.target.value);

                    onFormChange({
                      ...formData,
                      num_parcelas: e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {PARCELAS_OPTIONS.map((num) => (
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
                  <option value="custom">Personalizado (ate 48x)</option>
                </select>
                {customParcelasMode && (
                  <div className="mt-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customParcelasInput}
                      onChange={handleCustomParcelasChange}
                      onBlur={handleCustomParcelasBlur}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Informe entre 1x e {PARCELAS_MAX}x.
                    </p>
                  </div>
                )}
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
            <div className="bg-red-100 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={saving}
            className={`w-full py-3 text-gray-900 dark:text-gray-100 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
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
