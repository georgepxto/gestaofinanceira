import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Hash,
  Edit3,
  Trash2,
  CreditCard,
  Banknote,
  Undo2,
  MessageSquare,
  CheckCircle,
  CircleDot,
  Check,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../ui/AsyncState";
import type { ParcelaAtiva, ResumoMensal } from "../../types";
import type { PagamentoParcial } from "../../types/extended";
import { formatCurrency, formatMonthYear } from "../../utils/calculations";
import { toActionableErrorMessage } from "../../utils/feedbackMessages";

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
  navegarMes,
  irParaHoje,
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
  return (
    <>
      {/* Navegação de Meses */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-4 border border-zinc-200 dark:border-zinc-800" data-tour="gastos-navegacao-mes">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-zinc-50 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
          </button>

          <div className="text-center">
            <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-emerald-600 hover:text-emerald-700 mt-1"
            >
              Ir para hoje
            </button>
          </div>

          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-zinc-50 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <PageErrorState
          compact
          title="Não foi possível carregar os empréstimos"
          description={toActionableErrorMessage(error, "Não foi possível carregar os lançamentos do mês.")}
        />
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="gastos-resumo-cards">
        {/* Card Total Geral */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800" data-tour="gastos-card-total">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 mb-1">Total do Mês</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalMes)}</p>
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            {parcelasAtivas.length} lançamentos
          </p>
        </div>

        {/* Cards por Pessoa */}
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

          return (
            <div
              key={resumo.pessoa}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      {resumo.pessoa.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{resumo.pessoa}</span>
                    {estaFechado && mesFechadoData && mesFechadoData.valorDevedor > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.09]">
                        <CircleDot className="w-[11px] h-[11px]" />
                        Fechado
                      </span>
                    )}
                    {(estaQuitado || (estaFechado && mesFechadoData && mesFechadoData.valorDevedor === 0)) && (
                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                        <Check className="w-[11px] h-[11px]" />
                        Quitado
                      </span>
                    )}
                  </p>
                  <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(resumo.total)}
                  </p>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {resumo.quantidade} itens
                  </p>

                  {/* Pagamentos Parciais */}
                  {temPagamentos && (
                    <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Pago:
                        </span>
                        <button
                          onClick={() =>
                            handleDesfazerPagamentoParcial(resumo.pessoa)
                          }
                          className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors flex-shrink-0"
                          title="Desfazer último"
                        >
                          <Undo2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>
                      {pagamentos.map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs gap-1"
                        >
                          <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                            {p.data}
                          </span>
                          <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-300 font-medium flex-shrink-0">
                            {formatCurrency(p.valor)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-emerald-200 dark:border-emerald-800 mt-1 pt-1 flex justify-between">
                        {estaQuitado ? (
                          <>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Quitado
                            </span>
                            <span className="font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-300 font-bold flex-shrink-0">
                              {formatCurrency(totalPago)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-amber-600 dark:text-amber-400">Falta:</span>
                            <span className="font-mono tabular-nums text-xs text-amber-700 dark:text-amber-300 font-bold flex-shrink-0">
                              {formatCurrency(restante)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observação */}
                  {temObs && (
                    <div className="mt-2 p-2 bg-zinc-50 dark:bg-white/[0.04] rounded-lg overflow-hidden">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 break-words whitespace-pre-wrap line-clamp-3">
                        {temObs}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => handleAbrirObs(resumo.pessoa)}
                    className={`p-1.5 ${temObs ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"} hover:bg-zinc-200 dark:hover:bg-white/[0.08] rounded-lg transition-colors`}
                    title={
                      temObs ? "Editar observação" : "Adicionar observação"
                    }
                  >
                    {temObs ? (
                      <Edit3 className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (!estaQuitado) {
                        setShowPagamentoParcial(resumo.pessoa);
                        setValorPagamentoParcial("");
                      }
                    }}
                    disabled={estaQuitado || estaFechado}
                    className={`p-1.5 ${
                      estaQuitado || estaFechado
                        ? "bg-zinc-100 dark:bg-white/[0.04] text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                        : temPagamentos
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30"
                        : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
                    } rounded-lg transition-colors`}
                    title={estaFechado ? "Mês fechado" : estaQuitado ? "Já quitado" : "Pagamento parcial"}
                  >
                    <Banknote className="w-4 h-4" />
                  </button>
                  {estaFechado ? (
                    <button
                      onClick={() => handleDesfazerFechamento(resumo.pessoa)}
                      className="p-1.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-lg transition-colors"
                      title="Desfazer fechamento do mês"
                    >
                      <Undo2 className="w-4 h-4" />
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
                      className={`p-1.5 ${
                        estaQuitado
                          ? "bg-zinc-100 dark:bg-white/[0.04] text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                          : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
                      } rounded-lg transition-colors`}
                      title={estaQuitado ? "Já quitado" : "Fechar mês"}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <PageLoadingState
          compact
          title="Carregando lançamentos"
          description="Estamos atualizando os empréstimos e os resumos deste mês."
        />
      )}

      {/* Lista de Lançamentos */}
      {!loading && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden border border-zinc-200 dark:border-zinc-800" data-tour="gastos-lista">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800" data-tour="gastos-filtros">
            <h3 className="font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
              Empréstimos do Mês
            </h3>

            {/* Filtros */}
            <div className="space-y-3">
              {/* Filtro por Pessoa */}
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 block">
                  Filtrar por devedor:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFiltroPessoaGasto("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroPessoaGasto === ""
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                    }`}
                  >
                    Todos
                  </button>
                  {pessoas.map((pessoa) => (
                    <button
                      key={pessoa}
                      onClick={() => setFiltroPessoaGasto(pessoa)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filtroPessoaGasto === pessoa
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                      }`}
                    >
                      {pessoa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por Tipo */}
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 block">
                  Filtrar por tipo:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFiltroTipoGasto("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroTipoGasto === ""
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroTipoGasto("credito")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      filtroTipoGasto === "credito"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Crédito
                  </button>
                  <button
                    onClick={() => setFiltroTipoGasto("debito")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      filtroTipoGasto === "debito"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Débito
                  </button>
                </div>
              </div>

              {/* Filtro por Data */}
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 block">
                  Filtrar por dia:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={filtroDiaGasto}
                      onChange={(e) => setFiltroDiaGasto(e.target.value)}
                      max={format(mesVisualizacao, "yyyy-MM") + "-31"}
                      min={format(mesVisualizacao, "yyyy-MM") + "-01"}
                      className="w-full px-3 py-1.5 pl-10 rounded-lg text-sm font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none dark:[color-scheme:dark]"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                  </div>
                  {filtroDiaGasto && (
                    <button
                      onClick={() => setFiltroDiaGasto("")}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {parcelasAtivas.length === 0 ? (
            <div className="p-4">
              <PageEmptyState
                compact
                title="Nenhum lançamento encontrado"
                description={`Ajuste os filtros ou crie um novo empréstimo para este mês.${
                  filtroPessoaGasto || filtroTipoGasto || filtroDiaGasto
                    ? " Os filtros atuais podem estar ocultando resultados."
                    : ""
                }`}
              />
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {(() => {
                // Filtrar parcelas
                // Usar parcelasFiltradas diretamente já que parcelasAtivas já vem filtrado do hook
                const parcelasFiltradas = parcelasAtivas;

                // Agrupar parcelas por dia
                const parcelasPorDia: Record<string, typeof parcelasFiltradas> =
                  {};
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
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Dia {dia}
                      </span>
                      <div className="flex-1 h-px bg-zinc-200 dark:bg-white/[0.04]"></div>
                    </div>
                    {/* Lista de parcelas do dia */}
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl overflow-hidden">
                      {parcelasPorDia[dia].map(
                        ({ gasto, parcela_atual, valor_parcela }) => (
                          <li
                            key={gasto.id}
                            className="p-4 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors bg-zinc-50 dark:bg-white/[0.04]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium border bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.09]">
                                    {gasto.tipo === "credito" ? (
                                      <CreditCard className="w-3 h-3" />
                                    ) : (
                                      <Banknote className="w-3 h-3" />
                                    )}
                                    {gasto.tipo === "credito"
                                      ? "Crédito"
                                      : "Débito"}
                                  </span>
                                  {gasto.recorrente && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.09]">
                                      <Repeat className="w-3 h-3" />
                                      Fixo
                                    </span>
                                  )}
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {gasto.pessoa}
                                  </span>
                                </div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {gasto.descricao}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {gasto.recorrente ? (
                                      <span className="text-zinc-500">Mensal</span>
                                    ) : (
                                      <span className="font-mono tabular-nums">
                                        Parcela {parcela_atual}/{gasto.num_parcelas}
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                                    {gasto.recorrente ? "Valor:" : "Total:"} {formatCurrency(gasto.valor_total)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(valor_parcela)}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-2" data-tour="gastos-item-acoes">
                                  <button
                                    onClick={() => handleEditGasto(gasto)}
                                    className="p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(gasto.id)}
                                    className="p-1 rounded text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
