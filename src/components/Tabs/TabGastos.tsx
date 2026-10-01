import { Pencil, Trash2, CreditCard, Wallet, Undo2, MessageSquare, CheckCircle, Banknote, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../../context";
import { Button } from "../ui/Button";
import { PageErrorState, PageLoadingState } from "../ui/AsyncState";
import type { ParcelaAtiva, ResumoMensal } from "../../types";
import type { PagamentoParcial } from "../../types/extended";
import { formatCurrency } from "../../utils/calculations";
import { formatPercent, rotuloDia } from "../../utils/dinheiro";
import { toActionableErrorMessage } from "../../utils/feedbackMessages";
import { KpiStrip, Kpi } from "../ui/KpiStrip";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Surface, SurfaceHeader } from "../ui/Surface";
import { ListGroup, ListRow } from "../ui/ListRow";
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
  const nomeMes = format(mesVisualizacao, "MMMM", { locale: ptBR });
  // Os chips de pessoa mostram o total do mês de cada uma — sem os filtros.
  const { resumoDoMes } = useAppContext();
  const totalDoMes = (pessoa: string) => resumoDoMes.find((r) => r.pessoa === pessoa)?.total || 0;
  const resumoPessoa = filtroPessoaGasto ? resumoDoMes.find((r) => r.pessoa === filtroPessoaGasto) : undefined;

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
          rotulo={`Emprestado em ${nomeMes}`}
          valor={<AnimatedNumber valor={totalMes} className="text-[20px]" />}
          meta={`${parcelasAtivas.length} ${parcelasAtivas.length === 1 ? "lançamento" : "lançamentos"}`}
        />
        <Kpi rotulo="Recebido" valor={<AnimatedNumber valor={totalRecebido} className="text-[20px]" />} meta={`pagamentos de ${nomeMes}`} />
        <Kpi
          rotulo="Falta receber"
          data-tour="gastos-card-total"
          valor={<AnimatedNumber valor={totalAReceber} className="text-[20px]" />}
          meta={`só de ${nomeMes}`}
        />
      </KpiStrip>

      {/* Filtrando uma pessoa: o mês dela e as ações do mês (pagar, fechar).
          A lista de todas as pessoas mora em Pessoas — aqui não se repete. */}
      {filtroPessoaGasto && resumoPessoa && (() => {
        const pessoa = filtroPessoaGasto;
        const obs = observacoesMes[getObsKey(pessoa)];
        const pagamentos = getPagamentosParciais(pessoa);
        const totalPago = getTotalPagoParcial(pessoa);
        const restante = resumoPessoa.total - totalPago;
        const temPagamentos = pagamentos.length > 0;
        const estaQuitado = temPagamentos && restante <= 0.009;
        const estaFechado = isMesFechado(pessoa);
        const mesFechadoData = getMesFechado(pessoa);
        return (
          <Surface as="section" data-tour="gastos-pessoa">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar nome={pessoa} />
                <div className="min-w-0">
                  <p className="text-[15px] md:text-sm text-fg break-words">{pessoa} em {nomeMes}</p>
                  <p className="text-xs text-fg-2 mt-0.5">
                    {resumoPessoa.quantidade} {resumoPessoa.quantidade === 1 ? "item" : "itens"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="valor text-fg">{formatCurrency(Math.max(restante, 0))}</p>
                <p className="text-xs text-fg-2 mt-0.5">{estaFechado ? "mês fechado" : estaQuitado ? "quitado" : "falta"}</p>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar
                progresso
                valor={totalPago}
                maximo={resumoPessoa.total}
                rotulo={`${pessoa} pagou ${formatPercent(resumoPessoa.total > 0 ? totalPago / resumoPessoa.total : 0)}`}
              />
              <p className="mt-1.5 text-xs text-fg-2">
                {estaFechado && mesFechadoData && mesFechadoData.valorDevedor > 0 ? (
                  <>
                    <span className="valor">{formatCurrency(mesFechadoData.valorDevedor)}</span> foi para Cobranças
                  </>
                ) : (
                  <>
                    pagou <span className="valor">{formatCurrency(totalPago)}</span> de{" "}
                    <span className="valor">{formatCurrency(resumoPessoa.total)}</span>
                  </>
                )}
              </p>
              {obs && <p className="mt-1 text-xs text-fg-3 whitespace-pre-wrap break-words">{obs}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!estaQuitado && !estaFechado && (
                <Button
                  tamanho="sm"
                  icone={<Banknote className="w-4 h-4" strokeWidth={1.5} />}
                  onClick={() => {
                    setShowPagamentoParcial(pessoa);
                    setValorPagamentoParcial("");
                  }}
                >
                  Registrar pagamento do mês
                </Button>
              )}
              {estaFechado ? (
                <Button tamanho="sm" variante="fantasma" icone={<Undo2 className="w-4 h-4" strokeWidth={1.5} />} onClick={() => handleDesfazerFechamento(pessoa)}>
                  Desfazer fechamento
                </Button>
              ) : (
                !estaQuitado && (
                  <Button
                    tamanho="sm"
                    variante="secundario"
                    icone={<CheckCircle className="w-4 h-4" strokeWidth={1.5} />}
                    onClick={() => {
                      setShowFecharMes(pessoa);
                      setValorPagoFecharMes("");
                    }}
                  >
                    Fechar mês
                  </Button>
                )
              )}
              {temPagamentos && !estaFechado && (
                <Button tamanho="sm" variante="fantasma" icone={<Undo2 className="w-4 h-4" strokeWidth={1.5} />} onClick={() => handleDesfazerPagamentoParcial(pessoa)}>
                  Desfazer último pagamento
                </Button>
              )}
              <Button tamanho="sm" variante="fantasma" icone={<MessageSquare className="w-4 h-4" strokeWidth={1.5} />} onClick={() => handleAbrirObs(pessoa)}>
                {obs ? "Editar observação" : "Observação"}
              </Button>
            </div>
            {!estaFechado && !estaQuitado && (
              <p className="mt-3 text-xs text-fg-3">Fechar o mês encerra {nomeMes}: o que faltar vira uma cobrança em Cobranças.</p>
            )}
          </Surface>
        );
      })()}

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
            {pessoas.length > 0 && (
            <FilterChips
              rotulo="Filtrar por devedor"
              filtros={[
                { valor: "", rotulo: "Todos" },
                ...pessoas.map((p) => ({ valor: p, rotulo: totalDoMes(p) > 0 ? `${p} · ${formatCurrency(totalDoMes(p))}` : p })),
              ]}
              ativo={filtroPessoaGasto}
              onChange={setFiltroPessoaGasto}
            />
            )}
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
