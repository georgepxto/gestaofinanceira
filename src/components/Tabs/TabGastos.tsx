import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  User,
  Hash,
  Edit3,
  Trash2,
  CreditCard,
  Banknote,
  Loader2,
  Undo2,
  MessageSquare,
  CheckCircle,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import type { ParcelaAtiva, ResumoMensal } from "../../types";
import type { PagamentoParcial } from "../../types/extended";
import { formatCurrency, formatMonthYear } from "../../utils/calculations";
import { CORES_CARDS } from "../../utils/constants";

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
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-blue-600 hover:text-blue-300 mt-1"
            >
              Ir para hoje
            </button>
          </div>

          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card Total Geral */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-blue-600 mb-1">Total do Mês</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalMes)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {parcelasAtivas.length} lançamentos
          </p>
        </div>

        {/* Cards por Pessoa */}
        {resumoMensal.map((resumo, index) => {
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
              className={`bg-white dark:bg-gray-900 border-l-4 ${CORES_CARDS[index % CORES_CARDS.length]} rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{resumo.pessoa}</span>
                    {estaFechado && mesFechadoData && mesFechadoData.valorDevedor > 0 && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                        ◉ Fechado
                      </span>
                    )}
                    {(estaQuitado || (estaFechado && mesFechadoData && mesFechadoData.valorDevedor === 0)) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                        ✓ Quitado
                      </span>
                    )}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(resumo.total)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {resumo.quantidade} itens
                  </p>

                  {/* Pagamentos Parciais */}
                  {temPagamentos && (
                    <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200 overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-emerald-600 font-medium">
                          Pago:
                        </span>
                        <button
                          onClick={() =>
                            handleDesfazerPagamentoParcial(resumo.pessoa)
                          }
                          className="p-0.5 hover:bg-emerald-100 rounded transition-colors flex-shrink-0"
                          title="Desfazer último"
                        >
                          <Undo2 className="w-3 h-3 text-emerald-600" />
                        </button>
                      </div>
                      {pagamentos.map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs gap-1"
                        >
                          <span className="text-emerald-600 truncate">
                            {p.data}
                          </span>
                          <span className="text-emerald-700 font-medium flex-shrink-0">
                            {formatCurrency(p.valor)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-emerald-200 mt-1 pt-1 flex justify-between">
                        {estaQuitado ? (
                          <>
                            <span className="text-xs text-emerald-600">✓ Quitado</span>
                            <span className="text-xs text-emerald-700 font-bold flex-shrink-0">
                              {formatCurrency(totalPago)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-amber-600">Falta:</span>
                            <span className="text-xs text-amber-700 font-bold flex-shrink-0">
                              {formatCurrency(restante)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observação */}
                  {temObs && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <p className="text-xs text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap line-clamp-3">
                        {temObs}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => handleAbrirObs(resumo.pessoa)}
                    className={`p-1.5 ${temObs ? "bg-amber-100" : "bg-gray-100 dark:bg-gray-800"} hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors`}
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
                        ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                        : temPagamentos
                        ? "bg-emerald-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                    } rounded-lg transition-colors`}
                    title={estaFechado ? "Mês fechado" : estaQuitado ? "Já quitado" : "Pagamento parcial"}
                  >
                    <Banknote className="w-4 h-4" />
                  </button>
                  {estaFechado ? (
                    <button
                      onClick={() => handleDesfazerFechamento(resumo.pessoa)}
                      className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
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
                          ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Lista de Lançamentos */}
      {!loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Lançamentos do Mês
            </h3>

            {/* Filtros */}
            <div className="space-y-3">
              {/* Filtro por Pessoa */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Filtrar por pessoa:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFiltroPessoaGasto("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroPessoaGasto === ""
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
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
                          ? "bg-blue-600 text-white"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pessoa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por Tipo */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Filtrar por tipo:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFiltroTipoGasto("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroTipoGasto === ""
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroTipoGasto("credito")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      filtroTipoGasto === "credito"
                        ? "bg-amber-600 text-gray-900 dark:text-gray-100"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Crédito
                  </button>
                  <button
                    onClick={() => setFiltroTipoGasto("debito")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      filtroTipoGasto === "debito"
                        ? "bg-teal-600 text-gray-900 dark:text-gray-100"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Débito
                  </button>
                </div>
              </div>

              {/* Filtro por Data */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
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
                      className="w-full px-3 py-1.5 pl-10 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                  </div>
                  {filtroDiaGasto && (
                    <button
                      onClick={() => setFiltroDiaGasto("")}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {parcelasAtivas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-blue-600" />
              <p>
                Nenhum lançamento{" "}
                {filtroPessoaGasto ? `de ${filtroPessoaGasto} ` : ""}
                {filtroTipoGasto
                  ? `(${filtroTipoGasto === "credito" ? "crédito" : "débito"}) `
                  : ""}
                {filtroDiaGasto
                  ? `no dia ${filtroDiaGasto.substring(8, 10)} `
                  : ""}
                para este mês
              </p>
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
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-600">
                        Dia {dia}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    {/* Lista de parcelas do dia */}
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl overflow-hidden">
                      {parcelasPorDia[dia].map(
                        ({ gasto, parcela_atual, valor_parcela }) => (
                          <li
                            key={gasto.id}
                            className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-gray-50 dark:bg-gray-800"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                      gasto.tipo === "credito"
                                        ? "bg-purple-100 text-purple-800 border-purple-200"
                                        : "bg-green-100 text-green-800 border-green-200"
                                    }`}
                                  >
                                    {gasto.tipo === "credito" ? (
                                      <CreditCard className="w-4 h-4" />
                                    ) : (
                                      <Banknote className="w-4 h-4" />
                                    )}
                                    {gasto.tipo === "credito"
                                      ? "Crédito"
                                      : "Débito"}
                                  </span>
                                  {gasto.recorrente && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200">
                                      <Repeat className="w-3 h-3" />
                                      Fixo
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {gasto.pessoa}
                                  </span>
                                </div>
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {gasto.descricao}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {gasto.recorrente ? (
                                      <span className="text-teal-400">Mensal</span>
                                    ) : (
                                      <>Parcela {parcela_atual}/{gasto.num_parcelas}</>
                                    )}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {gasto.recorrente ? "Valor:" : "Total:"} {formatCurrency(gasto.valor_total)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(valor_parcela)}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-2">
                                  <button
                                    onClick={() => handleEditGasto(gasto)}
                                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(gasto.id)}
                                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors"
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
