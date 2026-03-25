import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wallet,
  CheckCircle,
  Repeat,
  User,
  Users,
  Receipt,
  DollarSign,
  Calendar,
  Edit3,
  Trash2,
  MinusCircle,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MeuGasto, CartaoCredito } from "../../types";
import { formatCurrency, formatMonthYear, getMesFaturaCartao } from "../../utils/calculations";

interface TabMeuGastoProps {
  mesVisualizacao: Date;
  navegarMes: (direcao: "anterior" | "proximo") => void;
  irParaHoje: () => void;
  totalMeusGastosCredito: number;
  totalMeusGastosDebito: number;
  totalMeusGastosPagos: number;
  totalGastosFixos: number;
  filtroCategoriaMeuGasto: string;
  setFiltroCategoriaMeuGasto: (categoria: string) => void;
  filtroDiaMeuGasto: string;
  setFiltroDiaMeuGasto: (dia: string) => void;
  gastosFixos: MeuGasto[];
  meusGastosDoMes: MeuGasto[];
  handleEditMeuGasto: (gasto: MeuGasto) => void;
  handleToggleGastoFixo: (id: string) => void;
  handleDeleteMeuGasto: (id: string) => void;
  handleTogglePagoMeuGasto: (id: string) => void;
  handleToggleSuspenderGastoFixo: (id: string, mesRef: Date) => void;
  cartoes: CartaoCredito[];
}

