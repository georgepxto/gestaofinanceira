import { useState, useEffect, useCallback } from "react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation } from "react-router-dom";
import { Plus, Users, Wallet, CreditCard, Receipt, Gauge, PieChart as IconePizza, BarChart3 } from "lucide-react";
import { useAppContext } from "../context";
import { fixosAindaPorSair, saldoDaConta } from "../utils/saldo";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { SeletorMes } from "../components/ui/SeletorMes";
import { BalanceHero } from "../components/ui/BalanceHero";
import { ActionRow, type AcaoRapida } from "../components/ui/ActionRow";
import { KpiStrip, Kpi } from "../components/ui/KpiStrip";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Pill } from "../components/ui/Pill";
import { PontoCategoria } from "../components/ui/PontoCategoria";
import { EmptyState } from "../components/ui/EmptyState";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { useChartTheme, eixoDinheiro } from "../components/ui/chart";
import { useGuidedTour, usePageTutorialHelpButton, useIsMobile } from "../hooks";
import { useCategorias } from "../hooks/useCategorias";
import { supabase } from "../lib/supabase";
import { chaveMesPagamentoParcial, formatCurrency, isGastoAtivoNoMes } from "../utils/calculations";
import { categoriaDeGasto, corDaCategoria } from "../utils/categories";
import { formatDinheiro, formatPercent, MENOS } from "../utils/dinheiro";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";
import { TUTORIAL_TITLES } from "../utils/tutorial";
import type { MetaGasto } from "../types";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { ContaBancaria, SaldoDevedor, MeuGasto, Receita, Gasto } from "../types";

interface DashboardData {
  saldoTotal: number;
  totalDevido: number;
  gastosFixosMensais: number;
  receitasFixasMensais: number;
  saldoLivre: number;
  projecaoAnual: { mes: string; saldo: number }[];
  gastosPorCategoria: { categoria: string; valor: number }[];
  emprestadosPorPessoa: { pessoa: string; valor: number }[];
  emprestadosPorCategoria: { categoria: string; valor: number }[];
  totalGastosMesAtual: number;
  totalGastosMesAnterior: number;
  totalEmprestimosMesAtual: number;
  totalEmprestimosMesAnterior: number;
  gastosFixosMes: number;
  gastosVariaveisMes: number;
  totalPessoas: number;
  pessoasQuitadas: number;
  mediaGastosPorPessoa: number;
  economiasMes: number;
  top5Gastos: { descricao: string; valor: number; pessoa: string }[];
  top5MeusGastos: { descricao: string; valor: number; categoria: string }[];
  parcelasProximasFim: { descricao: string; pessoa: string; parcelasRestantes: number }[];
  tendenciaMensal: { mes: string; nome: string; meusGastos: number; compartilhados: number; total: number }[];
  metasGasto: (MetaGasto & { gastoAtual: number })[];
}

/** Tons esmeralda decrescentes das barras "Onde o dinheiro foi". */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface DashboardTutorialStep {
  target: string;
  alvo: string;
  titulo: string;
  descricao: string;
  placement?: "above" | "below";
}

const DASHBOARD_TUTORIAL_KEY = "dashboard_tutorial_seen_v1";

