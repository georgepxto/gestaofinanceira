import { Pencil, Trash2, CreditCard, Wallet, Undo2, MessageSquare, CheckCircle, Banknote, Receipt } from "lucide-react";
import { format } from "date-fns";
import { PageErrorState, PageLoadingState } from "../ui/AsyncState";
import type { ParcelaAtiva, ResumoMensal } from "../../types";
import type { PagamentoParcial } from "../../types/extended";
import { formatCurrency } from "../../utils/calculations";
import { formatPercent, rotuloDia } from "../../utils/dinheiro";
import { toActionableErrorMessage } from "../../utils/feedbackMessages";
import { KpiStrip, Kpi } from "../ui/KpiStrip";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Valor } from "../ui/Valor";
import { Surface, SurfaceHeader } from "../ui/Surface";
import { ListGroup, ListRow, type Acao } from "../ui/ListRow";
import { ProgressBar } from "../ui/ProgressBar";
import { Pill } from "../ui/Pill";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips, ChipDia } from "../ui/FilterChips";

interface TabGastosProps {
  mesVisualizacao: Date;
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
  const mesChave = format(mesVisualizacao, "yyyy-MM");

  // Lançamentos por dia do mês na tela (a parcela cai no mesmo dia da primeira).
  const porDia: { dia: number; parcelas: ParcelaAtiva[] }[] = [];
  parcelasAtivas.forEach((parcela) => {
    const dia = parseInt(parcela.gasto.data_inicio.substring(8, 10), 10);
    const grupo = porDia.find((g) => g.dia === dia);
    if (grupo) grupo.parcelas.push(parcela);
    else porDia.push({ dia, parcelas: [parcela] });
  });
  porDia.sort((a, b) => b.dia - a.dia);