export function TabMeuGasto({
  mesVisualizacao,
  navegarMes,
  irParaHoje,
  totalMeusGastosCredito,
  totalMeusGastosDebito,
  totalMeusGastosPagos,
  totalGastosFixos,
  filtroCategoriaMeuGasto,
  setFiltroCategoriaMeuGasto,
  filtroDiaMeuGasto,
  setFiltroDiaMeuGasto,
  gastosFixos,
  meusGastosDoMes,
  handleEditMeuGasto,
  handleToggleGastoFixo,
  handleDeleteMeuGasto,
  handleTogglePagoMeuGasto,
  handleToggleSuspenderGastoFixo,
  cartoes,
}: TabMeuGastoProps) {

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-xs text-emerald-400 hover:text-emerald-300 mt-1"
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-purple-500" /> Crédito
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalMeusGastosCredito)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Wallet className="w-3 h-3 text-green-500" /> Débito
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalMeusGastosDebito)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> Pago
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalMeusGastosPagos)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Repeat className="w-3 h-3 text-amber-500" /> Fixos
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalGastosFixos)}
          </p>
        </div>
      </div>

      {/* Filtro de Categoria */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Filtrar por:</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroCategoriaMeuGasto("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroCategoriaMeuGasto === ""
                ? "bg-emerald-600 text-white"
                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("pessoal")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "pessoal"
                ? "bg-blue-600 text-white"
                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
            }`}
          >
            <User className="w-3 h-3" /> Pessoal
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("dividido")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "dividido"
                ? "bg-pink-600 text-white"
                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
            }`}
          >
            <Users className="w-3 h-3" /> Dividido
          </button>
        </div>

        {/* Filtro por Data */}
        <div className="mt-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Filtrar por dia:</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={filtroDiaMeuGasto}
                onChange={(e) => setFiltroDiaMeuGasto(e.target.value)}
                max={format(mesVisualizacao, "yyyy-MM") + "-31"}
                min={format(mesVisualizacao, "yyyy-MM") + "-01"}
                className="w-full px-3 py-1.5 pl-10 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none [color-scheme:dark]"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
            </div>
            {filtroDiaMeuGasto && (
              <button
                onClick={() => setFiltroDiaMeuGasto("")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gastos Fixos */}
      {gastosFixos.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-3 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-amber-600" />
            Gastos Fixos Mensais
          </h3>
          <div className="space-y-2">
            {[...gastosFixos]
              .sort((a, b) => (b.dia_vencimento || 0) - (a.dia_vencimento || 0))
              .map((gasto) => {
                const isSuspenso = gasto.meses_suspensos?.includes(format(mesVisualizacao, "yyyy-MM"));
                
                return (
                <div
                  key={gasto.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isSuspenso
                      ? "bg-gray-200/50 dark:bg-gray-800/50 opacity-60 grayscale-[0.8]"
                      : gasto.ativo !== false
                      ? "bg-gray-50 dark:bg-gray-800"
                      : "bg-gray-100 dark:bg-gray-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        gasto.tipo === "credito"
                          ? "bg-purple-100 dark:bg-purple-500/20"
                          : "bg-emerald-100 dark:bg-emerald-500/20"
                      }`}
                    >
                      {gasto.tipo === "credito" ? (
                        <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium flex items-center gap-2 flex-wrap">
                        {gasto.descricao}
                        {gasto.dividido_com && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            Dividido com {gasto.dividido_com}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Todo dia {gasto.dia_vencimento}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">
                      {formatCurrency(gasto.valor)}
                    </p>
                    <button
                      onClick={() => handleToggleSuspenderGastoFixo(gasto.id, mesVisualizacao)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSuspenso
                          ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                          : "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30"
                      }`}
                      title={isSuspenso ? "Reativar neste mês" : "Suspender neste mês"}
                    >
                      {isSuspenso ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEditMeuGasto(gasto)}
                      className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-500/30 dark:hover:bg-blue-500/30 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleGastoFixo(gasto.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        gasto.ativo !== false
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-green-500/30 dark:hover:bg-green-500/30"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                      }`}
                      title={gasto.ativo !== false ? "Desativar" : "Ativar"}
                    >
                      {gasto.ativo !== false ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <MinusCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteMeuGasto(gasto.id)}
                      className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/30 dark:hover:bg-red-500/30 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )})}
          </div>
        </div>
      )}

      {/* Lista de Meus Gastos do Mês */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
        <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-400" />
          Meus Gastos do Mês ({meusGastosDoMes.length})
        </h3>

        {meusGastosDoMes.filter(
          (g) =>
            (filtroCategoriaMeuGasto === "" ||
              g.categoria === filtroCategoriaMeuGasto) &&
            (filtroDiaMeuGasto === "" || g.data === filtroDiaMeuGasto)
        ).length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto text-gray-600 dark:text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum gasto registrado
              {filtroCategoriaMeuGasto ? ` (${filtroCategoriaMeuGasto})` : ""}
              {filtroDiaMeuGasto
                ? ` no dia ${filtroDiaMeuGasto.substring(8, 10)}`
                : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              // Filtrar gastos
              const gastosFiltrados = meusGastosDoMes.filter(
                (g) =>
                  (filtroCategoriaMeuGasto === "" ||
                    g.categoria === filtroCategoriaMeuGasto) &&
                  (filtroDiaMeuGasto === "" || g.data === filtroDiaMeuGasto)
              );

              // Agrupar gastos por dia
              const gastosPorDia: Record<string, typeof gastosFiltrados> = {};
              gastosFiltrados.forEach((gasto) => {
                const dia = gasto.data.substring(8, 10);
                if (!gastosPorDia[dia]) {
                  gastosPorDia[dia] = [];
                }
                gastosPorDia[dia].push(gasto);
              });

              // Ordenar dias (mais recentes primeiro)
              const diasOrdenados = Object.keys(gastosPorDia).sort((a, b) =>
                b.localeCompare(a)
              );

              return diasOrdenados.map((dia) => (
                <div key={dia}>
                  {/* Cabeçalho do dia */}
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">
                      Dia {dia}
                    </span>
                    <div className="flex-1 h-px bg-gray-50 dark:bg-gray-800"></div>
                  </div>
                  {/* Lista de gastos do dia */}
                  <ul className="space-y-3">
                    {gastosPorDia[dia].map((gasto) => {
                      let nomeFatura = "";
                      if (gasto.tipo === "credito" && gasto.cartao_id) {
                        const cartao = cartoes?.find((c) => c.id === gasto.cartao_id);
                        if (cartao && cartao.melhor_dia_compra) {
                          const dataFatura = getMesFaturaCartao(gasto.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
                          nomeFatura = format(dataFatura, "MMMM", { locale: ptBR });
                          nomeFatura = nomeFatura.charAt(0).toUpperCase() + nomeFatura.slice(1);
                        } else {
                          const [ano, mes, diaComp] = gasto.data.split("-").map(Number);
                          const dataFatura = new Date(ano, mes - 1, diaComp);
                          nomeFatura = format(dataFatura, "MMMM", { locale: ptBR });
                          nomeFatura = nomeFatura.charAt(0).toUpperCase() + nomeFatura.slice(1);
                        }
                      }

                      const isSuspenso = gasto.categoria === "fixo" && gasto.meses_suspensos?.includes(format(mesVisualizacao, "yyyy-MM"));

                      return (
                        <li
                          key={gasto.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isSuspenso
                              ? "bg-gray-200/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-60 grayscale-[0.8]"
                              : gasto.pago
                              ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 opacity-70"
                              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {/* Checkbox para todos (crédito e débito) */}
                              <button
                                onClick={() =>
                                  handleTogglePagoMeuGasto(gasto.id)
                                }
                                className={`mt-1 p-2 rounded-lg transition-colors ${
                                  gasto.pago
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700"
                                }`}
                              >
                                {gasto.pago ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                                )}
                              </button>
                              <div>
                                <p
                                  className={`font-medium ${
                                    gasto.pago
                                      ? "text-gray-500 dark:text-gray-400"
                                      : "text-gray-900 dark:text-gray-100"
                                  }`}
                                >
                                  {gasto.descricao}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      gasto.tipo === "credito"
                                        ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    }`}
                                  >
                                    {gasto.tipo === "credito"
                                      ? (nomeFatura ? `Crédito (Fatura de ${nomeFatura})` : "Crédito")
                                      : "Débito"}
                                  </span>
                                  {isSuspenso && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 flex items-center gap-1 font-semibold border border-amber-200 dark:border-amber-500/30">
                                      {/* @ts-ignore */}
                                      <PauseCircle className="w-3 h-3" /> Suspenso em {format(mesVisualizacao, "MMM", { locale: ptBR })}
                                    </span>
                                  )}
                                  {!!gasto.dividido_com && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {gasto.dividido_com}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold ${
                                  gasto.pago
                                    ? "text-gray-500 dark:text-gray-400"
                                    : "text-gray-900 dark:text-gray-100"
                                }`}
                              >
                              {formatCurrency(
                                !!gasto.dividido_com &&
                                  gasto.minha_parte
                                  ? gasto.minha_parte
                                  : gasto.valor
                              )}
                            </p>
                            {!!gasto.dividido_com &&
                              gasto.minha_parte && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Total: {formatCurrency(gasto.valor)}
                                </p>
                              )}
                            <div className="flex items-center justify-end gap-1 mt-2">
                              {gasto.categoria === "fixo" && (
                                <button
                                  onClick={() => handleToggleSuspenderGastoFixo(gasto.id, mesVisualizacao)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isSuspenso 
                                      ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30" 
                                      : "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30"
                                  }`}
                                  title={isSuspenso ? "Reativar neste mês" : "Suspender neste mês"}
                                >
                                  {isSuspenso ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleEditMeuGasto(gasto)}
                                className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-500/30 dark:hover:bg-blue-500/30 transition-colors"
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMeuGasto(gasto.id)}
                                className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/30 dark:hover:bg-red-500/30 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </>
  );
}
