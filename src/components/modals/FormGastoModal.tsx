import React from "react";
import { X, Loader2, CreditCard, Wallet, Check } from "lucide-react";
import type { GastoForm, CartaoCredito, ContaBancaria } from "../../types";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
} from "../../utils/calculations";
import {
  PARCELAS_OPTIONS,
  PARCELAS_PRESET_MAX,
  PARCELAS_MAX,
} from "../../utils/constants";
import { comCategoriaAtual } from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { useFocusTrap } from "../../hooks";
import { Rotulo } from "../ui/Rotulo";
import { Card } from "../ui/Card";

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
  const [customParcelasMode, setCustomParcelasMode] = React.useState(
    formData.num_parcelas > PARCELAS_PRESET_MAX
  );
  const [customParcelasInput, setCustomParcelasInput] = React.useState(
    String(formData.num_parcelas)
  );
  const dialogRef = useFocusTrap(onClose, show);
  const { categorias } = useCategorias("gasto");
  // Gasto gravado numa categoria que a pessoa excluiu depois continua listado —
  // sem isto o select abriria vazio e o próximo salvamento trocaria a categoria
  // dele sem ninguém pedir.
  const categoriasDoSelect = comCategoriaAtual(categorias, formData.categoria);

  React.useEffect(() => {
    if (show) {
      setCustomParcelasMode(formData.num_parcelas > PARCELAS_PRESET_MAX);
      setCustomParcelasInput(String(formData.num_parcelas));
    }
    // Roda só na abertura: recalcular a cada mudança de `num_parcelas` sobrescreveria
    // o modo custom enquanto o usuário digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "valor_total") {
      onFormChange({ ...formData, [name]: formatCurrencyInput(value) });
    } else if (name === "num_parcelas") {
      if (value === "custom") {
        setCustomParcelasMode(true);
        setCustomParcelasInput("");
        return;
      }
      setCustomParcelasMode(false);
      setCustomParcelasInput(value);
      onFormChange({ ...formData, [name]: parseInt(value, 10) });
    } else {
      onFormChange({ ...formData, [name]: value });
    }
  };

  const handleCustomParcelasChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = e.target.value;
    if (!/^\d*$/.test(nextValue)) return;

    setCustomParcelasInput(nextValue);

    if (nextValue === "") return;

    const parsed = parseInt(nextValue, 10);
    if (parsed >= 1 && parsed <= PARCELAS_MAX) {
      onFormChange({ ...formData, num_parcelas: parsed });
    }
  };

  const handleCustomParcelasBlur = () => {
    if (customParcelasInput === "") {
      return;
    }

    const parsed = parseInt(customParcelasInput, 10);
    const safeParcelas = Math.min(Math.max(parsed, 1), PARCELAS_MAX);
    setCustomParcelasInput(String(safeParcelas));
    onFormChange({ ...formData, num_parcelas: safeParcelas });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-modal flex items-center justify-center p-6">
      <Card
        padding="nenhum"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-gasto-title"
        className="w-full max-w-[460px] max-h-[88vh] overflow-y-auto shadow-xl dark:shadow-black/60"
      >
        {/* Header do Modal */}
        <div className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-6 py-5 border-b border-zinc-100 dark:border-white/[0.05] flex items-center justify-between z-10">
          <div>
            <Rotulo>
              Lançamentos
            </Rotulo>
            <h2 id="form-gasto-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {isEditing ? "Editar Lançamento" : "Novo Lançamento"}
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
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "credito" })}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                  formData.tipo === "credito"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Crédito
              </button>
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "debito" })}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                  formData.tipo === "debito"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
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
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Cartão de Crédito
              </label>
              <select
                name="cartao_id"
                value={formData.cartao_id}
                onChange={handleInputChange}
                className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
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
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Conta Bancária (opcional)
              </label>
              <select
                name="conta_id"
                value={formData.conta_id}
                onChange={handleInputChange}
                className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
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

          {/* Descrição */}
          <div>
            <label
              htmlFor="descricao"
              className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1"
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
              className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
              required
            />
          </div>

          {/* Pessoa */}
          <div>
            <label
              htmlFor="pessoa"
              className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Pessoa
            </label>
            <select
              id="pessoa"
              name="pessoa"
              value={formData.pessoa}
              onChange={handleInputChange}
              className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] appearance-none bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
              required
            >
              <option value="">Selecione</option>
              {pessoas.map((pessoa) => (
                <option key={pessoa} value={pessoa}>
                  {pessoa}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Gerencie pessoas em Pessoas no menu
            </p>
          </div>

          {/* Categoria */}
          <div>
            <label
              htmlFor="categoria"
              className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Categoria
            </label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleInputChange}
              className="w-full h-11 px-3.5 border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] appearance-none bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
              required
            >
              {categoriasDoSelect.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Crie ou renomeie categorias em Configurações
            </p>
          </div>

          {/* Valor */}
          <div>
            <label
              htmlFor="valor_total"
              className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Valor Total
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                R$
              </span>
              <input
                type="text"
                id="valor_total"
                name="valor_total"
                value={formData.valor_total}
                onChange={handleInputChange}
                placeholder="0,00"
                className="w-full h-11 pl-12 pr-3.5 font-mono tabular-nums border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {/* Toggle Gasto Fixo Mensal */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-white/[0.04] rounded-lg border border-zinc-200 dark:border-white/[0.06]">
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Gasto Fixo Mensal</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Este gasto se repete todo mês</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.recorrente}
              aria-label="Gasto Fixo Mensal"
              onClick={() => onFormChange({ ...formData, recorrente: !formData.recorrente })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formData.recorrente ? "bg-emerald-600" : "bg-zinc-400 dark:bg-zinc-600"
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
              className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Parcelas
            </label>
            <select
              id="num_parcelas"
              name="num_parcelas"
              value={
                formData.recorrente
                  ? "1"
                  : customParcelasMode
                  ? "custom"
                  : String(formData.num_parcelas)
              }
              onChange={handleInputChange}
              disabled={formData.recorrente}
              className={`w-full h-11 px-3.5 font-mono tabular-nums border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] appearance-none bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 ${
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
              <option value="custom">Personalizado (até 48x)</option>
            </select>
            {!formData.recorrente && customParcelasMode && (
              <div className="mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customParcelasInput}
                  onChange={handleCustomParcelasChange}
                  onBlur={handleCustomParcelasBlur}
                  className="w-full h-11 px-3.5 font-mono tabular-nums border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Informe entre 1x e {PARCELAS_MAX}x.
                </p>
              </div>
            )}
            {formData.recorrente && (
              <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                Gasto fixo: aparece todo mês automaticamente
              </p>
            )}
          </div>

          {/* Data de Início */}
          <div>
            <label
              htmlFor="data_inicio"
              className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Data da Primeira Parcela
            </label>
            <input
              type="date"
              id="data_inicio"
              name="data_inicio"
              value={formData.data_inicio}
              onChange={handleInputChange}
              className="w-full h-11 px-3.5 font-mono tabular-nums border border-zinc-200 dark:border-white/[0.09] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>

          {/* Preview */}
          {formData.valor_total && (
            <div className="bg-zinc-50 dark:bg-white/[0.04] rounded-lg p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Resumo:</p>
              <p className="font-mono valor font-medium text-zinc-900 dark:text-zinc-100">
                {formData.num_parcelas}x de{" "}
                {formatCurrency(
                  parseCurrency(formData.valor_total) / formData.num_parcelas
                )}
              </p>
              <p className="font-mono valor text-sm text-zinc-500 dark:text-zinc-400">
                Total: {formatCurrency(parseCurrency(formData.valor_total))}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-zinc-200 dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </Card>
    </div>
  );
};