  const ultimoDiaDoMes = new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth() + 1, 0).getDate();
  const dataNoMes = (dia: number) =>
    new Date(mesVisualizacao.getFullYear(), mesVisualizacao.getMonth(), Math.min(dia, ultimoDiaDoMes));

  return (
    <>
      {error && (
        <PageErrorState
          compact
          title="Não foi possível carregar os empréstimos"
          description={toActionableErrorMessage(error, "Não foi possível carregar os lançamentos do mês.")}
        />
      )}

      {/* FAIXA_RESUMO */}
      <KpiStrip data-tour="gastos-resumo-cards">
        <Kpi
          rotulo="A receber"
          data-tour="gastos-card-total"
          valor={<AnimatedNumber valor={totalAReceber} className="text-[20px]" />}
          meta="falta entrar neste mês"
        />
        <Kpi
          rotulo="Emprestado"
          valor={<AnimatedNumber valor={totalMes} className="text-[20px]" />}
          meta={`${parcelasAtivas.length} ${parcelasAtivas.length === 1 ? "lançamento" : "lançamentos"}`}
        />
        <Kpi rotulo="Recebido" valor={<AnimatedNumber valor={totalRecebido} className="text-[20px]" />} meta="pagamentos do período" />
        <Kpi rotulo="Devedores" valor={<Valor porte="medio">{resumoMensal.length}</Valor>} meta="com lançamentos no mês" />
      </KpiStrip>

      {/* Uma linha por pessoa, com o estado do mês e as ações num menu */}
      {resumoMensal.length > 0 && (
        <Surface as="section">
          <SurfaceHeader titulo="Por pessoa" className="mb-1" />
          <ListGroup>
            {resumoMensal.map((resumo) => {
              const obs = observacoesMes[getObsKey(resumo.pessoa)];
              const pagamentos = getPagamentosParciais(resumo.pessoa);
              const totalPago = getTotalPagoParcial(resumo.pessoa);
              const restante = resumo.total - totalPago;
              const temPagamentos = pagamentos.length > 0;
              const estaQuitado = temPagamentos && restante <= 0;
              const estaFechado = isMesFechado(resumo.pessoa);
              const mesFechadoData = getMesFechado(resumo.pessoa);
              const quitadoOuFechadoSemDivida =
                estaQuitado || (estaFechado && !!mesFechadoData && mesFechadoData.valorDevedor === 0);

              const acoes = ([
                ...(!estaQuitado && !estaFechado
                  ? [
                      {
                        rotulo: "Registrar pagamento",
                        icone: <Banknote className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => {
                          setShowPagamentoParcial(resumo.pessoa);
                          setValorPagamentoParcial("");
                        },
                      },
                    ]
                  : []),
                {
                  rotulo: obs ? "Editar observação" : "Adicionar observação",
                  icone: <MessageSquare className="w-4 h-4" strokeWidth={1.5} />,
                  onClick: () => handleAbrirObs(resumo.pessoa),
                },
                ...(temPagamentos
                  ? [
                      {
                        rotulo: "Desfazer último pagamento",
                        icone: <Undo2 className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => handleDesfazerPagamentoParcial(resumo.pessoa),
                      },
                    ]
                  : []),
                estaFechado
                  ? {
                      rotulo: "Desfazer fechamento",
                      icone: <Undo2 className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleDesfazerFechamento(resumo.pessoa),
                    }
                  : !estaQuitado
                    ? {
                        rotulo: "Fechar mês",
                        icone: <CheckCircle className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => {
                          setShowFecharMes(resumo.pessoa);
                          setValorPagoFecharMes("");
                        },
                      }
                    : null,
              ] as (Acao | null)[]).filter((a): a is Acao => a !== null);

              return (
                <ListRow
                  key={resumo.pessoa}
                  iconeCru={<Avatar nome={resumo.pessoa} />}
                  titulo={resumo.pessoa}
                  meta={
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span>
                        {resumo.quantidade} {resumo.quantidade === 1 ? "item" : "itens"}
                      </span>
                      {quitadoOuFechadoSemDivida ? (
                        <Pill>quitado</Pill>
                      ) : estaFechado ? (
                        <Pill>fechado</Pill>
                      ) : temPagamentos ? (
                        <Pill tom="atencao">parcial</Pill>
                      ) : (
                        <Pill tom="atencao">em aberto</Pill>
                      )}
                    </span>
                  }
                  valor={formatCurrency(Math.max(restante, 0))}
                  subvalor="a receber"
                  pago={quitadoOuFechadoSemDivida}
                  acoes={acoes}
                  rodape={
                    <div className="pl-12 space-y-2">
                      <ProgressBar
                        progresso
                        valor={totalPago}
                        maximo={resumo.total}
                        rotulo={`${resumo.pessoa} pagou ${formatPercent(resumo.total > 0 ? totalPago / resumo.total : 0)}`}
                      />
                      <p className="text-xs text-fg-2">
                        {estaFechado && mesFechadoData && mesFechadoData.valorDevedor > 0 ? (
                          <>
                            mês fechado · <span className="valor">{formatCurrency(mesFechadoData.valorDevedor)}</span> foi para cobranças
                          </>
                        ) : temPagamentos ? (
                          <>
                            pagou <span className="valor">{formatCurrency(totalPago)}</span> de{" "}
                            <span className="valor">{formatCurrency(resumo.total)}</span>
                          </>
                        ) : (
                          "nenhum pagamento registrado"
                        )}
                      </p>
                      {obs && <p className="text-xs text-fg-3 whitespace-pre-wrap break-words">{obs}</p>}
                    </div>
                  }
                />
              );
            })}
          </ListGroup>
        </Surface>
      )}

      {loading && <PageLoadingState compact title="Carregando lançamentos" />}

      {/* Lançamentos do mês */}
      {!loading && (
        <Surface as="section" data-tour="gastos-lista">
          <SurfaceHeader
            titulo="Lançamentos do mês"
            acao={
              <span className="tabular-nums text-xs text-fg-3">
                {parcelasAtivas.length} {parcelasAtivas.length === 1 ? "item" : "itens"}
              </span>
            }
          />

          <div className="space-y-2 mb-2" data-tour="gastos-filtros">
            <FilterChips
              rotulo="Filtrar por devedor"
              filtros={[{ valor: "", rotulo: "Todos" }, ...pessoas.map((p) => ({ valor: p, rotulo: p }))]}
              ativo={filtroPessoaGasto}
              onChange={setFiltroPessoaGasto}
            />
            <FilterChips
              rotulo="Filtrar por tipo"
              filtros={[
                { valor: "", rotulo: "Crédito e débito" },
                { valor: "credito", rotulo: "Crédito" },
                { valor: "debito", rotulo: "Débito" },
              ]}
              ativo={filtroTipoGasto}
              onChange={setFiltroTipoGasto}
              extra={<ChipDia valor={filtroDiaGasto} onChange={setFiltroDiaGasto} min={`${mesChave}-01`} max={`${mesChave}-31`} />}
            />
          </div>

          {parcelasAtivas.length === 0 ? (
            <EmptyState
              Icone={Receipt}
              frase="Nenhum empréstimo neste mês."
              detalhe={filtroPessoaGasto || filtroTipoGasto || filtroDiaGasto ? "Os filtros podem estar escondendo resultados." : undefined}
              compacto
            />
          ) : (
            porDia.map(({ dia, parcelas }) => (
              <ListGroup key={dia} titulo={rotuloDia(dataNoMes(dia))}>
                {parcelas.map(({ gasto, parcela_atual, valor_parcela }) => (
                  <ListRow
                    key={gasto.id}
                    dataTour="gastos-item-acoes"
                    icone={
                      gasto.tipo === "credito" ? (
                        <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <Wallet className="w-4 h-4" strokeWidth={1.5} />
                      )
                    }
                    titulo={gasto.descricao}
                    meta={
                      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span>
                          {gasto.pessoa} · {gasto.tipo === "credito" ? "Crédito" : "Débito"} ·{" "}
                          {gasto.recorrente
                            ? `mensal · ${formatCurrency(gasto.valor_total)}`
                            : `parcela ${parcela_atual}/${gasto.num_parcelas}`}
                        </span>
                        {gasto.recorrente && <Pill>fixo</Pill>}
                      </span>
                    }
                    valor={formatCurrency(valor_parcela)}
                    onAbrir={() => handleEditGasto(gasto)}
                    acoes={[
                      {
                        rotulo: "Editar",
                        icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => handleEditGasto(gasto),
                      },
                      {
                        rotulo: "Excluir",
                        icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => handleDelete(gasto.id),
                        tom: "perigo",
                      },
                    ]}
                  />
                ))}
              </ListGroup>
            ))
          )}
        </Surface>
      )}
    </>
  );
}
