import { useState } from "react";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { Pista } from "../components/ui/PageHeader";
import { PageEmptyState } from "../components/ui/AsyncState";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { formatCurrency, formatMonthYear } from "../utils/calculations";
import { TUTORIAL_TITLES } from "../utils/tutorial";

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
    titulo: "Visão de Devedores",
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
      "Dívidas em aberto (saldo acumulado), empréstimos do mês (fluxo) e o que já foi recebido — sem misturar estoque com fluxo.",
  },
  {
    target: "[data-tour='devedores-lista']",
    alvo: "Comparativo por pessoa",
    titulo: "Comparativo por pessoa",
    descricao:
      "Barras na mesma escala mostram empréstimos do mês (esmeralda) e dívida em aberto (âmbar) de cada pessoa.",
  },
  {
    target: "[data-tour='devedores-item-acoes']",
    alvo: "Ações por pessoa",
    titulo: "Ações rápidas",
    descricao:
      "Expandindo uma linha você registra pagamentos, vê os lançamentos e pode excluir o devedor.",
  },
  {
    target: "[data-tour='devedores-help-button']",
    alvo: "Botão de ajuda",
    titulo: "Rever tutorial",
    descricao:
      "Clique no (?) para abrir novamente esta explicação da aba Devedores.",
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
    navegarMes,
    irParaHoje,
  } = useAppContext();

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pessoaExpandida, setPessoaExpandida] = useState<string | null>(null);
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
    title: "Ver tutorial da aba Devedores",
    ariaLabel: "Ver tutorial da aba Devedores",
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
      titulo: "Excluir Pessoa",
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

  // Escala única do comparativo: S = maior soma entre TODAS as pessoas
  // (nunca normalizar por linha — as barras precisam ser comparáveis).
  const escalaS = Math.max(
    ...pessoas.map((p) => {
      const s = getEstatisticasPessoa(p);
      return s.emprestimosMes + s.dividaAberta;
    }),
    1
  );

  const pessoasOrdenadas = [...pessoas].sort(
    (a, b) => getEstatisticasPessoa(b).dividaAberta - getEstatisticasPessoa(a).dividaAberta
  );

  const isMesCorrente = format(mesVisualizacao, "yyyy-MM") === format(new Date(), "yyyy-MM");
  const mesNome = format(mesVisualizacao, "MMMM", { locale: ptBR });

  const toggleExpand = (nome: string) => {
    setPessoaExpandida(pessoaExpandida === nome ? null : nome);
  };

  return (
    <div className="space-y-6">
      {/* HEADER_PAGINA */}
      <div className="flex items-end justify-between flex-wrap gap-5 mb-6" data-tour="devedores-header">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">
            A receber · Por pessoa
          </p>
          <h1 className="font-display font-bold text-[34px] leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
            <Pista>Devedores</Pista>
          </h1>
          <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">
            Quem deve o quê — comparável de uma olhada.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* MES_PILL */}
          <div className="inline-flex items-center bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl p-1 shadow-sm" data-tour="devedores-mes">
            <button
              onClick={() => navegarMes("anterior")}
              aria-label="Mês anterior"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-[18px] h-[18px]" />
            </button>
            <span className="min-w-[128px] text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
              {formatMonthYear(mesVisualizacao)}
            </span>
            {!isMesCorrente && (
              <button
                onClick={irParaHoje}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-1.5"
              >
                hoje
              </button>
            )}
            <button
              onClick={() => navegarMes("proximo")}
              aria-label="Próximo mês"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
            >
              <ChevronRight className="w-[18px] h-[18px]" />
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            data-tour="devedores-btn-novo"
            className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-[0_4px_12px_-3px_rgba(5,150,105,0.5)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-[18px] h-[18px]" />
            Novo devedor
          </button>
        </div>
      </div>

      {/* FAIXA_RESUMO — estoque e fluxo lado a lado, nunca somados */}
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-7 grid gap-x-7 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
        data-tour="devedores-resumo-total"
      >
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Dívidas em aberto</p>
          <p className="font-display font-extrabold tracking-tighter tabular-nums whitespace-nowrap text-[32px] leading-tight text-zinc-900 dark:text-zinc-50 mt-1">
            {formatCurrency(totalDividasGeral)}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">saldo acumulado · {pessoasComDivida} {pessoasComDivida === 1 ? "pessoa" : "pessoas"}</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 capitalize">Empréstimos de {mesNome}</p>
          <p className="font-mono tabular-nums text-[26px] font-semibold text-zinc-900 dark:text-zinc-50 mt-1.5 whitespace-nowrap">
            {formatCurrency(totalEmprestimosMes)}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">fluxo do mês · {pessoasComEmprestimos} {pessoasComEmprestimos === 1 ? "pessoa" : "pessoas"}</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Recebido no mês</p>
          <p className="font-mono tabular-nums text-[26px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5 whitespace-nowrap">
            {formatCurrency(totalRecebidoMes)}
          </p>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">pagamentos registrados no período</p>
        </div>
      </div>

      {/* Form Novo devedor */}
      {showAddForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Adicionar devedor</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={novaPessoa}
              onChange={(e) => setNovaPessoa(e.target.value)}
              placeholder="Nome do devedor"
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-[10px] text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !novaPessoa.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 disabled:cursor-not-allowed disabled:shadow-none text-white rounded-xl text-sm font-semibold shadow-[0_4px_12px_-3px_rgba(5,150,105,0.5)] transition-colors"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNovaPessoa(""); }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Comparativo por pessoa */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5" data-tour="devedores-lista">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Comparativo por pessoa</h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="w-3 h-[10px] rounded-sm bg-emerald-500" />
              Empréstimos do mês
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="w-3 h-[10px] rounded-sm bg-amber-500" />
              Dívida em aberto
            </span>
          </div>
        </div>
        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-2">ordenado pela dívida em aberto · barras na mesma escala</p>

        {pessoas.length === 0 ? (
          <PageEmptyState
            compact
            title="Nenhum devedor cadastrado"
            description="Clique em Novo devedor para começar a acompanhar valores em aberto."
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {pessoasOrdenadas.map((pessoa) => {
                const stats = getEstatisticasPessoa(pessoa);
                const isExpanded = pessoaExpandida === pessoa;
                const parcelasPessoa = parcelasAtivas.filter((p) => p.gasto.pessoa === pessoa);
                const larguraMes = (stats.emprestimosMes / escalaS) * 100;
                const larguraDivida = (stats.dividaAberta / escalaS) * 100;

                return (
                  <div key={pessoa} className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                    <div className="grid [grid-template-columns:190px_minmax(120px,1fr)_132px_116px_34px] gap-4 items-center py-3.5 hover:bg-[#FCFCFC] dark:hover:bg-white/[0.02] transition-colors">
                      {/* Pessoa */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 flex-shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                          <span className="font-display font-bold text-emerald-700 dark:text-emerald-400">
                            {pessoa.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{pessoa}</p>
                          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {stats.qtdItensMes} {stats.qtdItensMes === 1 ? "item" : "itens"} · {stats.qtdCobrancas} cobrança{stats.qtdCobrancas === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      {/* Barra empilhada — escala global S */}
                      <div className="flex h-[22px] rounded-md overflow-hidden bg-zinc-100 dark:bg-white/[0.04] min-w-0">
                        {larguraMes > 0 && <div className="h-full bg-emerald-500" style={{ width: `${larguraMes}%` }} />}
                        {larguraDivida > 0 && <div className="h-full bg-amber-500" style={{ width: `${larguraDivida}%` }} />}
                      </div>
                      {/* No mês */}
                      <div className="text-right min-w-0">
                        <p className="font-mono tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(stats.emprestimosMes)}</p>
                        <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">no mês</p>
                      </div>
                      {/* Em aberto */}
                      <div className="text-right min-w-0">
                        {stats.dividaAberta > 0 ? (
                          <>
                            <p className="font-mono tabular-nums text-sm font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">{formatCurrency(stats.dividaAberta)}</p>
                            <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">em aberto</p>
                          </>
                        ) : stats.fechado ? (
                          <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400">Fechado</span>
                        ) : stats.quitada ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-[11px] h-[11px]" /> Quitada
                          </span>
                        ) : (
                          <p className="font-mono tabular-nums text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{formatCurrency(0)}</p>
                        )}
                      </div>
                      {/* Expandir */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(pessoa)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Recolher" : "Expandir"} detalhes de ${pessoa}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {isExpanded ? <ChevronUp className="w-[15px] h-[15px]" /> : <ChevronDown className="w-[15px] h-[15px]" />}
                      </button>
                    </div>

                    {/* Linha expandida */}
                    {isExpanded && (
                      <div className="pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-2">Cobranças em aberto</p>
                            {stats.dividasPendentes.length === 0 ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma cobrança em aberto.</p>
                            ) : (
                              <div className="space-y-2">
                                {stats.dividasPendentes.map((d) => {
                                  const pago = Math.max(d.valor_original - d.valor_atual, 0);
                                  const pctPago = d.valor_original > 0 ? (pago / d.valor_original) * 100 : 0;
                                  return (
                                    <div key={d.id} className="bg-[#FCFCFC] dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] rounded-[14px] p-3.5">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{d.descricao}</p>
                                        <p className="font-mono tabular-nums text-sm font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">{formatCurrency(d.valor_atual)}</p>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden mt-2">
                                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(pctPago, 100)}%` }} />
                                      </div>
                                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                        pago {formatCurrency(pago)} de {formatCurrency(d.valor_original)} · {pctPago.toFixed(0)}%
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 mb-2 uppercase">Empréstimos de {mesNome}</p>
                            {parcelasPessoa.length === 0 ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum empréstimo neste mês.</p>
                            ) : (
                              <div className="space-y-2">
                                {parcelasPessoa.map(({ gasto, parcela_atual, valor_parcela }) => (
                                  <div key={gasto.id} className="bg-[#FCFCFC] dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] rounded-[14px] p-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{gasto.descricao}</p>
                                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                        parcela {parcela_atual}/{gasto.num_parcelas} · total {formatCurrency(gasto.valor_total)}
                                      </p>
                                    </div>
                                    <p className="font-mono tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(valor_parcela)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap" data-tour="devedores-item-acoes">
                          <button
                            onClick={() => setShowPagamentoParcial(pessoa)}
                            className="inline-flex items-center gap-2 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-[0_4px_12px_-3px_rgba(5,150,105,0.5)] transition-colors"
                          >
                            Registrar pagamento
                          </button>
                          <Link
                            to="/a-receber/mes"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors"
                          >
                            Ver lançamentos
                          </Link>
                          <button
                            onClick={() => handleDelete(pessoa)}
                            disabled={pessoas.length <= 1}
                            aria-label={`Excluir devedor ${pessoa}`}
                            title="Excluir devedor"
                            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                          >
                            <Trash2 className="w-[15px] h-[15px]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Nota: estoque × fluxo */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        empréstimos do mês é fluxo do período; dívida em aberto é saldo acumulado — somar os dois produz um número sem significado.
      </p>

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
