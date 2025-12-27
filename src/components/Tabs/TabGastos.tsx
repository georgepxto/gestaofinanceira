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
}: TabGastosProps) {
  return (
    <>
      {/* Navegação de Meses */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-gray-300" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-white capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-blue-400 hover:text-blue-300 mt-1"
            >
              Ir para hoje
            </button>
          </div>

          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card Total Geral */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-4 text-white shadow-sm">
          <p className="text-sm text-gray-300 mb-1">Total do Mês</p>
          <p className="text-2xl font-bold">{formatCurrency(totalMes)}</p>
          <p className="text-xs text-gray-400 mt-2">
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

          return (
            <div
              key={resumo.pessoa}
              className={`bg-gradient-to-br ${
                CORES_CARDS[index % CORES_CARDS.length]
              } rounded-xl p-3 sm:p-4 text-white shadow-sm overflow-hidden`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm text-white/80 mb-1 flex items-center gap-1">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{resumo.pessoa}</span>
                    {restante <= 0 && resumo.total > 0 && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-900/50 text-green-300 border border-green-700">
                        ✓ Quitado
                      </span>
                    )}
                  </p>
                  <p className="text-lg sm:text-xl font-bold">
                    {formatCurrency(resumo.total)}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    {resumo.quantidade} itens
                  </p>

                  {/* Pagamentos Parciais */}
                  {temPagamentos && (
                    <div className="mt-2 p-2 bg-green-900/40 rounded-lg border border-green-500/30 overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-green-300 font-medium">
                          Pago:
                        </span>
                        <button
                          onClick={() =>
                            handleDesfazerPagamentoParcial(resumo.pessoa)
                          }
                          className="p-0.5 hover:bg-green-800/50 rounded transition-colors flex-shrink-0"
                          title="Desfazer último"
                        >
                          <Undo2 className="w-3 h-3 text-green-300" />
                        </button>
                      </div>
                      {pagamentos.map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs gap-1"
                        >
                          <span className="text-green-200 truncate">
                            {p.data}
                          </span>
                          <span className="text-green-100 font-medium flex-shrink-0">
                            {formatCurrency(p.valor)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-green-500/30 mt-1 pt-1 flex justify-between">
                        <span className="text-xs text-yellow-300">Falta:</span>
                        <span className="text-xs text-yellow-200 font-bold flex-shrink-0">
                          {formatCurrency(restante)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Observação */}
                  {temObs && (
                    <div className="mt-2 p-2 bg-black/20 rounded-lg overflow-hidden">
                      <p className="text-xs text-white/90 break-words whitespace-pre-wrap line-clamp-3">
                        {temObs}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => handleAbrirObs(resumo.pessoa)}
                    className={`p-1.5 ${
                      temObs ? "bg-yellow-500/40" : "bg-white/20"
                    } hover:bg-white/30 rounded-lg transition-colors`}
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
                      setShowPagamentoParcial(resumo.pessoa);
                      setValorPagamentoParcial("");
                    }}
                    className={`p-1.5 ${
                      temPagamentos ? "bg-green-500/40" : "bg-white/20"
                    } hover:bg-white/30 rounded-lg transition-colors`}
                    title="Pagamento parcial"
                  >
                    <Banknote className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowFecharMes(resumo.pessoa);
                      setValorPagoFecharMes("");
                    }}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="Fechar mês"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
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
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white mb-4">
              Lançamentos do Mês
            </h3>

            {/* Filtros */}
            <div className="space-y-3">
              {/* Filtro por Pessoa */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Filtrar por pessoa:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFiltroPessoaGasto("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroPessoaGasto === ""
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {pessoa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por Tipo */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Filtrar por tipo:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFiltroTipoGasto("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroTipoGasto === ""
                        ? "bg-gray-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroTipoGasto("credito")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      filtroTipoGasto === "credito"
                        ? "bg-amber-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Crédito
                  </button>
                  <button
                    onClick={() => setFiltroTipoGasto("debito")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      filtroTipoGasto === "debito"
                        ? "bg-teal-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Débito
                  </button>
                </div>
              </div>

              {/* Filtro por Data */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Filtrar por dia:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filtroDiaGasto}
                    onChange={(e) => setFiltroDiaGasto(e.target.value)}
                    max={format(mesVisualizacao, "yyyy-MM") + "-31"}
                    min={format(mesVisualizacao, "yyyy-MM") + "-01"}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {filtroDiaGasto && (
                    <button
                      onClick={() => setFiltroDiaGasto("")}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {parcelasAtivas.filter(
            (p) =>
              (filtroPessoaGasto === "" ||
                p.gasto.pessoa === filtroPessoaGasto) &&
              (filtroTipoGasto === "" || p.gasto.tipo === filtroTipoGasto) &&
              (filtroDiaGasto === "" || p.gasto.data_inicio === filtroDiaGasto)
          ).length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
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
                const parcelasFiltradas = parcelasAtivas.filter(
                  (p) =>
                    (filtroPessoaGasto === "" ||
                      p.gasto.pessoa === filtroPessoaGasto) &&
                    (filtroTipoGasto === "" ||
                      p.gasto.tipo === filtroTipoGasto) &&
                    (filtroDiaGasto === "" ||
                      p.gasto.data_inicio === filtroDiaGasto)
                );

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
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">
                        Dia {dia}
                      </span>
                      <div className="flex-1 h-px bg-gray-700"></div>
                    </div>
                    {/* Lista de parcelas do dia */}
                    <ul className="divide-y divide-gray-700 rounded-lg overflow-hidden">
                      {parcelasPorDia[dia].map(
                        ({ gasto, parcela_atual, valor_parcela }) => (
                          <li
                            key={gasto.id}
                            className="p-4 hover:bg-gray-700/50 transition-colors bg-gray-800/50"
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
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {gasto.pessoa}
                                  </span>
                                </div>
                                <p className="font-medium text-white truncate">
                                  {gasto.descricao}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    Parcela {parcela_atual}/{gasto.num_parcelas}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Total: {formatCurrency(gasto.valor_total)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-white">
                                  {formatCurrency(valor_parcela)}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-2">
                                  <button
                                    onClick={() => handleEditGasto(gasto)}
                                    className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                    aria-label="Editar"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(gasto.id)}
                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
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
