import { useState } from "react";
import { Plus, Trash2, Banknote, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { formatCurrency } from "../utils/calculations";
import { formatPercent } from "../utils/dinheiro";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { KpiStrip, Kpi } from "../components/ui/KpiStrip";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Pill } from "../components/ui/Pill";
import { EmptyState } from "../components/ui/EmptyState";
import { FormSheet, Campo, campoClasse } from "../components/ui/FormSheet";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";

interface DevedoresTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const DEVEDORES_TUTORIAL_KEY = "devedores_tutorial_seen_v1";

const DEVEDORES_TUTORIAL_STEPS: DevedoresTutorialStep[] = [
  {
    target: "[data-tour='devedores-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Por pessoa",
    descricao:
      "Aqui você gerencia pessoas com valores em aberto e compara o que cada uma deve de uma olhada.",
    placement: "below",
  },
  {
    target: "[data-tour='devedores-btn-novo']",
    alvo: "Botão Novo Devedor",
    titulo: "Adicionar pessoa",
    descricao:
      "Use este botão para cadastrar um novo devedor e começar a acompanhar os valores pendentes dele.",
    placement: "below",
  },
  {
    target: "[data-tour='devedores-mes']",
    alvo: "Navegação mensal",
    titulo: "Troca de período",
    descricao:
      "Altere o mês para comparar empréstimos e dívidas pendentes em diferentes períodos.",
  },
  {
    target: "[data-tour='devedores-resumo-total']",
    alvo: "Resumo total",
    titulo: "Panorama geral",
    descricao:
      "O que te devem no total, o que você emprestou neste mês e o que já voltou. Cada número conta uma coisa: não some.",
  },
  {
    target: "[data-tour='devedores-lista']",
    alvo: "Comparativo por pessoa",
    titulo: "Comparativo por pessoa",
    descricao:
      "Cada pessoa mostra o que está em aberto e quanto do mês já pagou. Toque na linha para ver os itens.",
  },
  {
    target: "[data-tour='devedores-item-acoes']",
    alvo: "Ações por pessoa",
    titulo: "Ações rápidas",
    descricao:
      "No menu da linha você registra pagamentos e exclui o devedor.",
  },
  {
    target: "[data-tour='devedores-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Toque no (?) para ver este guia de novo.",
  },
];