const DASHBOARD_TUTORIAL_STEPS: DashboardTutorialStep[] = [
  {
    target: "[data-tour='dashboard-header']",
    alvo: "Início",
    titulo: "O resumo do seu mês",
    descricao:
      "Aqui você vê em segundos quanto sobra, quanto tem a receber e para onde o dinheiro foi.",
    placement: "below",
  },
  {
    target: "[data-tour='month-selector']",
    alvo: "Seletor de mês",
    titulo: "Trocar o mês",
    descricao:
      "Use as setas para ver outro mês. Os números e as listas da tela acompanham.",
    placement: "below",
  },
  {
    target: "[data-tour='saldo-livre']",
    alvo: "Saldo livre",
    titulo: "Saldo livre",
    descricao:
      "O saldo das suas contas hoje, menos os gastos fixos que ainda vão sair neste mês. Fica vermelho quando o dinheiro não cobre os fixos.",
    placement: "below",
  },
  {
    target: "[data-tour='acoes-rapidas']",
    alvo: "Atalhos",
    titulo: "Atalhos",
    descricao:
      "Lance um gasto, divida uma conta, registre uma receita ou pague a fatura sem sair do Início.",
    placement: "below",
  },
  {
    target: "[data-tour='card-saldo-total-mini']",
    alvo: "Saldo total",
    titulo: "Saldo total",
    descricao:
      "A soma do saldo de todas as suas contas hoje, o mesmo número de Contas e receitas.",
    placement: "below",
  },
  {
    target: "[data-tour='card-a-receber']",
    alvo: "A receber",
    titulo: "A receber",
    descricao:
      "Quanto outras pessoas precisam te pagar neste mês, e quantas já acertaram.",
    placement: "below",
  },
  {
    target: "[data-tour='fluxo-mensal']",
    alvo: "Sobra mensal",
    titulo: "Sobra mensal",
    descricao:
      "Suas receitas fixas menos os gastos fixos. É o que sobra todo mês antes dos gastos do dia a dia.",
    placement: "below",
  },
  {
    target: "[data-tour='ultimos-gastos']",
    alvo: "Últimos lançamentos",
    titulo: "Últimos lançamentos",
    descricao:
      "Os gastos mais recentes do mês. Toque em \"Ver todos\" para a lista completa.",
  },
  {
    target: "[data-tour='metas-section']",
    alvo: "Metas do mês",
    titulo: "Metas do mês",
    descricao:
      "Quanto já foi de cada meta. O aviso aparece quando uma categoria passa de 80% do limite.",
  },
  {
    target: "[data-tour='grafico-mensal']",
    alvo: "Gastos dos últimos 6 meses",
    titulo: "Últimos 6 meses",
    descricao:
      "Compare os meses. Alterne entre os seus gastos e os compartilhados.",
  },
  {
    target: "[data-tour='help-button']",
    alvo: "Botão de ajuda",
    titulo: "Precisa rever?",
    descricao:
      "Toque no (?) no topo da tela sempre que quiser ver este tutorial de novo.",
  },
];

