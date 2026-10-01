import { useEffect, useState } from "react";
import { Plus, Trash2, Banknote, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageHeader } from "../components/ui/PageHeader";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { formatCurrency } from "../utils/calculations";
import { formatPercent } from "../utils/dinheiro";
import { pendenciasDaPessoa } from "../utils/receber";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { KpiStrip, Kpi } from "../components/ui/KpiStrip";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { ProgressBar } from "../components/ui/ProgressBar";
import { EmptyState } from "../components/ui/EmptyState";
import { PainelDetalhe } from "../components/ui/PainelDetalhe";
import { FormSheet, Campo, campoClasse } from "../components/ui/FormSheet";
import { RegistrarPagamento } from "../components/receber/RegistrarPagamento";
import { useAcaoPrincipalDaPagina } from "../components/layout/AcaoPrincipalContext";

interface DevedoresTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const DEVEDORES_TUTORIAL_KEY = "devedores_tutorial_seen_v2";

const DEVEDORES_TUTORIAL_STEPS: DevedoresTutorialStep[] = [
  {
    target: "[data-tour='devedores-header']",
    alvo: "Cabeçalho da aba",
    titulo: "Pessoas",
    descricao:
      "Quanto cada pessoa te deve no total: o que falta do mês mais as cobranças em aberto. Sempre o mês de hoje.",
    placement: "below",
  },
  {
    target: "[data-tour='devedores-btn-novo']",
    alvo: "Botão Nova pessoa",
    titulo: "Adicionar pessoa",
    descricao: "Cadastre quem divide gastos com você ou pega dinheiro emprestado.",
    placement: "below",
  },
  {
    target: "[data-tour='devedores-resumo-total']",
    alvo: "Resumo",
    titulo: "Panorama",
    descricao: "O total que te devem e quem deve mais.",
  },
  {
    target: "[data-tour='devedores-lista']",
    alvo: "Lista de pessoas",
    titulo: "Quem te deve",
    descricao:
      "Toque numa pessoa para ver o que ela pegou neste mês, as cobranças e os pagamentos — e registrar um pagamento.",
  },
  {
    target: "[data-tour='devedores-item-acoes']",
    alvo: "Ações por pessoa",
    titulo: "Ações rápidas",
    descricao: "No menu da linha você registra um pagamento ou exclui a pessoa.",
  },
  {
    target: "[data-tour='devedores-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao: "Toque no (?) para ver este guia de novo.",
  },
];

