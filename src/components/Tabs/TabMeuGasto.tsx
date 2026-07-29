import { useState } from "react";
import {
  Check,
  CheckCircle,
  Repeat,
  Users,
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
import { formatCurrency, getMesFaturaCartao } from "../../utils/calculations";
import { Rotulo } from "../ui/Rotulo";
import { Card } from "../ui/Card";

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

/** CHIP do filtro — ativo esmeralda cheio, inativo neutro. */
const chipClasse = (ativo: boolean) =>
  `px-3.5 py-2 rounded-xl text-[13px] transition-colors ${
    ativo
      ? "bg-emerald-600 text-white font-semibold"
      : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
  }`;

/** GHOST de ação de item. */
const ghostClasse = (tom: "neutro" | "excluir" | "pausar" | "reativar") => {
  const hover =
    tom === "excluir"
      ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      : tom === "pausar"
      ? "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
      : tom === "reativar"
      ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
      : "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100";
  return `w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-colors ${hover}`;
};

const BADGE_NEUTRA = "font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400";
const BADGE_AMBAR = "font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

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

  const gastosFixosAtivos = gastosFixos.filter((g) => g.ativo !== false).length;

  const gastosFiltrados = meusGastosDoMes.filter(
    (g) =>
      (filtroCategoriaMeuGasto === "" || g.categoria === filtroCategoriaMeuGasto) &&
      (filtroDiaMeuGasto === "" || g.data === filtroDiaMeuGasto)
  );

  return (
    <>
      {/* FAIXA_RESUMO — auto-fit com piso de 200px; sem divisória filha
          (quebraria o auto-fit). Valor em R$ nunca trunca. */}
      <Card
        padding="resumo"
        className="grid gap-x-7 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
        data-tour="eu-resumo-cards"
      >
        <div className="min-w-0" data-tour="eu-card-credito">
          <Rotulo className="mb-1">
            Crédito
          </Rotulo>
          <p className="font-mono valor text-[22px] font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalMeusGastosCredito)}
          </p>
        </div>
        <div className="min-w-0" data-tour="eu-card-debito">
          <Rotulo className="mb-1">
            Débito
          </Rotulo>
          <p className="font-mono valor text-[22px] font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalMeusGastosDebito)}
          </p>
        </div>
        <div className="min-w-0" data-tour="eu-card-pagos">
          <Rotulo tom="acento" className="mb-1">
            Pago
          </Rotulo>
          <p className="font-mono valor text-[22px] font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalMeusGastosPagos)}
          </p>
        </div>
        <div className="min-w-0" data-tour="eu-card-fixos">
          <Rotulo className="mb-1">
            Fixos
          </Rotulo>
          <p className="font-mono valor text-[22px] font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalGastosFixos)}
          </p>
        </div>
      </Card>

      {/* Grid principal: filtros + fixos à esquerda, lançamentos à direita */}
      <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(0,0.92fr)_minmax(0,1.08fr)] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Card Filtros */}
          <Card data-tour="eu-filtro-categoria">
            <Rotulo className="mb-2.5">
              Filtrar por tipo
            </Rotulo>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFiltroCategoriaMeuGasto("")} className={chipClasse(filtroCategoriaMeuGasto === "")}>
                Todos
              </button>
              <button onClick={() => setFiltroCategoriaMeuGasto("pessoal")} className={chipClasse(filtroCategoriaMeuGasto === "pessoal")}>
                Pessoal
              </button>
              <button onClick={() => setFiltroCategoriaMeuGasto("dividido")} className={chipClasse(filtroCategoriaMeuGasto === "dividido")}>
                Dividido
              </button>
              <button onClick={() => setFiltroCategoriaMeuGasto("divida")} className={chipClasse(filtroCategoriaMeuGasto === "divida")}>
                Dívida
              </button>
              <button onClick={() => setFiltroCategoriaMeuGasto("fixo")} className={chipClasse(filtroCategoriaMeuGasto === "fixo")}>
                Fixo
              </button>
            </div>

            <div className="mt-4" data-tour="eu-filtro-dia">
              <Rotulo className="mb-2.5">
                Filtrar por dia
              </Rotulo>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={filtroDiaMeuGasto}
                    onChange={(e) => setFiltroDiaMeuGasto(e.target.value)}
                    max={format(mesVisualizacao, "yyyy-MM") + "-31"}
                    min={format(mesVisualizacao, "yyyy-MM") + "-01"}
                    className="w-full h-11 px-3.5 pl-10 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono tabular-nums text-zinc-800 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06] dark:[color-scheme:dark]"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 pointer-events-none" />
                </div>
                {filtroDiaMeuGasto && (
                  <button onClick={() => setFiltroDiaMeuGasto("")} className={chipClasse(false)}>
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Card Gastos fixos */}
          {gastosFixos.length > 0 && (
            <Card data-tour="eu-gastos-fixos">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Gastos fixos</h2>
                <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400">
                  {gastosFixosAtivos} {gastosFixosAtivos === 1 ? "ativo" : "ativos"}
                </span>
              </div>
              <div className="space-y-2.5">
                {[...gastosFixos]
                  .sort((a, b) => (b.dia_vencimento || 0) - (a.dia_vencimento || 0))
                  .map((gasto) => {
                    const isSuspenso = gasto.meses_suspensos?.includes(format(mesVisualizacao, "yyyy-MM"));
                    const atenuado = isSuspenso || gasto.ativo === false;

                    return (
                      // Atenuar é um recurso só (zinc-500 + line-through);
                      // empilhar `opacity` por cima derrubaria o contraste.
                      <div
                        key={gasto.id}
                        className="bg-app-row dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                          <Repeat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${
                            atenuado
                              ? "text-zinc-500 dark:text-zinc-400 line-through"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}>
                            {gasto.descricao}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                              vence dia {gasto.dia_vencimento}
                            </span>
                            {gasto.dividido_com && (
                              <span className={BADGE_NEUTRA}>c/ {formatarDivididoCom(gasto)}</span>
                            )}
                            {isSuspenso && (
                              <span className={BADGE_AMBAR}>pausado</span>
                            )}
                            {gasto.ativo === false && (
                              <span className={BADGE_NEUTRA}>inativo</span>
                            )}
                          </div>
                        </div>

                        <p className="font-mono valor text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {formatCurrency(gasto.valor)}
                        </p>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleClickSuspender(gasto, !!isSuspenso)}
                            className={ghostClasse(isSuspenso ? "reativar" : "pausar")}
                            title={isSuspenso ? "Reativar neste mês" : "Suspender neste mês"}
                          >
                            {isSuspenso ? <PlayCircle className="w-[15px] h-[15px]" /> : <PauseCircle className="w-[15px] h-[15px]" />}
                          </button>
                          <button
                            onClick={() => handleEditMeuGasto(gasto)}
                            className={ghostClasse("neutro")}
                            title="Editar"
                          >
                            <Edit3 className="w-[15px] h-[15px]" />
                          </button>
                          <button
                            onClick={() => handleToggleGastoFixo(gasto.id)}
                            className={ghostClasse(gasto.ativo !== false ? "pausar" : "reativar")}
                            title={gasto.ativo !== false ? "Desativar" : "Ativar"}
                          >
                            {gasto.ativo !== false ? <CheckCircle className="w-[15px] h-[15px]" /> : <MinusCircle className="w-[15px] h-[15px]" />}
                          </button>
                          <button
                            onClick={() => handleDeleteMeuGasto(gasto.id)}
                            className={ghostClasse("excluir")}
                            title="Excluir"
                          >
                            <Trash2 className="w-[15px] h-[15px]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
        </div>

        {/* Card Lançamentos do mês */}
        <Card className="min-w-0" data-tour="eu-lista-gastos">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Lançamentos do mês</h2>
            <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400">
              {gastosFiltrados.length} {gastosFiltrados.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {gastosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400">
                Nenhum gasto registrado
                {filtroCategoriaMeuGasto ? ` (${filtroCategoriaMeuGasto})` : ""}
                {filtroDiaMeuGasto ? ` no dia ${filtroDiaMeuGasto.substring(8, 10)}` : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {(() => {
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
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                        Dia {parseInt(dia, 10)}
                      </span>
                      <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.04]"></div>
                    </div>
                    {/* Lista de gastos do dia */}
                    <ul className="space-y-2.5">
                      {gastosPorDia[dia].map((gasto) => {
                        let nomeFatura = "";
                        if (gasto.tipo === "credito" && gasto.cartao_id) {
                          const cartao = cartoes?.find((c) => c.id === gasto.cartao_id);
                          if (cartao && cartao.melhor_dia_compra) {
                            const dataFatura = getMesFaturaCartao(gasto.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
                            nomeFatura = format(dataFatura, "MMMM", { locale: ptBR });
                          } else {
                            const [ano, mes, diaComp] = gasto.data.split("-").map(Number);
                            const dataFatura = new Date(ano, mes - 1, diaComp);
                            nomeFatura = format(dataFatura, "MMMM", { locale: ptBR });
                          }
                        }

                        const isSuspenso = gasto.categoria === "fixo" && gasto.meses_suspensos?.includes(format(mesVisualizacao, "yyyy-MM"));
                        const atenuado = gasto.pago || isSuspenso;

                        return (
                          <li
                            key={gasto.id}
                            // Atenuação vem do texto (zinc-500 + line-through), não
                            // de `opacity`/`grayscale` — uma atenuação só.
                            className={`rounded-xl border p-3.5 transition-colors ${
                              gasto.categoria === "divida"
                                ? "bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50"
                                : "bg-app-row dark:bg-white/[0.03] border-zinc-100 dark:border-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox pago */}
                              <button
                                onClick={() => handleTogglePagoMeuGasto(gasto.id)}
                                aria-label={gasto.pago ? `Desmarcar ${gasto.descricao} como pago` : `Marcar ${gasto.descricao} como pago`}
                                className="flex-shrink-0"
                              >
                                {gasto.pago ? (
                                  <span className="w-[26px] h-[26px] rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  </span>
                                ) : (
                                  <span className={`block w-[26px] h-[26px] rounded-lg border-2 transition-colors ${
                                    gasto.categoria === "divida"
                                      ? "border-amber-400 hover:border-amber-500"
                                      : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-400"
                                  }`} />
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium truncate ${
                                  atenuado
                                    ? "text-zinc-500 dark:text-zinc-400 line-through"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }`}>
                                  {gasto.descricao}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className={BADGE_NEUTRA}>
                                    {gasto.tipo === "credito"
                                      ? (nomeFatura ? `Crédito · fatura de ${nomeFatura}` : "Crédito")
                                      : "Débito"}
                                  </span>
                                  {gasto.categoria === "divida" && (
                                    <span className={BADGE_AMBAR}>Dívida</span>
                                  )}
                                  {isSuspenso && (
                                    <span className={BADGE_AMBAR}>pausado · volta em {getMesReativacao(gasto)}</span>
                                  )}
                                  {!!gasto.dividido_com && (
                                    <span className={`${BADGE_NEUTRA} inline-flex items-center gap-1`}>
                                      <Users className="w-[11px] h-[11px]" />
                                      {formatarDivididoCom(gasto)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <p className={`font-mono valor text-sm font-semibold whitespace-nowrap ${
                                  gasto.pago
                                    ? "text-zinc-500 dark:text-zinc-400 line-through"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }`}>
                                  −{formatCurrency(
                                    !!gasto.dividido_com && gasto.minha_parte
                                      ? gasto.minha_parte
                                      : gasto.valor
                                  )}
                                </p>
                                {!!gasto.dividido_com && gasto.minha_parte && (
                                  <p className="font-mono valor text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                    total {formatCurrency(gasto.valor)}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-0.5 flex-shrink-0" data-tour="eu-item-acoes">
                                {gasto.categoria === "fixo" && (
                                  <button
                                    onClick={() => handleClickSuspender(gasto, !!isSuspenso)}
                                    className={ghostClasse(isSuspenso ? "reativar" : "pausar")}
                                    title={isSuspenso ? "Reativar neste mês" : "Suspender neste mês"}
                                  >
                                    {isSuspenso ? <PlayCircle className="w-[15px] h-[15px]" /> : <PauseCircle className="w-[15px] h-[15px]" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditMeuGasto(gasto)}
                                  className={ghostClasse("neutro")}
                                  title="Editar"
                                >
                                  <Edit3 className="w-[15px] h-[15px]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMeuGasto(gasto.id)}
                                  className={ghostClasse("excluir")}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-[15px] h-[15px]" />
                                </button>
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
        </Card>
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