export const PessoasPage = () => {
  const {
    pessoas,
    novaPessoa,
    setNovaPessoa,
    handleAddPessoa,
    handleRemovePessoa,
    setModalConfirm,
    resumoMensal,
    saldosDevedores,
    parcelasAtivas,
    getTotalPagoParcial,
    isMesFechado,
    setShowPagamentoParcial,
    mesVisualizacao,
  } = useAppContext();

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pessoaExpandida, setPessoaExpandida] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // "Novo devedor" é o botão laranja desta tela no desktop.
  useAcaoPrincipalDaPagina(!isMobile);
  const {
    viewportSize,
    showTutorial,
    tutorialStepIndex,
    tutorialSteps,
    currentTutorialStep,
    highlightRect,
    tooltipLeft,
    tooltipTop,
    showTooltipBelow,
    openTutorial,
    closeTutorial,
    nextTutorialStep,
    previousTutorialStep,
  } = useGuidedTour<DevedoresTutorialStep>({
    steps: DEVEDORES_TUTORIAL_STEPS,
    storageKey: DEVEDORES_TUTORIAL_KEY,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial de Por pessoa",
    ariaLabel: "Ver tutorial de Por pessoa",
    dataTour: "devedores-help-button",
  });

  const handleAdd = async () => {
    if (!novaPessoa.trim()) return;
    setAdding(true);
    await handleAddPessoa();
    setAdding(false);
    setShowAddForm(false);
  };

  const handleDelete = (nome: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir pessoa",
      mensagem: `Tem certeza que deseja excluir "${nome}"? Isso não afetará gastos ou dívidas já cadastradas.`,
      onConfirm: () => {
        handleRemovePessoa(nome);
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  // Estoque × fluxo, nunca somados: dívida em aberto é saldo acumulado;
  // empréstimos do mês são o fluxo do período.
  const getEstatisticasPessoa = (nome: string) => {
    const resumoPessoa = resumoMensal.find((r) => r.pessoa === nome);
    const dividasPendentes = saldosDevedores.filter((d) => d.pessoa === nome && d.valor_atual > 0);

    const emprestimosMes = resumoPessoa?.total || 0;
    const qtdItensMes = resumoPessoa?.quantidade || 0;
    const dividaAberta = dividasPendentes.reduce((sum, d) => sum + d.valor_atual, 0);
    const qtdCobrancas = dividasPendentes.length;
    const pagoMes = getTotalPagoParcial(nome);
    const quitada = emprestimosMes > 0 && pagoMes >= emprestimosMes;
    const fechado = isMesFechado(nome);

    return { emprestimosMes, qtdItensMes, dividaAberta, qtdCobrancas, dividasPendentes, pagoMes, quitada, fechado };
  };

  const totalEmprestimosMes = resumoMensal.reduce((sum, r) => sum + r.total, 0);
  const pessoasComEmprestimos = resumoMensal.filter((r) => r.total > 0).length;
  const totalDividasGeral = saldosDevedores
    .filter((d) => d.valor_atual > 0)
    .reduce((sum, d) => sum + d.valor_atual, 0);
  const pessoasComDivida = new Set(saldosDevedores.filter((d) => d.valor_atual > 0).map((d) => d.pessoa)).size;
  const totalRecebidoMes = pessoas.reduce((sum, p) => sum + getTotalPagoParcial(p), 0);

  const pessoasOrdenadas = [...pessoas].sort(
    (a, b) => getEstatisticasPessoa(b).dividaAberta - getEstatisticasPessoa(a).dividaAberta
  );

  const mesNome = format(mesVisualizacao, "MMMM", { locale: ptBR });

  const toggleExpand = (nome: string) => {
    setPessoaExpandida(pessoaExpandida === nome ? null : nome);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="devedores-header"
        title="Por pessoa"
        description="Quem deve o quê, de uma olhada."
        nota="Dívida em aberto é o que te devem no total, somando todos os meses. Empréstimos do mês contam só este mês. Não some os dois."
        action={
          <>
            <SeletorMes data-tour="devedores-mes" />
            <Button
              variante={isMobile ? "secundario" : "principal"}
              onClick={() => setShowAddForm(true)}
              data-tour="devedores-btn-novo"
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
            >
              Novo devedor
            </Button>
          </>
        }
      />

      {/* FAIXA_RESUMO — estoque e fluxo lado a lado, nunca somados */}
      <KpiStrip data-tour="devedores-resumo-total">
        <Kpi
          rotulo="Dívidas em aberto"
          valor={<AnimatedNumber valor={totalDividasGeral} className="text-[20px]" />}
          meta={`${pessoasComDivida} ${pessoasComDivida === 1 ? "pessoa" : "pessoas"}`}
        />
        <Kpi
          rotulo={`Empréstimos de ${mesNome}`}
          valor={<AnimatedNumber valor={totalEmprestimosMes} className="text-[20px]" />}
          meta={`${pessoasComEmprestimos} ${pessoasComEmprestimos === 1 ? "pessoa" : "pessoas"}`}
        />
        <Kpi
          rotulo="Recebido no mês"
          valor={<AnimatedNumber valor={totalRecebidoMes} className="text-[20px]" />}
          meta="pagamentos registrados"
        />
      </KpiStrip>

      {/* Uma linha por pessoa, ordenada pela dívida em aberto */}
      <Surface as="section" data-tour="devedores-lista">
        <SurfaceHeader titulo="Pessoas" descricao="Da maior dívida em aberto para a menor." className="mb-1" />

        {pessoas.length === 0 ? (
          <EmptyState
            Icone={Users}
            frase="Nenhum devedor cadastrado."
            acao={<Button onClick={() => setShowAddForm(true)}>Novo devedor</Button>}
          />
        ) : (
          <ListGroup>
            {pessoasOrdenadas.map((pessoa) => {
              const stats = getEstatisticasPessoa(pessoa);
              const isExpanded = pessoaExpandida === pessoa;
              const parcelasPessoa = parcelasAtivas.filter((p) => p.gasto.pessoa === pessoa);
              // Só a dívida em aberto (saldo): somar o fluxo do mês daria um
              // número sem significado. O mês aparece na barra, embaixo.
              const emAberto = stats.dividaAberta;

              return (
                <ListRow
                  key={pessoa}
                  dataTour="devedores-item-acoes"
                  iconeCru={<Avatar nome={pessoa} />}
                  titulo={pessoa}
                  meta={
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span>
                        {stats.qtdItensMes} {stats.qtdItensMes === 1 ? "item" : "itens"} no mês · {stats.qtdCobrancas}{" "}
                        {stats.qtdCobrancas === 1 ? "cobrança" : "cobranças"}
                      </span>
                      {stats.fechado ? <Pill>fechado</Pill> : stats.quitada ? <Pill>quitada</Pill> : null}
                    </span>
                  }
                  valor={formatCurrency(emAberto)}
                  subvalor="em aberto"
                  pago={emAberto === 0 && (stats.quitada || stats.fechado)}
                  onAbrir={() => toggleExpand(pessoa)}
                  expandido={isExpanded}
                  acoes={[
                    {
                      rotulo: "Registrar pagamento",
                      icone: <Banknote className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => setShowPagamentoParcial(pessoa),
                    },
                    // Sem a trava de "sobrar uma": a última pessoa também sai.
                    {
                      rotulo: "Excluir",
                      icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleDelete(pessoa),
                      tom: "perigo" as const,
                    },
                  ]}
                  rodape={
                    <div className="pl-12 space-y-3">
                      {stats.emprestimosMes > 0 && (
                        <div>
                          <ProgressBar
                            progresso
                            valor={stats.pagoMes}
                            maximo={stats.emprestimosMes}
                            rotulo={`${pessoa} pagou ${formatPercent(stats.pagoMes / stats.emprestimosMes)} do mês`}
                          />
                          <p className="mt-1.5 text-xs text-fg-2">
                            pagou <span className="valor">{formatCurrency(stats.pagoMes)}</span> de{" "}
                            <span className="valor">{formatCurrency(stats.emprestimosMes)}</span> do mês
                          </p>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 pt-1">
                          <ListGroup titulo="Cobranças em aberto">
                            {stats.dividasPendentes.length === 0 ? (
                              <li className="py-3 text-sm text-fg-2 list-none">Nenhuma cobrança em aberto.</li>
                            ) : (
                              stats.dividasPendentes.map((d) => {
                                const pago = Math.max(d.valor_original - d.valor_atual, 0);
                                return (
                                  <ListRow
                                    key={d.id}
                                    titulo={d.descricao}
                                    meta={`pago ${formatCurrency(pago)} de ${formatCurrency(d.valor_original)}`}
                                    valor={formatCurrency(d.valor_atual)}
                                    rodape={
                                      <ProgressBar
                                        progresso
                                        valor={pago}
                                        maximo={d.valor_original}
                                        rotulo={`${d.descricao}: ${formatPercent(d.valor_original > 0 ? pago / d.valor_original : 0)} pago`}
                                      />
                                    }
                                  />
                                );
                              })
                            )}
                          </ListGroup>
                          <ListGroup titulo={`Empréstimos de ${mesNome}`}>
                            {parcelasPessoa.length === 0 ? (
                              <li className="py-3 text-sm text-fg-2 list-none">Nenhum empréstimo neste mês.</li>
                            ) : (
                              parcelasPessoa.map(({ gasto, parcela_atual, valor_parcela }) => (
                                <ListRow
                                  key={gasto.id}
                                  titulo={gasto.descricao}
                                  meta={`parcela ${parcela_atual}/${gasto.num_parcelas} · total ${formatCurrency(gasto.valor_total)}`}
                                  valor={formatCurrency(valor_parcela)}
                                />
                              ))
                            )}
                          </ListGroup>
                          <div className="md:col-span-2 flex items-center gap-2 flex-wrap pt-3">
                            <Button tamanho="sm" onClick={() => setShowPagamentoParcial(pessoa)}>
                              Registrar pagamento
                            </Button>
                            <Link
                              to="/a-receber/mes"
                              className="h-11 md:h-9 px-3 inline-flex items-center text-sm text-fg-2 hover:text-fg transition-colors"
                            >
                              Ver lançamentos
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </Surface>

      {/* Novo devedor */}
      <FormSheet
        aberto={showAddForm}
        titulo="Novo devedor"
        onFechar={() => {
          setShowAddForm(false);
          setNovaPessoa("");
        }}
        onEnviar={handleAdd}
        rotuloEnviar="Adicionar devedor"
        enviando={adding}
        podeEnviar={!!novaPessoa.trim()}
      >
        <Campo rotulo="Nome" htmlFor="devedor-nome">
          <input
            id="devedor-nome"
            data-autofocus
            type="text"
            value={novaPessoa}
            onChange={(e) => setNovaPessoa(e.target.value)}
            placeholder="Ex: Ana"
            className={campoClasse}
          />
        </Campo>
      </FormSheet>

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.devedores}
        currentStep={currentTutorialStep}
        stepIndex={tutorialStepIndex}
        totalSteps={tutorialSteps.length}
        highlightRect={highlightRect}
        viewportSize={viewportSize}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
        showTooltipBelow={showTooltipBelow}
        onClose={closeTutorial}
        onPrevious={previousTutorialStep}
        onNext={nextTutorialStep}
      />
    </div>
  );
};
