import { useState } from "react";
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
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SuspensaoModal } from "../modals/SuspensaoModal";
import type { MeuGasto, CartaoCredito } from "../../types";
import { formatCurrency, formatMonthYear, getMesFaturaCartao } from "../../utils/calculations";

function getPessoasDivididas(gasto: MeuGasto): string[] {
  if (Array.isArray(gasto.dividido_com_pessoas) && gasto.dividido_com_pessoas.length > 0) {
    return gasto.dividido_com_pessoas;
  }

  if (!gasto.dividido_com) {
    return [];
  }

  const valor = gasto.dividido_com.trim();
  if (valor.startsWith("[")) {
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        return parsed.filter((pessoa): pessoa is string => typeof pessoa === "string" && pessoa.trim().length > 0);
      }
    } catch {
      // mantém fallback abaixo
    }
  }

  return [gasto.dividido_com];
}

function formatarDivididoCom(gasto: MeuGasto): string {
  return getPessoasDivididas(gasto).join(", ");
}

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
  handleReativarGastoFixo: (id: string, mesRef: Date) => void;
  handleSuspenderMultiplosMeses: (id: string, meses: string[], mesRef: Date) => Promise<void>;
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
  handleReativarGastoFixo,
  handleSuspenderMultiplosMeses,
  cartoes,
}: TabMeuGastoProps) {

  const [modalSuspensao, setModalSuspensao] = useState<{show: boolean, id: string, nome: string} | null>(null);

  const handleClickSuspender = (gasto: MeuGasto, isSuspenso: boolean) => {
    if (isSuspenso) {
      handleReativarGastoFixo(gasto.id, mesVisualizacao);
    } else {
      setModalSuspensao({ show: true, id: gasto.id, nome: gasto.descricao });
    }
  };

  const getMesReativacao = (gasto: MeuGasto) => {
    if (!gasto.meses_suspensos || gasto.meses_suspensos.length === 0) return null;
    const mesStr = format(mesVisualizacao, "yyyy-MM");
    if (!gasto.meses_suspensos.includes(mesStr)) return null;

    let checkDate = mesVisualizacao;
    while (gasto.meses_suspensos.includes(format(checkDate, "yyyy-MM"))) {
      checkDate = addMonths(checkDate, 1);
    }
    return format(checkDate, "MM/yyyy");
  };

  return (
    <>
      {/* Navegação de Meses */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-4 border border-zinc-200 dark:border-zinc-800" data-tour="eu-navegacao-mes">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-zinc-50 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
          </button>

          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-zinc-800 dark:text-zinc-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400 mt-1"
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

      {/* Faixa de Resumo — auto-fit com piso de 200px (maior que a tinta do
          maior valor em 24px mono, então nada vaza na coluna vizinha) e sem
          divisória filha, que quebraria o auto-fit. Valor em R$ nunca trunca. */}
      <div
        className="grid gap-x-8 gap-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
        data-tour="eu-resumo-cards"
      >
        <div className="min-w-0" data-tour="eu-card-credito">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-1">
            Crédito
          </p>
          <p className="font-mono tabular-nums text-lg sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalMeusGastosCredito)}
          </p>
        </div>
        <div className="min-w-0" data-tour="eu-card-debito">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-1">
            Débito
          </p>
          <p className="font-mono tabular-nums text-lg sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalMeusGastosDebito)}
          </p>
        </div>
        <div className="min-w-0" data-tour="eu-card-pagos">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-1">
            Pago
          </p>
          <p className="font-mono tabular-nums text-lg sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalMeusGastosPagos)}
          </p>
        </div>
        <div className="min-w-0" data-tour="eu-card-fixos">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-1">
            Fixos
          </p>
          <p className="font-mono tabular-nums text-lg sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalGastosFixos)}
          </p>
        </div>
      </div>

      {/* Filtro de Categoria */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800" data-tour="eu-filtro-categoria">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Filtrar por:</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroCategoriaMeuGasto("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroCategoriaMeuGasto === ""
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("pessoal")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "pessoal"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
            }`}
          >
            <User className="w-3 h-3" /> Pessoal
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("dividido")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "dividido"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
            }`}
          >
            <Users className="w-3 h-3" /> Dividido
          </button>
          <button
            onClick={() => setFiltroCategoriaMeuGasto("divida")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroCategoriaMeuGasto === "divida"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]"
            }`}
          >
            <Receipt className="w-3 h-3" /> Dívida
          </button>
        </div>

        {/* Filtro por Data */}
        <div className="mt-3" data-tour="eu-filtro-dia">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Filtrar por dia:</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={filtroDiaMeuGasto}
                onChange={(e) => setFiltroDiaMeuGasto(e.target.value)}
                max={format(mesVisualizacao, "yyyy-MM") + "-31"}
                min={format(mesVisualizacao, "yyyy-MM") + "-01"}
                className="w-full px-3 py-1.5 pl-10 rounded-lg text-sm font-mono tabular-nums bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none dark:[color-scheme:dark]"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 pointer-events-none" />
            </div>
            {filtroDiaMeuGasto && (
              <button
                onClick={() => setFiltroDiaMeuGasto("")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08] transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gastos Fixos */}
      {gastosFixos.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800" data-tour="eu-gastos-fixos">
          <h3 className="font-display text-zinc-800 dark:text-zinc-100 font-semibold mb-3 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            Gastos Fixos Mensais
          </h3>
          <div className="space-y-2">
            {[...gastosFixos]
              .sort((a, b) => (b.dia_vencimento || 0) - (a.dia_vencimento || 0))
              .map((gasto) => {
                const isSuspenso = gasto.meses_suspensos?.includes(format(mesVisualizacao, "yyyy-MM"));
                
                return (
                // Atenuar é um recurso só (o texto do item já usa zinc-500 +
                // line-through); empilhar `opacity`/`grayscale` por cima
                // derrubaria o contraste abaixo do legível.
                <div
                  key={gasto.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isSuspenso || gasto.ativo === false
                      ? "bg-zinc-100 dark:bg-white/[0.03] border-zinc-200 dark:border-white/[0.09]"
                      : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.09]"
                  }`}
                >
                  {/* Ícone */}
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    gasto.tipo === "credito"
                      ? "bg-zinc-100 dark:bg-white/[0.07]"
                      : "bg-emerald-100 dark:bg-emerald-500/20"
                  }`}>
                    {gasto.tipo === "credito" ? (
                      <CreditCard className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    ) : (
                      <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>

                  {/* Nome + info */}
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm truncate ${
                      isSuspenso || gasto.ativo === false
                        ? "text-zinc-500 dark:text-zinc-400 line-through"
                        : "text-zinc-800 dark:text-zinc-100"
                    }`}>
                      {gasto.descricao}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Dia {gasto.dia_vencimento}
                      </span>
                      {gasto.dividido_com && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.09] font-medium">
                          c/ {formatarDivididoCom(gasto)}
                        </span>
                      )}
                      {isSuspenso && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium inline-flex items-center gap-1">
                          <PauseCircle className="w-3 h-3" /> Pausado
                        </span>
                      )}
                      {gasto.ativo === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-500 dark:bg-white/[0.07] dark:text-zinc-400 font-medium">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor + ações */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-mono tabular-nums text-zinc-800 dark:text-zinc-100 font-bold text-sm whitespace-nowrap">
                      {formatCurrency(gasto.valor)}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleClickSuspender(gasto, !!isSuspenso)}
                        className={`p-1.5 rounded-lg text-zinc-400 transition-colors ${
                          isSuspenso
                            ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                            : "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                        }`}
                        title={isSuspenso ? "Reativar neste mês" : "Suspender neste mês"}
                      >
                        {isSuspenso ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleEditMeuGasto(gasto)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/[0.08] dark:hover:text-zinc-300 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleGastoFixo(gasto.id)}
                        className={`p-1.5 rounded-lg text-zinc-400 transition-colors ${
                          gasto.ativo !== false
                            ? "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                            : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
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
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </div>
      )}

      {/* Lista de Meus Gastos do Mês */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800" data-tour="eu-lista-gastos">
        <h3 className="font-display text-zinc-800 dark:text-zinc-100 font-semibold mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
          Meus Gastos do Mês ({meusGastosDoMes.length})
        </h3>

        {meusGastosDoMes.filter(
          (g) =>
            (filtroCategoriaMeuGasto === "" ||
              g.categoria === filtroCategoriaMeuGasto) &&
            (filtroDiaMeuGasto === "" || g.data === filtroDiaMeuGasto)
        ).length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">
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
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                      Dia {dia}
                    </span>
                    <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.04]"></div>
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
                          // Atenuação vem do texto (zinc-500 + line-through), não
                          // de `opacity`/`grayscale` — empilhar as duas some com o texto.
                          className={`p-4 rounded-xl border transition-colors ${
                            isSuspenso
                              ? "bg-zinc-100 dark:bg-white/[0.03] border-zinc-200 dark:border-white/[0.09]"
                              : gasto.pago
                              ? "bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-zinc-800"
                              : gasto.categoria === "divida"
                              ? "bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-zinc-800"
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
                                    : gasto.categoria === "divida"
                                    ? "bg-amber-100/60 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-200/60 dark:hover:bg-amber-900/60"
                                    : "bg-zinc-100 dark:bg-white/[0.07] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.12]"
                                }`}
                              >
                                {gasto.pago ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <div className={`w-5 h-5 border-2 rounded-full ${gasto.categoria === "divida" ? "border-amber-400" : "border-zinc-300 dark:border-zinc-500"}`} />
                                )}
                              </button>
                              <div>
                                <p
                                  className={`font-medium ${
                                    gasto.pago || isSuspenso
                                      ? "text-zinc-500 dark:text-zinc-400 line-through"
                                      : "text-zinc-800 dark:text-zinc-100"
                                  }`}
                                >
                                  {gasto.descricao}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span
                                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400"
                                  >
                                    {gasto.tipo === "credito"
                                      ? (nomeFatura ? `Crédito (Fatura de ${nomeFatura})` : "Crédito")
                                      : "Débito"}
                                  </span>
                                  {isSuspenso && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 flex items-center gap-1 font-semibold border border-amber-200 dark:border-amber-500/30">
                                      <PauseCircle className="w-3 h-3" /> Pausado (Volta em {getMesReativacao(gasto)})
                                    </span>
                                  )}
                                  {!!gasto.dividido_com && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.09] flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {formatarDivididoCom(gasto)}
                                    </span>
                                  )}
                                  {gasto.categoria === "divida" && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                      <Receipt className="w-3 h-3" /> Dívida
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-mono tabular-nums font-bold ${
                                  gasto.pago
                                    ? "text-zinc-400 line-through"
                                    : "text-zinc-800 dark:text-zinc-100"
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
                                <p className="font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                                  Total: {formatCurrency(gasto.valor)}
                                </p>
                              )}
                            <div className="flex items-center justify-end gap-1 mt-2" data-tour="eu-item-acoes">
                              {gasto.categoria === "fixo" && (
                                <button
                                    onClick={() => handleClickSuspender(gasto, !!isSuspenso)}
                                  className={`p-1.5 rounded-lg text-zinc-400 transition-colors ${
                                    isSuspenso
                                      ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                                      : "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                                  }`}
                                  title={isSuspenso ? "Reativar neste mês" : "Suspender neste mês"}
                                >
                                  {isSuspenso ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleEditMeuGasto(gasto)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/[0.08] dark:hover:text-zinc-300 transition-colors"
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMeuGasto(gasto.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
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

      {modalSuspensao && (
        <SuspensaoModal
          show={modalSuspensao.show}
          onClose={() => setModalSuspensao(null)}
          onConfirm={async (meses) => {
            await handleSuspenderMultiplosMeses(modalSuspensao.id, meses, mesVisualizacao);
          }}
          mesRef={mesVisualizacao}
          nomeGasto={modalSuspensao.nome}
        />
      )}
    </>
  );
}