export const PessoasPage = () => {
  const ctx = useAppContext();
  const {
    pessoas,
    novaPessoa,
    setNovaPessoa,
    handleAddPessoa,
    handleRemovePessoa,
    setModalConfirm,
    saldosDevedores,
    getPagamentosParciais,
    mesVisualizacao,
    irParaHoje,
    setFiltroPessoaGasto,
    setFiltroPessoaDivida,
    setFiltroStatusDivida,
  } = ctx;
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pessoaAberta, setPessoaAberta] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // "Nova pessoa" é o botão laranja desta tela no desktop.
  useAcaoPrincipalDaPagina(!isMobile);

  // Pessoas é sempre hoje: o total de cada um usa o mês corrente, então a tela
  // não tem seletor de mês e volta para o mês atual ao abrir.
  useEffect(() => {
    if (format(mesVisualizacao, "yyyy-MM") !== format(new Date(), "yyyy-MM")) irParaHoje();
    // Só ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    title: "Ver tutorial de Pessoas",
    ariaLabel: "Ver tutorial de Pessoas",
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
      mensagem: `Tem certeza que deseja excluir "${nome}"? Os lançamentos e as cobranças dela continuam salvos.`,
      onConfirm: () => {
        handleRemovePessoa(nome);
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  const mesNome = format(mesVisualizacao, "MMMM", { locale: ptBR });
  const linhas = pessoas
    .map((nome) => ({ nome, p: pendenciasDaPessoa(nome, ctx) }))
    .sort((a, b) => b.p.total - a.p.total || a.nome.localeCompare(b.nome));
  const totalGeral = linhas.reduce((s, l) => s + l.p.total, 0);
  const devendo = linhas.filter((l) => l.p.total > 0);
  const maior = devendo[0];

  const aberta = linhas.find((l) => l.nome === pessoaAberta) ?? null;

  // Pagamentos recebidos da pessoa: os do mês e os das cobranças, do mais novo
  // para o mais antigo.
  const recebidos = (nome: string) => {
    const doMes = getPagamentosParciais(nome).map((pg, i) => {
      const [d, m, a] = (pg.data || "").split("/");
      return { chave: `m${i}`, data: a ? `${a}-${m}-${d}` : pg.data, valor: pg.valor, origem: mesNome };
    });
    const deCobrancas = saldosDevedores
      .filter((s) => s.pessoa === nome)
      .flatMap((s) => (s.historico || []).map((h) => ({ chave: `c${h.id}`, data: h.data, valor: h.valor, origem: s.descricao })));
    return [...doMes, ...deCobrancas].sort((x, y) => (y.data || "").localeCompare(x.data || "")).slice(0, 8);
  };
  const dataCurta = (iso: string) => {
    const [a, m, d] = (iso || "").split("-").map(Number);
    return a && m && d ? format(new Date(a, m - 1, d), "d 'de' MMM", { locale: ptBR }) : iso;
  };

  const verEmDoMes = (nome: string) => {
    setFiltroPessoaGasto(nome);
    setPessoaAberta(null);
    navigate("/a-receber/mes");
  };
  const verEmCobrancas = (nome: string) => {
    setFiltroStatusDivida("pendentes");
    setFiltroPessoaDivida(nome);
    setPessoaAberta(null);
    navigate("/a-receber/aberto");
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="devedores-header"
        title="Pessoas"
        description="Quanto cada pessoa te deve, somando o mês e as cobranças."
        action={
          <Button
            variante={isMobile ? "secundario" : "principal"}
            onClick={() => setShowAddForm(true)}
            data-tour="devedores-btn-novo"
            icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
          >
            Nova pessoa
          </Button>
        }
      />

      <KpiStrip data-tour="devedores-resumo-total">
        <Kpi
          rotulo="Te devem no total"
          valor={<AnimatedNumber valor={totalGeral} className="text-[20px]" />}
          meta={devendo.length === 0 ? "ninguém deve nada" : `${devendo.length} ${devendo.length === 1 ? "pessoa" : "pessoas"}`}
        />
        {maior && (
          <Kpi
            rotulo="Quem deve mais"
            valor={<AnimatedNumber valor={maior.p.total} className="text-[20px]" />}
            meta={maior.nome}
          />
        )}
      </KpiStrip>

      <Surface as="section" data-tour="devedores-lista">
        <SurfaceHeader titulo="Quem te deve" descricao="Abra uma pessoa para ver o que ela pegou, as cobranças e os pagamentos." className="mb-1" />

        {pessoas.length === 0 ? (
          <EmptyState
            Icone={Users}
            frase="Nenhuma pessoa cadastrada."
            acao={<Button onClick={() => setShowAddForm(true)}>Nova pessoa</Button>}
          />
        ) : (
          <ListGroup>
            {linhas.map(({ nome, p }) => {
              const partes = [
                p.mes.falta > 0 && `${formatCurrency(p.mes.falta)} de ${mesNome}`,
                p.emCobrancas > 0 && `${formatCurrency(p.emCobrancas)} em ${p.cobrancas.length === 1 ? "cobrança" : "cobranças"}`,
              ].filter(Boolean);
              return (
                <ListRow
                  key={nome}
                  dataTour="devedores-item-acoes"
                  iconeCru={<Avatar nome={nome} />}
                  titulo={nome}
                  meta={partes.length > 0 ? partes.join(" · ") : "não deve nada"}
                  valor={formatCurrency(p.total)}
                  subvalor={p.total > 0 ? "deve no total" : undefined}
                  pago={p.total === 0}
                  onAbrir={() => setPessoaAberta(nome)}
                  acoes={[
                    ...(p.total > 0
                      ? [
                          {
                            rotulo: "Registrar pagamento",
                            icone: <Banknote className="w-4 h-4" strokeWidth={1.5} />,
                            onClick: () => setPagando(nome),
                          },
                        ]
                      : []),
                    {
                      rotulo: "Excluir",
                      icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleDelete(nome),
                      tom: "perigo" as const,
                    },
                  ]}
                />
              );
            })}
          </ListGroup>
        )}
      </Surface>

      {/* A pessoa: o que pegou no mês, as cobranças e o que já pagou. */}
      <PainelDetalhe
        aberto={!!aberta}
        titulo={aberta?.nome ?? ""}
        resumo={
          aberta &&
          (aberta.p.total > 0 ? (
            <>
              deve <span className="valor text-fg">{formatCurrency(aberta.p.total)}</span> no total
            </>
          ) : (
            "não deve nada"
          ))
        }
        onFechar={() => setPessoaAberta(null)}
      >
        {aberta && (
          <div className="py-4 space-y-6">
            {aberta.p.total > 0 && (
              <Button variante="principal" cheio onClick={() => setPagando(aberta.nome)} icone={<Banknote className="w-4 h-4" strokeWidth={1.5} />}>
                Registrar pagamento
              </Button>
            )}

            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm text-fg capitalize">{mesNome}</h3>
                <button type="button" onClick={() => verEmDoMes(aberta.nome)} className="text-xs text-fg-2 hover:text-fg underline underline-offset-2 transition-colors min-h-[44px] md:min-h-0">
                  Ver em Mês a mês
                </button>
              </div>
              {aberta.p.mes.itens.length === 0 ? (
                <p className="mt-2 text-sm text-fg-2">Nenhum lançamento neste mês.</p>
              ) : (
                <>
                  <ul className="mt-1 divide-y divide-line">
                    {aberta.p.mes.itens.map(({ gasto, parcela_atual, valor_parcela }) => (
                      <li key={gasto.id} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-sm text-fg break-words">{gasto.descricao}</span>
                          {gasto.num_parcelas > 1 && (
                            <span className="block text-xs text-fg-3 mt-0.5">parcela {parcela_atual}/{gasto.num_parcelas}</span>
                          )}
                        </span>
                        <span className="valor text-sm text-fg shrink-0">{formatCurrency(valor_parcela)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-fg-2">
                    {aberta.p.mes.fechado ? (
                      "Mês fechado: o que faltava foi para Cobranças."
                    ) : aberta.p.mes.falta > 0 ? (
                      <>
                        pagou <span className="valor">{formatCurrency(aberta.p.mes.pago)}</span> de{" "}
                        <span className="valor">{formatCurrency(aberta.p.mes.total)}</span> · falta{" "}
                        <span className="valor text-fg">{formatCurrency(aberta.p.mes.falta)}</span>
                      </>
                    ) : (
                      "Pagou tudo deste mês."
                    )}
                  </p>
                </>
              )}
            </section>

            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm text-fg">Cobranças em aberto</h3>
                {aberta.p.cobrancas.length > 0 && (
                  <button type="button" onClick={() => verEmCobrancas(aberta.nome)} className="text-xs text-fg-2 hover:text-fg underline underline-offset-2 transition-colors min-h-[44px] md:min-h-0">
                    Ver em Cobranças
                  </button>
                )}
              </div>
              {aberta.p.cobrancas.length === 0 ? (
                <p className="mt-2 text-sm text-fg-2">Nenhuma cobrança em aberto.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {aberta.p.cobrancas.map((c) => {
                    const pago = Math.max(c.valor_original - c.valor_atual, 0);
                    return (
                      <li key={c.id} className="py-2.5">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-sm text-fg break-words min-w-0">{c.descricao}</span>
                          <span className="valor text-sm text-fg shrink-0">{formatCurrency(c.valor_atual)}</span>
                        </div>
                        {pago > 0 && (
                          <div className="mt-2">
                            <ProgressBar progresso valor={pago} maximo={c.valor_original} rotulo={`${c.descricao}: ${formatPercent(pago / c.valor_original)} pago`} />
                            <p className="mt-1 text-xs text-fg-3">
                              pagou <span className="valor">{formatCurrency(pago)}</span> de <span className="valor">{formatCurrency(c.valor_original)}</span>
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {recebidos(aberta.nome).length > 0 && (
              <section>
                <h3 className="text-sm text-fg">Pagamentos recebidos</h3>
                <ul className="mt-1 divide-y divide-line">
                  {recebidos(aberta.nome).map((r) => (
                    <li key={r.chave} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span className="min-w-0 text-xs text-fg-2 break-words">
                        {dataCurta(r.data)} · {r.origem}
                      </span>
                      <span className="valor text-sm text-fg shrink-0">+{formatCurrency(r.valor)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </PainelDetalhe>

      <RegistrarPagamento pessoa={pagando} onFechar={() => setPagando(null)} />

      {/* Nova pessoa */}
      <FormSheet
        aberto={showAddForm}
        titulo="Nova pessoa"
        onFechar={() => {
          setShowAddForm(false);
          setNovaPessoa("");
        }}
        onEnviar={handleAdd}
        rotuloEnviar="Adicionar pessoa"
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
