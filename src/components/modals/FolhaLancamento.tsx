import React from "react";
import { X, Loader2, ChevronDown, User, Users, Repeat, Wallet, CreditCard } from "lucide-react";
import { format, subDays } from "date-fns";
import type { MeuGastoForm, CartaoCredito, ContaBancaria } from "../../types";
import { useFocusTrap, useMinhaParteAutomatica } from "../../hooks";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
} from "../../utils/calculations";
import { comCategoriaAtual } from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { PARCELAS_OPTIONS } from "../../utils/constants";
import { Rotulo } from "../ui/Rotulo";

interface FolhaLancamentoProps {
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

const hoje = () => format(new Date(), "yyyy-MM-dd");
const ontem = () => format(subDays(new Date(), 1), "yyyy-MM-dd");

const CHIP_BASE = "h-9 px-3.5 rounded-full text-[13px] transition-colors";
const CHIP_ATIVO = "bg-emerald-600 text-white font-semibold";
const CHIP_INATIVO =
  "bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-300 font-medium";

/**
 * O mesmo formulário de gasto do desktop, na ordem do celular.
 *
 * O diálogo pergunta taxonomia primeiro ("Pessoal? Dividido?") e o valor só no
 * terceiro campo — mas na fila do mercado o usuário sabe de cabeça uma coisa:
 * quanto foi. Aqui o valor é a primeira e maior coisa da tela, categoria e data
 * são chips (nenhum popup nativo no caminho comum) e tudo que 90% dos
 * lançamentos não usam fica atrás de "Mais opções".
 *
 * Mesmas props, mesmo `formData`, mesma validação, mesmo `onSubmit` — são duas
 * apresentações do mesmo formulário, não dois formulários.
 */
export const FolhaLancamento: React.FC<FolhaLancamentoProps> = ({
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
  const folhaRef = useFocusTrap(onClose, show);
  const { categorias } = useCategorias("gasto");
  // Categoria excluída depois do lançamento continua listada: sem isto o chip
  // sumiria e o próximo salvamento trocaria a categoria do gasto.
  const categoriasDoSelect = comCategoriaAtual(categorias, formData.categoria_gasto);
  useMinhaParteAutomatica(formData, onFormChange);

  const precisaDeOpcoes = formData.categoria === "dividido" || formData.categoria === "fixo";
  const [maisOpcoes, setMaisOpcoes] = React.useState(precisaDeOpcoes);
  const [dataOutra, setDataOutra] = React.useState(
    formData.data !== hoje() && formData.data !== ontem()
  );

  React.useEffect(() => {
    if (!show) return;
    // Ao abrir para editar, nunca esconda dado que já existe.
    setMaisOpcoes(formData.categoria === "dividido" || formData.categoria === "fixo");
    setDataOutra(formData.data !== hoje() && formData.data !== ontem());
    // Só na abertura: reagir a cada troca de natureza fecharia a seção embaixo
    // do dedo de quem acabou de escolher "Dividido".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const Chip = ({
    ativo,
    onClick,
    children,
  }: {
    ativo: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`${CHIP_BASE} ${ativo ? CHIP_ATIVO : CHIP_INATIVO}`}
    >
      {children}
    </button>
  );

  const BotaoNatureza = ({
    valor,
    Icon,
    children,
  }: {
    valor: MeuGastoForm["categoria"];
    Icon: typeof User;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => onFormChange({ ...formData, categoria: valor })}
      className={`p-3 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
        formData.categoria === valor
          ? "bg-emerald-600 border-emerald-600 text-white"
          : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{children}</span>
    </button>
  );

  return (
    <>
      {/* Fundo de dispensa */}
      <div
        className="md:hidden fixed inset-0 z-modal bg-black/60"
        aria-hidden="true"
        /* ds-ok: fundo de dispensa. Quem usa teclado fecha no Esc e no X — o fundo não entra na ordem de foco de propósito */
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar lançamento" : "Novo lançamento"}
        ref={folhaRef}
        /* dvh, não vh: com o teclado aberto o `vh` deixa o rodapé fora da tela. */
        className="md:hidden fixed inset-x-0 bottom-0 z-modal flex flex-col max-h-[92dvh] rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/[0.09] shadow-xl dark:shadow-black/60"
      >
        {/* Cabeçalho */}
        <div className="shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-white/[0.14] mx-auto mt-2.5" aria-hidden="true" />
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <h2 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-100">
              {isEditing ? "Editar gasto" : "Novo gasto"}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* Valor — o assunto da tela */}
          <div className="flex items-baseline justify-center gap-2 pt-6 pb-7">
            <span className="font-mono text-xl text-zinc-400 dark:text-zinc-500">R$</span>
            <input
              data-autofocus
              inputMode="decimal"
              value={formData.valor}
              onChange={(e) =>
                onFormChange({ ...formData, valor: formatCurrencyInput(e.target.value) })
              }
              placeholder="0,00"
              aria-label="Valor"
              /* 44px é o degrau de herói da escala. O spec pedia 40, que não é
                 degrau nenhum — e o valor aqui é literalmente o herói da tela.
                 `valor-entrada` existe porque o `index.css` força 16px em todo
                 input com `!important` (anti-zoom do iOS) e engoliria o 44. */
              className="valor-entrada w-[62%] bg-transparent border-0 outline-none font-mono tabular-nums text-[44px] leading-none font-semibold text-zinc-900 dark:text-zinc-50 placeholder-zinc-300 dark:placeholder-zinc-600"
            />
          </div>

          {/* Descrição */}
          <input
            type="text"
            value={formData.descricao}
            onChange={(e) => onFormChange({ ...formData, descricao: e.target.value })}
            placeholder="Descrição (ex: mercado)"
            aria-label="Descrição"
            className="w-full h-11 bg-transparent border-0 border-b border-zinc-200 dark:border-white/[0.09] rounded-none text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500"
          />

          {/* Categoria */}
          <div className="pt-5">
            <Rotulo>Categoria</Rotulo>
            <div className="flex flex-wrap gap-2 mt-2">
              {categoriasDoSelect.map((cat) => (
                <Chip
                  key={cat}
                  ativo={formData.categoria_gasto === cat}
                  onClick={() => onFormChange({ ...formData, categoria_gasto: cat })}
                >
                  {cat}
                </Chip>
              ))}
            </div>
          </div>

          {/* Data — gasto fixo não tem data, tem dia de vencimento */}
          {formData.categoria !== "fixo" && (
            <div className="pt-5">
              <Rotulo>Data</Rotulo>
              <div className="flex flex-wrap gap-2 mt-2">
                <Chip
                  ativo={!dataOutra && formData.data === hoje()}
                  onClick={() => {
                    setDataOutra(false);
                    onFormChange({ ...formData, data: hoje() });
                  }}
                >
                  Hoje
                </Chip>
                <Chip
                  ativo={!dataOutra && formData.data === ontem()}
                  onClick={() => {
                    setDataOutra(false);
                    onFormChange({ ...formData, data: ontem() });
                  }}
                >
                  Ontem
                </Chip>
                <Chip ativo={dataOutra} onClick={() => setDataOutra(true)}>
                  Outra
                </Chip>
              </div>
              {dataOutra && (
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => onFormChange({ ...formData, data: e.target.value })}
                  aria-label="Data do gasto"
                  className="mt-2 w-full h-11 px-3.5 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              )}
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="pt-5">
            <Rotulo>Forma de pagamento</Rotulo>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "debito", num_parcelas: "1" })}
                className={`h-12 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo === "debito"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <Wallet className="w-5 h-5" />
                Débito
              </button>
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, tipo: "credito" })}
                className={`h-12 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo === "credito"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Crédito
              </button>
            </div>
          </div>

          {/* Cartão e parcelas — só no crédito, como no desktop */}
          {formData.tipo === "credito" && cartoes.length > 0 && (
            <div className="pt-4">
              <Rotulo>Cartão</Rotulo>
              <select
                value={formData.cartao_id}
                onChange={(e) => onFormChange({ ...formData, cartao_id: e.target.value })}
                aria-label="Cartão de crédito"
                className="mt-2 w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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

          {formData.tipo === "credito" && formData.categoria !== "fixo" && (
            <div className="pt-4">
              <Rotulo>Parcelas</Rotulo>
              <div className="flex flex-wrap gap-2 mt-2">
                {PARCELAS_OPTIONS.map((num) => (
                  <Chip
                    key={num}
                    ativo={parseInt(formData.num_parcelas, 10) === num}
                    onClick={() => onFormChange({ ...formData, num_parcelas: String(num) })}
                  >
                    {num}x
                  </Chip>
                ))}
              </div>
              {parseInt(formData.num_parcelas, 10) > 1 && formData.valor && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  {formData.num_parcelas}x de{" "}
                  {formatCurrency(parseCurrency(formData.valor) / parseInt(formData.num_parcelas, 10))}
                </p>
              )}
            </div>
          )}

          {/* Mais opções */}
          <button
            type="button"
            onClick={() => setMaisOpcoes((v) => !v)}
            aria-expanded={maisOpcoes}
            className="mt-5 w-full h-11 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400"
          >
            Mais opções
            <ChevronDown
              className={`w-4 h-4 transition-transform ${maisOpcoes ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {maisOpcoes && (
            <div className="space-y-4">
              <div>
                <Rotulo>Natureza</Rotulo>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <BotaoNatureza valor="pessoal" Icon={User}>
                    Pessoal
                  </BotaoNatureza>
                  <BotaoNatureza valor="dividido" Icon={Users}>
                    Dividido
                  </BotaoNatureza>
                  <BotaoNatureza valor="fixo" Icon={Repeat}>
                    Fixo
                  </BotaoNatureza>
                </div>
              </div>

              {formData.categoria === "dividido" && (
                <>
                  <div>
                    <Rotulo>Dividido com</Rotulo>
                    {pessoas.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pessoas.map((pessoa) => {
                          const selecionada = (formData.dividido_com_pessoas || []).includes(pessoa);
                          return (
                            <Chip
                              key={pessoa}
                              ativo={selecionada}
                              onClick={() => {
                                const atuais = formData.dividido_com_pessoas || [];
                                const nova = selecionada
                                  ? atuais.filter((p) => p !== pessoa)
                                  : [...atuais, pessoa];
                                onFormChange({
                                  ...formData,
                                  dividido_com_pessoas: nova,
                                  dividido_com: nova.length > 0 ? nova[0] : "",
                                });
                              }}
                            >
                              {pessoa}
                            </Chip>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Nenhuma pessoa cadastrada
                      </p>
                    )}
                  </div>

                  <div>
                    <Rotulo>Sua parte</Rotulo>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.minha_parte}
                        onChange={(e) =>
                          onFormChange({
                            ...formData,
                            minha_parte: formatCurrencyInput(e.target.value),
                          })
                        }
                        placeholder="0,00"
                        aria-label="Sua parte"
                        className="w-full h-11 pl-10 pr-3 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Dividida por igual entre você e as pessoas escolhidas. Dá para ajustar.
                    </p>
                  </div>
                </>
              )}

              {formData.categoria === "fixo" && (
                <div>
                  <Rotulo>Dia do vencimento</Rotulo>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_vencimento}
                    onChange={(e) => onFormChange({ ...formData, dia_vencimento: e.target.value })}
                    placeholder="Ex: 10"
                    aria-label="Dia do vencimento"
                    className="mt-2 w-full h-11 px-3.5 font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {formData.tipo === "debito" && contas.length > 0 && (
                <div>
                  <Rotulo>Conta bancária (opcional)</Rotulo>
                  <select
                    value={formData.conta_id}
                    onChange={(e) => onFormChange({ ...formData, conta_id: e.target.value })}
                    aria-label="Conta bancária"
                    className="mt-2 w-full h-11 px-3.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-xl text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Selecione uma conta (opcional)</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.banco ? `(${c.banco})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Se selecionada, o valor será descontado do saldo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="shrink-0 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-white/[0.06]">
          {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={onSubmit}
            disabled={saving || !formData.valor}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : isEditing ? (
              "Salvar"
            ) : (
              "Adicionar"
            )}
          </button>
        </div>
      </div>
    </>
  );
};
