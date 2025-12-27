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
} from "lucide-react";
import { format } from "date-fns";
import type { MeuGasto } from "../../types";
import { formatCurrency, formatMonthYear } from "../../utils/calculations";

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
}: TabMeuGastoProps) {
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
            <h2 className="text-xl font-bold text-white capitalize">
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
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white shadow-lg">
          <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Crédito
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(totalMeusGastosCredito)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white shadow-lg">
          <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Débito
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(totalMeusGastosDebito)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white shadow-lg">
          <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Pago
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(totalMeusGastosPagos)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white shadow-lg">
          <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
            <Repeat className="w-3 h-3" /> Fixos
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(totalGastosFixos)}
          </p>
        </div>
      </div>

      {/* Filtro de Categoria */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <p className="text-sm text-gray-400 mb-2">Filtrar por:</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroCategoriaMeuGasto("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroCategoriaMeuGasto === ""
                ? "bg-emerald-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("pessoal")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "pessoal"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <User className="w-3 h-3" /> Pessoal
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("dividido")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "dividido"
                ? "bg-pink-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Users className="w-3 h-3" /> Dividido
          </button>
        </div>

        {/* Filtro por Data */}
        <div className="mt-3">
          <p className="text-sm text-gray-400 mb-2">Filtrar por dia:</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filtroDiaMeuGasto}
              onChange={(e) => setFiltroDiaMeuGasto(e.target.value)}
              max={format(mesVisualizacao, "yyyy-MM") + "-31"}
              min={format(mesVisualizacao, "yyyy-MM") + "-01"}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            {filtroDiaMeuGasto && (
              <button
                onClick={() => setFiltroDiaMeuGasto("")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-500 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gastos Fixos */}
      {gastosFixos.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-amber-400" />
            Gastos Fixos Mensais
          </h3>
          <div className="space-y-2">
            {[...gastosFixos]
              .sort((a, b) => (b.dia_vencimento || 0) - (a.dia_vencimento || 0))
              .map((gasto) => (
                <div
                  key={gasto.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    gasto.ativo !== false
                      ? "bg-gray-700"
                      : "bg-gray-700/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        gasto.tipo === "credito"
                          ? "bg-purple-500/20"
                          : "bg-green-500/20"
                      }`}
                    >
                      {gasto.tipo === "credito" ? (
                        <CreditCard className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Wallet className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {gasto.descricao}
                      </p>
                      <p className="text-xs text-gray-400">
                        Todo dia {gasto.dia_vencimento}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">
                      {formatCurrency(gasto.valor)}
                    </p>
                    <button
                      onClick={() => handleEditMeuGasto(gasto)}
                      className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleGastoFixo(gasto.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        gasto.ativo !== false
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-gray-600 text-gray-400 hover:bg-gray-500"
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
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Lista de Meus Gastos do Mês */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
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
            <DollarSign className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">
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
                    <div className="flex-1 h-px bg-gray-700"></div>
                  </div>
                  {/* Lista de gastos do dia */}
                  <ul className="space-y-3">
                    {gastosPorDia[dia].map((gasto) => (
                      <li
                        key={gasto.id}
                        className={`p-4 rounded-xl border transition-all ${
                          gasto.pago || gasto.tipo === "debito"
                            ? "bg-gray-700/50 border-gray-600 opacity-70"
                            : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {/* Só mostra checkbox para crédito */}
                            {gasto.tipo === "credito" ? (
                              <button
                                onClick={() =>
                                  handleTogglePagoMeuGasto(gasto.id)
                                }
                                className={`mt-1 p-2 rounded-lg transition-colors ${
                                  gasto.pago
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-gray-600 text-gray-400 hover:bg-gray-500"
                                }`}
                              >
                                {gasto.pago ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                                )}
                              </button>
                            ) : (
                              <div className="mt-1 p-2 rounded-lg bg-green-500/20 text-green-400">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  gasto.pago || gasto.tipo === "debito"
                                    ? "text-gray-400"
                                    : "text-white"
                                }`}
                              >
                                {gasto.descricao}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    gasto.tipo === "credito"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-green-500/20 text-green-400"
                                  }`}
                                >
                                  {gasto.tipo === "credito"
                                    ? "Crédito"
                                    : "Débito"}
                                </span>
                                {gasto.categoria === "dividido" && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 flex items-center gap-1">
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
                                gasto.pago || gasto.tipo === "debito"
                                  ? "text-gray-400"
                                  : "text-white"
                              }`}
                            >
                              {formatCurrency(
                                gasto.categoria === "dividido" &&
                                  gasto.minha_parte
                                  ? gasto.minha_parte
                                  : gasto.valor
                              )}
                            </p>
                            {gasto.categoria === "dividido" &&
                              gasto.minha_parte && (
                                <p className="text-xs text-gray-500">
                                  Total: {formatCurrency(gasto.valor)}
                                </p>
                              )}
                            <div className="flex items-center justify-end gap-1 mt-2">
                              <button
                                onClick={() => handleEditMeuGasto(gasto)}
                                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMeuGasto(gasto.id)}
                                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
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
