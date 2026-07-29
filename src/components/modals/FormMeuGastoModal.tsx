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
  formatCurrencyValue,
  parseCurrency,
} from "../../utils/calculations";
import { CATEGORIAS } from "../../utils/categories";
import {
  PARCELAS_OPTIONS,
  PARCELAS_PRESET_MAX,
  PARCELAS_MAX,
} from "../../utils/constants";
import { Rotulo } from "../ui/Rotulo";
import { Card } from "../ui/Card";

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
    // Roda só na abertura: recalcular a cada mudança de `num_parcelas` sobrescreveria
    // o modo custom enquanto o usuário digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  React.useEffect(() => {
    if (formData.categoria !== "dividido") return;

    const pessoasSelecionadas = formData.dividido_com_pessoas || [];
    if (pessoasSelecionadas.length === 0) return;

    const valorTotal = parseCurrency(formData.valor);
    if (valorTotal <= 0) return;

    const totalParticipantes = pessoasSelecionadas.length + 1;
    const minhaParteAutomatica = valorTotal / totalParticipantes;
    const minhaParteFormatada = formatCurrencyValue(minhaParteAutomatica);

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
    // `formData` inteiro e `onFormChange` ficam fora de propósito: o efeito chama
    // `onFormChange` com um `formData` novo, então listá-lo criaria loop. A escrita já
    // é protegida por `ultimaMinhaParteAutomaticaRef`, que impede sobrescrever valor
    // digitado à mão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <Card
        padding="nenhum"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-meu-gasto-title"
        className="w-full max-w-[460px] max-h-[88vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between z-10">
          <div>
            <Rotulo>
              Meus Gastos
            </Rotulo>
            <h2 id="form-meu-gasto-title" className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-100">
              {isEditing ? "Editar gasto" : "Novo gasto"}
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

        <div className="p-6 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
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
                className={`p-3 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "pessoal"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
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
                className={`p-3 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "dividido"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
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
                className={`p-3 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                  formData.categoria === "fixo"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                }`}
              >
                <Repeat className="w-5 h-5" />
                <span className="text-xs">Fixo</span>
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) =>
                onFormChange({ ...formData, descricao: e.target.value })
              }
              placeholder="Ex: Netflix, Almoço, etc."
              className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Valor Total
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
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
                className="w-full h-11 pl-10 pr-3 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Campos para Dividido */}
          {formData.categoria === "dividido" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 border border-emerald-600 rounded-full text-white text-sm font-medium"
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
                                ? "bg-emerald-600 border-emerald-600 text-white opacity-50 cursor-default"
                                : "bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
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
                  <div className="w-full h-11 px-3.5 flex items-center bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400">
                    Nenhuma pessoa cadastrada
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Sua parte
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
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
                    className="w-full h-11 pl-10 pr-3 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                    inputMode="numeric"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Preenchida automaticamente com a divisão igual entre você e as pessoas selecionadas. Você pode ajustar manualmente.
                </p>
              </div>
            </>
          )}

          {/* Campo para Fixo */}
          {formData.categoria === "fixo" && (
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
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
                className="w-full h-11 px-3.5 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
              />
            </div>
          )}

          {/* Categoria de Gasto */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Categoria do Gasto
            </label>
            <select
              value={formData.categoria_gasto || ""}
              onChange={(e) =>
                onFormChange({ ...formData, categoria_gasto: e.target.value })
              }
              className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
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
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) =>
                  onFormChange({ ...formData, data: e.target.value })
                }
                className="w-full h-11 px-3.5 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
              />
            </div>
          )}

          {/* Tipo (Crédito/Débito) */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
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
                className={`p-3 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo === "debito"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                }`}
              >
                <Wallet className="w-5 h-5" />
                Débito
              </button>
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "credito" })}
                className={`p-3 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo === "credito"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
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
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Cartão de Crédito
              </label>
              <select
                value={formData.cartao_id}
                onChange={(e) =>
                  onFormChange({ ...formData, cartao_id: e.target.value })
                }
                className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
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
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Conta Bancária (opcional)
              </label>
              <select
                value={formData.conta_id}
                onChange={(e) =>
                  onFormChange({ ...formData, conta_id: e.target.value })
                }
                className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
              >
                <option value="">Selecione uma conta (opcional)</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.banco ? `(${c.banco})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Se selecionada, o valor será descontado do saldo.</p>
            </div>
          )}

          {/* Parcelas (apenas para Crédito e não fixo) */}
          {formData.tipo === "credito" && formData.categoria !== "fixo" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
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
                  className="w-full h-11 px-3.5 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
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
                      className="w-full h-11 px-3.5 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Informe entre 1x e {PARCELAS_MAX}x.
                    </p>
                  </div>
                )}
                {parseInt(formData.num_parcelas) > 1 && formData.valor && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
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
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-300 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={saving}
            className={`w-full h-11 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
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
      </Card>
    </div>
  );
};
