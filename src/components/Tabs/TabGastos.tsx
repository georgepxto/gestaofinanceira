import {
  Calendar,
  Hash,
  Edit3,
  Trash2,
  CreditCard,
  Banknote,
  Undo2,
  MessageSquare,
  CheckCircle,
  Check,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../ui/AsyncState";
import type { ParcelaAtiva, ResumoMensal } from "../../types";
import type { PagamentoParcial } from "../../types/extended";
import { formatCurrency } from "../../utils/calculations";
import { toActionableErrorMessage } from "../../utils/feedbackMessages";

/** CHIP dos filtros. */
const chipClasse = (ativo: boolean) =>
  `px-3.5 py-2 rounded-[10px] text-[13px] transition-colors ${
    ativo
      ? "bg-emerald-600 text-white font-semibold"
      : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
  }`;

const BADGE_NEUTRA = "inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400";
const BADGE_AMBAR = "inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
const BADGE_ESMERALDA = "inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";

interface TabGastosProps {
  mesVisualizacao: Date;
  navegarMes: (direcao: "anterior" | "proximo") => void;
  irParaHoje: () => void;
  error: string | null;
  totalMes: number;
  parcelasAtivas: ParcelaAtiva[];
  loading: boolean;
  resumoMensal: ResumoMensal[];
  filtroPessoaGasto: string;
  setFiltroPessoaGasto: (pessoa: string) => void;
  filtroTipoGasto: string;
  setFiltroTipoGasto: (tipo: string) => void;
  filtroDiaGasto: string;
  setFiltroDiaGasto: (dia: string) => void;
  pessoas: string[];
  observacoesMes: Record<string, string>;
  getObsKey: (pessoa: string) => string;
  getPagamentosParciais: (pessoa: string) => PagamentoParcial[];
  getTotalPagoParcial: (pessoa: string) => number;
  handleAbrirObs: (pessoa: string) => void;
  handleDesfazerPagamentoParcial: (pessoa: string) => void;
  handleEditGasto: (gasto: any) => void;
  handleDelete: (id: string) => void;
  setShowPagamentoParcial: (pessoa: string | null) => void;
  setValorPagamentoParcial: (valor: string) => void;
  setShowFecharMes: (pessoa: string | null) => void;
  setValorPagoFecharMes: (valor: string) => void;
  isMesFechado: (pessoa: string) => boolean;
  getMesFechado: (pessoa: string) => { saldoDevedorId?: string; valorPago: number; valorDevedor: number } | null;
  handleDesfazerFechamento: (pessoa: string) => Promise<void>;
}

export function TabGastos({
  mesVisualizacao,
  error,
  totalMes,
  parcelasAtivas,
  loading,
  resumoMensal,
  filtroPessoaGasto,
  setFiltroPessoaGasto,
  filtroTipoGasto,
  setFiltroTipoGasto,
  filtroDiaGasto,
  setFiltroDiaGasto,
  pessoas,
  observacoesMes,
  getObsKey,
  getPagamentosParciais,
  getTotalPagoParcial,
  handleAbrirObs,
  handleDesfazerPagamentoParcial,
  handleEditGasto,
  handleDelete,
  setShowPagamentoParcial,
  setValorPagamentoParcial,
  setShowFecharMes,
  setValorPagoFecharMes,
  isMesFechado,
  getMesFechado,
  handleDesfazerFechamento,
}: TabGastosProps) {
  // Totais da faixa: emprestado (fluxo do mês), recebido e o que falta.
  const totalRecebido = resumoMensal.reduce((sum, r) => sum + getTotalPagoParcial(r.pessoa), 0);
  const totalAReceber = Math.max(totalMes - totalRecebido, 0);

  return (
    <>
      {/* Mensagem de Erro */}
      {error && (
        <PageErrorState
          compact
          title="Não foi possível carregar os empréstimos"
          description={toActionableErrorMessage(error, "Não foi possível carregar os lançamentos do mês.")}
        />
      )}

      {/* FAIXA_RESUMO */}
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-7 grid gap-x-7 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
        data-tour="gastos-resumo-cards"
      >
        <div className="min-w-0" data-tour="gastos-card-total">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">A receber</p>
          <p className="font-display font-extrabold tracking-tighter tabular-nums whitespace-nowrap text-[30px] leading-tight text-zinc-900 dark:text-zinc-50 mt-1">
            {formatCurrency(totalAReceber)}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">falta entrar neste mês</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Emprestado</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5 whitespace-nowrap">
            {formatCurrency(totalMes)}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{parcelasAtivas.length} {parcelasAtivas.length === 1 ? "lançamento" : "lançamentos"}</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Recebido</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5 whitespace-nowrap">
            {formatCurrency(totalRecebido)}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">pagamentos do período</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Devedores</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5">
            {resumoMensal.length}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">com lançamentos no mês</p>
        </div>
      </div>

      {/* Cards por devedor */}
      {resumoMensal.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {resumoMensal.map((resumo) => {
            const obsKey = getObsKey(resumo.pessoa);
            const temObs = observacoesMes[obsKey];
            const pagamentos = getPagamentosParciais(resumo.pessoa);
            const totalPago = getTotalPagoParcial(resumo.pessoa);
            const restante = resumo.total - totalPago;
            const temPagamentos = pagamentos.length > 0;
            const estaQuitado = temPagamentos && restante <= 0;
            const estaFechado = isMesFechado(resumo.pessoa);
            const mesFechadoData = getMesFechado(resumo.pessoa);
            const pctPago = resumo.total > 0 ? Math.min((totalPago / resumo.total) * 100, 100) : 0;
            const quitadoOuFechadoSemDivida = estaQuitado || (estaFechado && mesFechadoData && mesFechadoData.valorDevedor === 0);

            return (
              <div
                key={resumo.pessoa}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800 min-w-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex-shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                    <span className="font-display font-bold text-emerald-700 dark:text-emerald-400">
                      {resumo.pessoa.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{resumo.pessoa}</p>
                    <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{resumo.quantidade} {resumo.quantidade === 1 ? "item" : "itens"}</p>
                  </div>
                  {/* UMA atenuação: o status vem do badge, sem opacity no card */}
                  {quitadoOuFechadoSemDivida ? (
                    <span className={BADGE_ESMERALDA}><Check className="w-[11px] h-[11px]" /> Quitado</span>
                  ) : estaFechado ? (
                    <span className={BADGE_NEUTRA}>Fechado</span>
                  ) : temPagamentos ? (
                    <span className={BADGE_AMBAR}>Parcial</span>
                  ) : (
                    <span className={BADGE_AMBAR}>Em aberto</span>
                  )}
                </div>

                <div className="flex items-end justify-between gap-3 mt-4">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">a receber</span>
                  <span className={`font-mono tabular-nums text-[22px] font-semibold whitespace-nowrap ${
                    quitadoOuFechadoSemDivida ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                  }`}>
                    {formatCurrency(Math.max(restante, 0))}
                  </span>
                </div>

                {/* Progresso pago/total */}
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden mt-2">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pctPago}%` }} />
                </div>

                {/* Observação */}
                {temObs && (
                  <div className="mt-3 p-2.5 bg-zinc-50 dark:bg-white/[0.04] rounded-lg overflow-hidden">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 break-words whitespace-pre-wrap line-clamp-3">
                      {temObs}
                    </p>
                  </div>
                )}

                {/* Rodapé: nota + ações */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {estaFechado && mesFechadoData && mesFechadoData.valorDevedor > 0
                      ? `mês fechado · ${formatCurrency(mesFechadoData.valorDevedor)}`
                      : temPagamentos
                      ? `pago ${formatCurrency(totalPago)} de ${formatCurrency(resumo.total)}`
                      : "nenhum pagamento registrado"}
                  </p>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleAbrirObs(resumo.pessoa)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        temObs
                          ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
                      }`}
                      title={temObs ? "Editar observação" : "Adicionar observação"}
                    >
                      {temObs ? <Edit3 className="w-[15px] h-[15px]" /> : <MessageSquare className="w-[15px] h-[15px]" />}
                    </button>
                    {temPagamentos && (
                      <button
                        onClick={() => handleDesfazerPagamentoParcial(resumo.pessoa)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors"
                        title="Desfazer último pagamento"
                      >
                        <Undo2 className="w-[15px] h-[15px]" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!estaQuitado) {
                          setShowPagamentoParcial(resumo.pessoa);
                          setValorPagamentoParcial("");
                        }
                      }}
                      disabled={estaQuitado || estaFechado}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                      title={estaFechado ? "Mês fechado" : estaQuitado ? "Já quitado" : "Registrar pagamento"}
                    >
                      <Banknote className="w-[15px] h-[15px]" />
                    </button>
                    {estaFechado ? (
                      <button
                        onClick={() => handleDesfazerFechamento(resumo.pessoa)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                        title="Desfazer fechamento do mês"
                      >
                        <Undo2 className="w-[15px] h-[15px]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!estaQuitado) {
                            setShowFecharMes(resumo.pessoa);
                            setValorPagoFecharMes("");
                          }
                        }}
                        disabled={estaQuitado}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                        title={estaQuitado ? "Já quitado" : "Fechar mês"}
                      >
                        <CheckCircle className="w-[15px] h-[15px]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <PageLoadingState
          compact
          title="Carregando lançamentos"
          description="Estamos atualizando os empréstimos e os resumos deste mês."
        />
      )}

      {/* Card Lançamentos do mês */}
      {!loading && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-5" data-tour="gastos-lista">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
            Lançamentos do mês
          </h2>

          {/* Filtros */}
          <div className="space-y-3.5 mb-5" data-tour="gastos-filtros">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-2">
                Devedor
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFiltroPessoaGasto("")} className={chipClasse(filtroPessoaGasto === "")}>
                  Todos
                </button>
                {pessoas.map((pessoa) => (
                  <button key={pessoa} onClick={() => setFiltroPessoaGasto(pessoa)} className={chipClasse(filtroPessoaGasto === pessoa)}>
                    {pessoa}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-2">
                Tipo
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => setFiltroTipoGasto("")} className={chipClasse(filtroTipoGasto === "")}>
                  Todos
                </button>
                <button onClick={() => setFiltroTipoGasto("credito")} className={chipClasse(filtroTipoGasto === "credito")}>
                  Crédito
                </button>
                <button onClick={() => setFiltroTipoGasto("debito")} className={chipClasse(filtroTipoGasto === "debito")}>
                  Débito
                </button>
                <div className="relative ml-auto">
                  <input
                    type="date"
                    value={filtroDiaGasto}
                    onChange={(e) => setFiltroDiaGasto(e.target.value)}
                    max={format(mesVisualizacao, "yyyy-MM") + "-31"}
                    min={format(mesVisualizacao, "yyyy-MM") + "-01"}
                    className="px-3 py-2 pl-9 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-[10px] text-[13px] font-mono tabular-nums text-zinc-800 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] dark:[color-scheme:dark]"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 pointer-events-none" />
                </div>
                {filtroDiaGasto && (
                  <button onClick={() => setFiltroDiaGasto("")} className={chipClasse(false)}>
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {parcelasAtivas.length === 0 ? (
            <PageEmptyState
              compact
              title="Nenhum lançamento encontrado"
              description={`Ajuste os filtros ou crie um novo empréstimo para este mês.${
                filtroPessoaGasto || filtroTipoGasto || filtroDiaGasto
                  ? " Os filtros atuais podem estar ocultando resultados."
                  : ""
              }`}
            />
          ) : (
            <div className="space-y-5">
              {(() => {
                // parcelasAtivas já vem filtrado do hook
                const parcelasFiltradas = parcelasAtivas;

                // Agrupar parcelas por dia
                const parcelasPorDia: Record<string, typeof parcelasFiltradas> = {};
                parcelasFiltradas.forEach((parcela) => {
                  const dia = parcela.gasto.data_inicio.substring(8, 10);
                  if (!parcelasPorDia[dia]) {
                    parcelasPorDia[dia] = [];
                  }
                  parcelasPorDia[dia].push(parcela);
                });

                // Ordenar dias (mais recentes primeiro)
                const diasOrdenados = Object.keys(parcelasPorDia).sort((a, b) =>
                  b.localeCompare(a)
                );

                return diasOrdenados.map((dia) => (
                  <div key={dia}>
                    {/* Cabeçalho do dia */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Dia {parseInt(dia, 10)}
                      </span>
                      <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.04]"></div>
                    </div>
                    {/* Lista de parcelas do dia */}
                    <ul className="space-y-2.5">
                      {parcelasPorDia[dia].map(
                        ({ gasto, parcela_atual, valor_parcela }) => (
                          <li
                            key={gasto.id}
                            className="bg-[#FCFCFC] dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] rounded-[14px] p-3.5"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span className={BADGE_NEUTRA}>
                                    {gasto.tipo === "credito" ? (
                                      <CreditCard className="w-3 h-3" />
                                    ) : (
                                      <Banknote className="w-3 h-3" />
                                    )}
                                    {gasto.tipo === "credito" ? "Crédito" : "Débito"}
                                  </span>
                                  {gasto.recorrente && (
                                    <span className={BADGE_NEUTRA}>
                                      <Repeat className="w-3 h-3" />
                                      Fixo
                                    </span>
                                  )}
                                  <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {gasto.pessoa}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {gasto.descricao}
                                </p>
                                <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {gasto.recorrente
                                    ? `mensal · valor ${formatCurrency(gasto.valor_total)}`
                                    : `parcela ${parcela_atual}/${gasto.num_parcelas} · total ${formatCurrency(gasto.valor_total)}`}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-mono tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  {formatCurrency(valor_parcela)}
                                </p>
                                <div className="flex items-center justify-end gap-0.5 mt-1.5" data-tour="gastos-item-acoes">
                                  <button
                                    onClick={() => handleEditGasto(gasto)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Edit3 className="w-[15px] h-[15px]" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(gasto.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-[15px] h-[15px]" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