export const DashboardPage = () => {
  const { user, mesVisualizacao } = useAppContext();
  const {
    features,
    isAdmin,
    setShowFormMeuGasto,
    setFormMeuGasto,
    formMeuGasto,
  } = useAppContext();
  const isMobile = useIsMobile();
  const grafico = useChartTheme();
  const { categorias } = useCategorias("gasto");
  const [serie, setSerie] = useState<"meusGastos" | "compartilhados">("meusGastos");
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<DashboardData>({
    saldoTotal: 0,
    totalDevido: 0,
    gastosFixosMensais: 0,
    receitasFixasMensais: 0,
    saldoLivre: 0,
    projecaoAnual: [],
    gastosPorCategoria: [],
    emprestadosPorPessoa: [],
    emprestadosPorCategoria: [],
    totalGastosMesAtual: 0,
    totalGastosMesAnterior: 0,
    totalEmprestimosMesAtual: 0,
    totalEmprestimosMesAnterior: 0,
    gastosFixosMes: 0,
    gastosVariaveisMes: 0,
    // Novas métricas
    totalPessoas: 0,
    pessoasQuitadas: 0,
    mediaGastosPorPessoa: 0,
    economiasMes: 0,
    top5Gastos: [],
    top5MeusGastos: [],
    parcelasProximasFim: [],
    tendenciaMensal: [],
    metasGasto: [],
  });
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
  } = useGuidedTour<DashboardTutorialStep>({
    steps: DASHBOARD_TUTORIAL_STEPS,
    storageKey: DASHBOARD_TUTORIAL_KEY,
    ready: !loading,
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial do Início",
    ariaLabel: "Ver tutorial do Início",
    dataTour: "help-button",
  });

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || !user) return;
    
    setLoading(true);
    setLoadError(null);
    try {
      // Buscar todos os dados em paralelo para acelerar o carregamento
      const [
        { data: contas },
        { data: saldosDevedores },
        { data: meusGastos },
        { data: receitas },
        { data: gastosCompartilhados }
      ] = await Promise.all([
        supabase.from("contas_bancarias").select("*"),
        supabase.from("saldos_devedores").select("*"),
        supabase.from("meus_gastos").select("*"),
        supabase.from("receitas").select("*"),
        supabase.from("gastos").select("*"),
      ]);

      // Saldo de hoje, pela mesma conta que Contas usa (utils/saldo).
      const todosMeusGastos = (meusGastos as MeuGasto[]) || [];
      const todosFixos = todosMeusGastos.filter((g) => g.categoria === "fixo");
      const saldoTotal = ((contas as ContaBancaria[]) || []).reduce(
        (acc, c) =>
          acc + saldoDaConta(c, { receitas: (receitas as Receita[]) || [], gastosFixos: todosFixos, meusGastos: todosMeusGastos }),
        0
      );

      // Calcular total devido (saldos devedores ativos)
      const totalDevido = (saldosDevedores as SaldoDevedor[] || [])
        .filter(s => (s.valor_atual || 0) > 0)
        .reduce((acc, s) => acc + (s.valor_atual || 0), 0);

      // Calcular gastos fixos mensais
      const gastosFixos = (meusGastos as MeuGasto[] || [])
        .filter(g => g.categoria === "fixo" && g.ativo !== false);
      const gastosFixosMensais = gastosFixos.reduce((acc, g) => acc + g.valor, 0);

      // Calcular receitas fixas mensais
      const receitasFixas = (receitas as Receita[] || [])
        .filter(r => r.tipo === "fixo" || r.tipo === "recorrente");
      const receitasFixasMensais = receitasFixas.reduce((acc, r) => acc + r.valor, 0);

      // Saldo livre: o saldo de hoje menos os fixos do mês que ainda vão sair.
      const saldoLivre = saldoTotal - fixosAindaPorSair(todosFixos);

      // Projeção anual (próximos 12 meses)
      const mesAtual = new Date().getMonth();
      const projecaoAnual = [];
      let saldoProjetado = saldoTotal;
      const fluxoMensal = receitasFixasMensais - gastosFixosMensais;

      for (let i = 0; i < 12; i++) {
        const mesIndex = (mesAtual + i) % 12;
        projecaoAnual.push({
          mes: MESES[mesIndex],
          saldo: Math.round(saldoProjetado),
        });
        saldoProjetado += fluxoMensal;
      }
      // Gastos por categoria (mês selecionado)
      const mesAtualFiltro = format(mesVisualizacao, "yyyy-MM");
      const gastosDoMes = (meusGastos as MeuGasto[] || [])
        .filter(g => {
          const mesGasto = g.data.substring(0, 7);
          return mesGasto === mesAtualFiltro;
        });


      const categoriaMap = new Map<string, number>();
      gastosDoMes.forEach(g => {
        const cat = categoriaDeGasto(g);
        categoriaMap.set(cat, (categoriaMap.get(cat) || 0) + g.valor);
      });
      
      const gastosPorCategoria = Array.from(categoriaMap.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);

      // Usar gastos compartilhados já buscados no Promise.all
      // Filtrar gastos ativos no mês selecionado
      const gastosCompartilhadosDoMes = (gastosCompartilhados as Gasto[] || [])
        .filter(g => isGastoAtivoNoMes(g, mesVisualizacao));
      
      const pessoaMap = new Map<string, number>();
      gastosCompartilhadosDoMes.forEach(g => {
        // Usar valor da parcela em vez de valor total
        const valorParcela = g.valor_total / g.num_parcelas;
        pessoaMap.set(g.pessoa, (pessoaMap.get(g.pessoa) || 0) + valorParcela);
      });
      
      const emprestadosPorPessoa = Array.from(pessoaMap.entries())
        .map(([pessoa, valor]) => ({ pessoa, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);

      // Calcular empréstimos por categoria (do mês selecionado)
      const categoriaEmprestimosMap = new Map<string, number>();
      gastosCompartilhadosDoMes.forEach(g => {
        const cat = categoriaDeGasto(g);
        const valorParcela = g.valor_total / g.num_parcelas;
        categoriaEmprestimosMap.set(cat, (categoriaEmprestimosMap.get(cat) || 0) + valorParcela);
      });
      
      const emprestadosPorCategoria = Array.from(categoriaEmprestimosMap.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);

      // Calcular totais para tendência
      const totalGastosMesAtual = gastosDoMes.reduce((acc, g) => acc + g.valor, 0);
      const totalEmprestimosMesAtual = gastosCompartilhadosDoMes.reduce((acc, g) => acc + g.valor_total / g.num_parcelas, 0);

      // Calcular gastos do mês anterior
      const mesAnterior = subMonths(mesVisualizacao, 1);
      const inicioMesAnterior = startOfMonth(mesAnterior);
      const fimMesAnterior = endOfMonth(mesAnterior);
      
      const gastosDoMesAnterior = (meusGastos as MeuGasto[] || [])
        .filter(g => {
          const dataGasto = parseISO(g.data);
          return dataGasto >= inicioMesAnterior && dataGasto <= fimMesAnterior;
        });
      
      const gastosCompartilhadosDoMesAnterior = (gastosCompartilhados as Gasto[] || [])
        .filter(g => isGastoAtivoNoMes(g, mesAnterior));
      
      const totalGastosMesAnterior = gastosDoMesAnterior.reduce((acc, g) => acc + g.valor, 0);
      const totalEmprestimosMesAnterior = gastosCompartilhadosDoMesAnterior.reduce((acc, g) => acc + g.valor_total / g.num_parcelas, 0);

      // Calcular gastos fixos vs variáveis do mês (de "Meus Gastos")
      // Gastos fixos ativos são recorrentes, então sempre contam
      const gastosFixosAtivos = (meusGastos as MeuGasto[] || [])
        .filter(g => g.categoria === 'fixo' && g.ativo !== false);
      const gastosFixosMes = gastosFixosAtivos.reduce((acc, g) => acc + g.valor, 0);
      
      // Gastos variáveis (pessoais) do mês atual
      const gastosVariaveisMes = gastosDoMes
        .filter(g => g.categoria === 'pessoal')
        .reduce((acc, g) => acc + g.valor, 0);

      // NOVAS MÉTRICAS

      // 1. Buscar pagamentos parciais para calcular taxa de quitação
      const { data: pagamentosParciais } = await supabase
        .from("pagamentos_parciais")
        .select("*")
        .eq("mes", chaveMesPagamentoParcial(mesVisualizacao));
      
      // Pessoas únicas que têm gastos no mês
      const pessoasComGastos = new Set(gastosCompartilhadosDoMes.map(g => g.pessoa));
      const totalPessoas = pessoasComGastos.size;
      
      // Verificar quais pessoas quitaram (pagaram tudo ou não têm gastos restantes)
      const pagamentosPorPessoa = new Map<string, number>();
      (pagamentosParciais || []).forEach((p: { pessoa: string; valor: number }) => {
        pagamentosPorPessoa.set(p.pessoa, (pagamentosPorPessoa.get(p.pessoa) || 0) + p.valor);
      });
      
      let pessoasQuitadas = 0;
      pessoasComGastos.forEach(pessoa => {
        const totalGastosPessoa = gastosCompartilhadosDoMes
          .filter(g => g.pessoa === pessoa)
          .reduce((acc, g) => acc + g.valor_total / g.num_parcelas, 0);
        const totalPago = pagamentosPorPessoa.get(pessoa) || 0;
        if (totalPago >= totalGastosPessoa) {
          pessoasQuitadas++;
        }
      });
      
      // 2. Média de gastos por pessoa
      const mediaGastosPorPessoa = totalPessoas > 0 
        ? totalEmprestimosMesAtual / totalPessoas 
        : 0;

      // 3. Economias do mês (receitas fixas - gastos totais)
      // Usando receitas fixas mensais, pois são as previsíveis
      const economiasMes = receitasFixasMensais - totalGastosMesAtual - totalEmprestimosMesAtual;

      // 4. Top 5 gastos do mês (gastos compartilhados)
      const top5Gastos = gastosCompartilhadosDoMes
        .map(g => ({
          descricao: g.descricao,
          valor: g.valor_total / g.num_parcelas,
          pessoa: g.pessoa,
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Top 5 meus gastos pessoais do mês
      const top5MeusGastos = gastosDoMes
        .map(g => ({
          descricao: g.descricao || 'Sem descrição',
          valor: g.valor,
          categoria: categoriaDeGasto(g),
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // 5. Parcelas próximas do fim (restam 1-3 parcelas)
      // Calcular parcela atual baseado na data_inicio e mês atual
      
      const parcelasProximasFim = (gastosCompartilhados as Gasto[] || [])
        .map(g => {
          const dataInicio = parseISO(g.data_inicio);
          const mesesDesdeInicio = Math.floor(
            (new Date().getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          const parcelaAtual = Math.min(mesesDesdeInicio + 1, g.num_parcelas);
          const parcelasRestantes = g.num_parcelas - parcelaAtual;
          return {
            descricao: g.descricao,
            pessoa: g.pessoa,
            parcelasRestantes,
            parcelaAtual,
          };
        })
        .filter(g => g.parcelasRestantes > 0 && g.parcelasRestantes <= 3)
        .sort((a, b) => a.parcelasRestantes - b.parcelasRestantes)
        .slice(0, 5);

      // 6. Tendência mensal (6 meses)
      const tendenciaMensal = [];
      for (let i = 5; i >= 0; i--) {
        const mesRef = subMonths(mesVisualizacao, i);
        const mesKey = format(mesRef, "yyyy-MM");
        const mesLabel = format(mesRef, "MMM", { locale: ptBR });
        
        const meusGastosMes = (meusGastos as MeuGasto[] || [])
          .filter(g => g.data.substring(0, 7) === mesKey)
          .reduce((acc, g) => acc + g.valor, 0);
        
        const compartilhadosMes = (gastosCompartilhados as Gasto[] || [])
          .filter(g => isGastoAtivoNoMes(g, mesRef))
          .reduce((acc, g) => acc + g.valor_total / g.num_parcelas, 0);
        
        tendenciaMensal.push({
          mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
          nome: format(mesRef, "MMMM", { locale: ptBR }),
          meusGastos: Number(meusGastosMes.toFixed(2)),
          compartilhados: Number(compartilhadosMes.toFixed(2)),
          total: Number((meusGastosMes + compartilhadosMes).toFixed(2)),
        });
      }

      // 7. Metas de gasto por categoria
      const { data: metasRaw } = await supabase
        .from("metas_gasto")
        .select("*");
      
      const metasGasto = (metasRaw || []).map((meta: MetaGasto) => {
        const gastoAtual = gastosDoMes
          .filter(g => categoriaDeGasto(g).toLowerCase() === meta.categoria.toLowerCase())
          .reduce((acc, g) => acc + g.valor, 0);
        return { ...meta, gastoAtual };
      });


      setData({
        saldoTotal,
        totalDevido,
        gastosFixosMensais,
        receitasFixasMensais,
        saldoLivre,
        projecaoAnual,
        gastosPorCategoria,
        emprestadosPorPessoa,
        emprestadosPorCategoria,
        totalGastosMesAtual,
        totalGastosMesAnterior,
        totalEmprestimosMesAtual,
        totalEmprestimosMesAnterior,
        gastosFixosMes,
        gastosVariaveisMes,
        // Novas métricas
        totalPessoas,
        pessoasQuitadas,
        mediaGastosPorPessoa,
        economiasMes,
        top5Gastos,
        top5MeusGastos,
        parcelasProximasFim,
        tendenciaMensal,
        metasGasto,
      });
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
      setLoadError(toActionableErrorMessage(err, "Não foi possível carregar os indicadores da dashboard."));
    } finally {
      setLoading(false);
    }
  }, [user, mesVisualizacao]);

  // Refresh ao montar o componente (quando navega de volta)
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [location.pathname]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, mesVisualizacao, refreshKey]);

  if (loading) {
    return (
      <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
        <PageLoadingState title="Carregando o início" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
        <PageErrorState
          title="Não foi possível carregar o início"
          description={loadError}
          onAction={() => fetchDashboardData()}
          actionLabel="Tentar de novo"
        />
      </div>
    );
  }

  const nomeDoMes = format(mesVisualizacao, "MMMM", { locale: ptBR });
  const primeiroNome = user?.user_metadata?.nome?.split(" ")[0] || "";
  const sobraMensal = data.receitasFixasMensais - data.gastosFixosMensais;
  const variacaoGastos =
    data.totalGastosMesAnterior > 0
      ? (data.totalGastosMesAtual - data.totalGastosMesAnterior) / data.totalGastosMesAnterior
      : null;

  // Atalhos logo abaixo do saldo. Cada um só aparece se a pessoa tem a área.
  const pode = (f: keyof typeof features) => isAdmin || features[f];
  const acoes: AcaoRapida[] = [
    ...(pode("meus_gastos")
      ? [
          { rotulo: "Lançar gasto", Icone: Plus, onClick: () => setShowFormMeuGasto(true) },
          {
            rotulo: "Dividir",
            Icone: Users,
            onClick: () => {
              setFormMeuGasto({ ...formMeuGasto, categoria: "dividido" });
              setShowFormMeuGasto(true);
            },
          },
        ]
      : []),
    ...(pode("contas_bancarias") ? [{ rotulo: "Nova receita", Icone: Wallet, to: "/carteira/contas?receita=1" }] : []),
    ...(pode("cartoes_credito") ? [{ rotulo: "Pagar fatura", Icone: CreditCard, to: "/carteira/cartoes?pagar=1" }] : []),
  ];

  const totalCategorias = data.gastosPorCategoria.reduce((acc, c) => acc + c.valor, 0);
  const topCategorias = data.gastosPorCategoria.slice(0, 6);
  const maxCategoria = Math.max(...topCategorias.map((c) => c.valor), 1);
  // Um mês só não é tendência: cinco colunas vazias e uma cheia não dizem nada.
  const mesesComDado = data.tendenciaMensal.filter((m) => (Number(m[serie]) || 0) > 0);
  const { ticks, domain } = eixoDinheiro(data.tendenciaMensal.map((m) => Number(m[serie]) || 0));

  return (
    <div className={`${PAGE_CONTAINER_RELATIVE_CLASS} pb-20`}>
      {/* 1. Saudação e mês — não é mais um título gigante. */}
      <div className="flex items-center justify-between gap-4 flex-wrap" data-tour="dashboard-header">
        <p className="text-[15px] text-fg-2">{primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}</p>
        <SeletorMes data-tour="month-selector" />
      </div>

      {/* 2. Saldo livre, e 3. atalhos. */}
      <BalanceHero
        rotulo="Saldo livre"
        valor={data.saldoLivre}
        contexto={
          <>
            Seu saldo hoje, menos os fixos que ainda saem em {format(new Date(), "MMMM", { locale: ptBR })}
          </>
        }
        data-tour="saldo-livre"
      >
        {acoes.length > 0 && (
          <div className="mt-6 md:mt-8" data-tour="acoes-rapidas">
            <ActionRow acoes={acoes} />
          </div>
        )}
      </BalanceHero>

      {/* 4. Indicadores */}
      <KpiStrip>
        <Kpi
          rotulo="Saldo total"
          data-tour="card-saldo-total-mini"
          valor={<AnimatedNumber valor={data.saldoTotal} className={`text-[20px] ${data.saldoTotal < 0 ? "text-danger-ink" : ""}`} />}
        />
        <Kpi
          rotulo="A receber"
          data-tour="card-a-receber"
          valor={<AnimatedNumber valor={data.totalEmprestimosMesAtual} className="text-[20px]" />}
          meta={
            data.totalPessoas > 0
              ? `${data.pessoasQuitadas} de ${data.totalPessoas} ${data.totalPessoas === 1 ? "acertou" : "acertaram"}`
              : undefined
          }
        />
        <Kpi
          rotulo="Meus gastos"
          valor={<AnimatedNumber valor={data.totalGastosMesAtual} className="text-[20px]" />}
          meta={
            variacaoGastos !== null
              ? `${variacaoGastos >= 0 ? "+" : MENOS}${formatPercent(Math.abs(variacaoGastos))} que no mês passado`
              : undefined
          }
        />
        <Kpi
          rotulo="Sobra mensal"
          data-tour="fluxo-mensal"
          valor={
            <AnimatedNumber
              valor={sobraMensal}
              positivo
              className={`text-[20px] ${sobraMensal < 0 ? "text-danger-ink" : ""}`}
            />
          }
          meta={
            <span>
              <span className="valor">{formatCurrency(data.receitasFixasMensais)}</span> entram,{" "}
              <span className="valor">
                {formatCurrency(data.gastosFixosMensais)}
              </span>{" "}
              fixos
            </span>
          }
        />
      </KpiStrip>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
        {/* 5. Últimos lançamentos */}
        <Surface as="section" data-tour="ultimos-gastos">
          <SurfaceHeader
            titulo="Últimos lançamentos"
            className="mb-1"
            acao={
              data.top5MeusGastos.length > 0 ? (
                <Link to="/gastos/lancamentos" className="inline-flex items-center min-h-[44px] -my-3 md:min-h-0 md:my-0 hover:text-fg transition-colors">
                  Ver todos
                </Link>
              ) : undefined
            }
          />
          {data.top5MeusGastos.length > 0 ? (
            <ListGroup>
              {data.top5MeusGastos.slice(0, 5).map((gasto, i) => (
                <ListRow
                  key={i}
                  icone={<PontoCategoria cor={corDaCategoria(gasto.categoria, categorias)} />}
                  titulo={gasto.descricao}
                  meta={<span className="capitalize">{gasto.categoria}</span>}
                  valor={formatDinheiro(-gasto.valor)}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState Icone={Receipt} frase="Nenhum gasto neste mês ainda." compacto />
          )}
        </Surface>

        {/* 6. Metas do mês */}
        <Surface as="section" data-tour="metas-section">
          <SurfaceHeader
            titulo="Metas do mês"
            acao={
              data.metasGasto.length > 0 ? (
                <Link to="/gastos/metas" className="inline-flex items-center min-h-[44px] -my-3 md:min-h-0 md:my-0 hover:text-fg transition-colors">
                  Ver metas
                </Link>
              ) : undefined
            }
          />
          {data.metasGasto.length > 0 ? (
            <ul className="space-y-5">
              {data.metasGasto.map((meta) => {
                const fracao = meta.limite > 0 ? meta.gastoAtual / meta.limite : 0;
                return (
                  <li key={meta.id}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="flex items-center gap-2 min-w-0 text-sm text-fg">
                        <PontoCategoria cor={corDaCategoria(meta.categoria, categorias)} />
                        <span className="capitalize break-words">{meta.categoria}</span>
                      </span>
                      {fracao > 1 ? (
                        <Pill tom="perigo">estourou</Pill>
                      ) : fracao >= 0.8 ? (
                        <Pill tom="atencao">quase no limite</Pill>
                      ) : null}
                    </div>
                    <ProgressBar
                      valor={meta.gastoAtual}
                      maximo={meta.limite}
                      rotulo={`${meta.categoria}: ${formatPercent(fracao)} do limite`}
                    />
                    <p className="mt-1.5 valor text-xs text-fg-2">
                      {formatCurrency(meta.gastoAtual)} de {formatCurrency(meta.limite)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState Icone={Gauge} frase="Nenhuma meta definida." detalhe="Crie metas por categoria em Gastos, Metas." compacto />
          )}
        </Surface>

        {/* 7. Onde o dinheiro foi */}
        <Surface as="section">
          <SurfaceHeader titulo="Onde o dinheiro foi" acao={<span className="capitalize text-fg-3">{nomeDoMes}</span>} />
          {topCategorias.length > 0 ? (
            <ul className="space-y-4">
              {topCategorias.map((cat) => {
                const cor = corDaCategoria(cat.categoria, categorias);
                return (
                  <li key={cat.categoria}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="flex items-center gap-2 min-w-0 text-sm text-fg">
                        <PontoCategoria cor={cor} />
                        <span className="capitalize break-words">{cat.categoria}</span>
                      </span>
                      <span className="valor text-xs text-fg-2">
                        {formatCurrency(cat.valor)} · {totalCategorias > 0 ? formatPercent(cat.valor / totalCategorias) : "0%"}
                      </span>
                    </div>
                    <div className="h-1 bg-surface-3" aria-hidden="true">
                      <div className="h-full" style={{ width: `${(cat.valor / maxCategoria) * 100}%`, backgroundColor: cor }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState Icone={IconePizza} frase="Sem gastos por categoria neste mês." compacto />
          )}
        </Surface>

        {/* 8. Últimos 6 meses */}
        <Surface as="section" className="min-w-0" data-tour="grafico-mensal">
          <SurfaceHeader
            titulo="Gastos dos últimos 6 meses"
            acao={
              <span>
                <SegmentedControl
                  rotulo="Série do gráfico"
                  tamanho="sm"
                  segmentos={[
                    { chave: "meus", rotulo: "Meus", ativo: serie === "meusGastos", onClick: () => setSerie("meusGastos") },
                    {
                      chave: "comp",
                      rotulo: "Compartilhados",
                      ativo: serie === "compartilhados",
                      onClick: () => setSerie("compartilhados"),
                    },
                  ]}
                />
              </span>
            }
          />
          {mesesComDado.length >= 2 ? (
            <div className="h-48 md:h-56">
              {/* initialDimension: o ResponsiveContainer da v3 nasce com -1×-1 e
                  só mede um quadro depois (recharts #6716). */}
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 500, height: 224 }}>
                <BarChart data={data.tendenciaMensal} margin={{ top: 4, left: 0, right: 0, bottom: 0 }}>
                  <CartesianGrid {...grafico.grid} />
                  <XAxis dataKey="mes" {...grafico.eixoX} />
                  <YAxis {...grafico.eixoY} ticks={ticks} domain={domain} hide={isMobile} />
                  <Tooltip
                    {...grafico.tooltip}
                    formatter={(v) => [formatCurrency(Number(v) || 0), serie === "meusGastos" ? "Meus gastos" : "Compartilhados"]}
                  />
                  <Bar dataKey={serie} radius={[2, 2, 0, 0]} maxBarSize={44}>
                    {data.tendenciaMensal.map((_, i) => (
                      <Cell key={i} fill={i === data.tendenciaMensal.length - 1 ? grafico.cores.fg : grafico.cores.fg3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              Icone={BarChart3}
              frase={
                mesesComDado.length === 1
                  ? `Seu histórico começa em ${mesesComDado[0].nome}.`
                  : "Sem gastos nos últimos meses."
              }
              detalhe={mesesComDado.length === 1 ? "A comparação aparece a partir do segundo mês." : undefined}
              compacto
            />
          )}
        </Surface>
      </div>

      <GuidedTourOverlay
        show={showTutorial}
        tutorialTitle={TUTORIAL_TITLES.dashboard}
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
