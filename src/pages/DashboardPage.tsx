import { useState, useEffect, useCallback, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAppContext } from "../context";
import { useTheme } from "../hooks/useTheme";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { Valor } from "../components/ui/Valor";
import { PageHeader } from "../components/ui/PageHeader";
import { SeletorMes } from "../components/ui/SeletorMes";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { chaveMesPagamentoParcial, formatCurrency, isGastoAtivoNoMes } from "../utils/calculations";
import { categoriaDeGasto } from "../utils/categories";
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
  Area,
  AreaChart,
  LabelList,
} from "recharts";
import type { ContaBancaria, SaldoDevedor, MeuGasto, Receita, Gasto } from "../types";
import { Rotulo } from "../components/ui/Rotulo";
import { Card } from "../components/ui/Card";

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
  tendenciaMensal: { mes: string; meusGastos: number; compartilhados: number; total: number }[];
  metasGasto: (MetaGasto & { gastoAtual: number })[];
}

/** Tons esmeralda decrescentes das barras "Onde o dinheiro foi". */
const TONS_CATEGORIA = ["bg-emerald-600", "bg-emerald-500", "bg-emerald-400", "bg-emerald-300", "bg-emerald-300"];

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
    alvo: "Cabeçalho da dashboard",
    titulo: "Visão geral da Dashboard",
    descricao:
      "Esta tela resume sua vida financeira em um só lugar: saldos, valores a receber, metas e tendências.",
    placement: "below",
  },
  {
    target: "[data-tour='month-selector']",
    alvo: "Seletor de mês",
    titulo: "Seletor de mês",
    descricao:
      "Use as setas no topo para trocar o mês analisado. Os cartões e gráficos se atualizam automaticamente.",
    placement: "below",
  },
  {
    target: "[data-tour='card-saldo-total']",
    alvo: "Saldo Total",
    titulo: "Saldo total disponível",
    descricao:
      "Mostra o total somado de todas as suas contas bancárias. É o dinheiro que está realmente disponível agora.",
    placement: "below",
  },
  {
    target: "[data-tour='card-a-receber']",
    alvo: "A Receber",
    titulo: "Valores a receber neste mês",
    descricao:
      "Este cartão mostra quanto outras pessoas precisam te pagar neste mês. É a soma dos gastos compartilhados do período.",
    placement: "below",
  },
  {
    target: "[data-tour='card-receitas-fixas']",
    alvo: "Receitas Fixas",
    titulo: "Receitas fixas mensais",
    descricao:
      "Aqui entram as entradas recorrentes, como salários ou rendas fixas. Elas ajudam a projetar seu saldo futuro.",
    placement: "below",
  },
  {
    target: "[data-tour='card-gastos-fixos']",
    alvo: "Gastos Fixos",
    titulo: "Gastos fixos do mês",
    descricao:
      "São despesas recorrentes que acontecem todo mês, como aluguel, internet ou assinatura.",
    placement: "below",
  },
  {
    target: "[data-tour='fluxo-mensal']",
    alvo: "Fluxo mensal",
    titulo: "Fluxo mensal",
    descricao:
      "Mostra a diferença entre receitas e gastos fixos. Se ficar positivo, sobra dinheiro no mês.",
  },
  {
    target: "[data-tour='saldo-livre']",
    alvo: "Saldo livre",
    titulo: "Saldo livre",
    descricao:
      "É o que sobra depois dos gastos fixos. Ajuda a entender quanto você realmente pode usar.",
  },
  {
    target: "[data-tour='grafico-mensal']",
    alvo: "Gráfico mensal",
    titulo: "Meus gastos por mês",
    descricao:
      "Esse gráfico mostra a evolução dos seus gastos pessoais nos últimos meses.",
  },
  {
    target: "[data-tour='ultimos-gastos']",
    alvo: "Últimos gastos",
    titulo: "Últimos lançamentos",
    descricao:
      "Aqui aparecem os gastos pessoais mais recentes e os valores de cada um.",
  },
  {
    target: "[data-tour='trend-6meses-meus']",
    alvo: "Tendência de gastos",
    titulo: "Tendência de 6 meses",
    descricao:
      "Esse gráfico mostra como seus gastos evoluíram ao longo dos últimos 6 meses.",
  },
  {
    target: "[data-tour='trend-6meses-compartilhados']",
    alvo: "Compartilhados 6 meses",
    titulo: "Gastos compartilhados",
    descricao:
      "Mostra a tendência dos valores a receber de gastos compartilhados nos últimos 6 meses.",
  },
  {
    target: "[data-tour='metas-section']",
    alvo: "Metas de gasto",
    titulo: "Metas e alertas",
    descricao:
      "Monitore metas por categoria e identifique rapidamente onde está perto de estourar o limite.",
  },
  {
    target: "[data-tour='help-button']",
    alvo: "Botão de ajuda",
    titulo: "Precisa rever?",
    descricao:
      "Clique no botão (?) no topo da Dashboard sempre que quiser abrir este tutorial novamente.",
  },
];

export const DashboardPage = () => {
  const { user, mesVisualizacao } = useAppContext();
  const { theme } = useTheme();
  const location = useLocation();

  // Recharts não lê classes do Tailwind — os neutros da marca entram como hex,
  // trocados pelo tema para a grade não gritar mais que os dados no dark.
  const isDark = theme === "dark";
  const chartGrid = isDark ? "rgba(255,255,255,0.07)" : "#F4F4F5";
  const chartAxis = isDark ? "#71717A" : "#A1A1AA";

  // A série secundária é neutra: precisa recuar do fundo, e "recuar" troca de
  // direção entre os temas — zinc-300 sobre branco, zinc-600 sobre preto. Com o
  // valor claro fixo ela ficava mais chamativa que a série principal em
  // esmeralda, invertendo a hierarquia do gráfico.
  const chartNeutro = isDark ? "#52525B" : "#D4D4D8";

  // Esmeralda também sobe um degrau no escuro: emerald-700 sobre preto vira
  // verde barroso e o destaque do mês corrente se perde.
  const chartBarra = isDark ? "#10B981" : "#059669";       // emerald-500 / 600
  const chartBarraAtual = isDark ? "#34D399" : "#047857";  // emerald-400 / 700

  // 18% de esmeralda quase não aparece sobre preto.
  const chartAreaTopo = isDark ? 0.28 : 0.18;

  // ds-ok: o hex abaixo aparece citado, não usado — é o padrão do recharts.
  // O cursor do recharts é `#ccc` por padrão — no escuro, uma laje branca atrás
  // da barra apontada, mais forte que o dado que ela realça. Realce afunda:
  // escurece sobre o cartão em vez de clarear.
  const chartCursor = isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.04)";

  const tooltipStyle = useMemo(() => isDark
    ? { backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", boxShadow: "0 4px 24px -4px rgba(0,0,0,0.5)", fontSize: "12px", color: "#FAFAFA" }
    : { backgroundColor: "#FFFFFF", border: "1px solid #E4E4E7", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: "12px" },
    [isDark]
  );
  const tooltipLabelStyle = useMemo(() => isDark ? { color: "#FAFAFA", fontWeight: 600 } : { color: "#18181B", fontWeight: 600 }, [isDark]);
  const tooltipItemStyle = useMemo(() => isDark ? { color: "#F4F4F5" } : { color: "#27272A" }, [isDark]);
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
  });

  usePageTutorialHelpButton({
    onClick: openTutorial,
    title: "Ver tutorial da dashboard",
    ariaLabel: "Ver tutorial da dashboard",
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

      // Calcular saldo total
      const saldoTotal = (contas as ContaBancaria[] || []).reduce(
        (acc, c) => acc + (c.saldo_atual || c.saldo_inicial || 0), 
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

      // Saldo livre (saldo - gastos fixos do mês)
      const saldoLivre = saldoTotal - gastosFixosMensais;

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
          const dataGasto = new Date(g.data);
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
          const dataInicio = new Date(g.data_inicio);
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
    return <PageLoadingState title="Carregando dashboard" description="Estamos calculando os principais indicadores do mês." />;
  }

  if (loadError) {
    return (
      <PageErrorState
        title="Não foi possível carregar a dashboard"
        description={loadError}
        onAction={() => fetchDashboardData()}
        actionLabel="Recarregar indicadores"
      />
    );
  }

  return (
    <div className={`${PAGE_CONTAINER_RELATIVE_CLASS} pb-20`}>
      {/* HEADER_PAGINA */}
      <PageHeader
        data-tour="dashboard-header"
        eyebrow={<>Painel · <span className="capitalize">{format(mesVisualizacao, "MMMM", { locale: ptBR })}</span></>}
        title={<>Olá, {user?.user_metadata?.nome?.split(' ')[0] || 'Usuário'}</>}
        description="Sua vida financeira inteira num só lugar."
        action={<SeletorMes data-tour="month-selector" />}
      />

      {/* Card Herói: Saldo livre + Fluxo do mês */}
      {(() => {
        const sobraMensal = data.receitasFixasMensais - data.gastosFixosMensais;
        const maxFluxo = Math.max(data.receitasFixasMensais, data.gastosFixosMensais, 1);
        const variacaoGastos = data.totalGastosMesAnterior > 0
          ? ((data.totalGastosMesAtual - data.totalGastosMesAnterior) / data.totalGastosMesAnterior) * 100
          : null;
        return (
          <Card padding="resumo" className="grid grid-cols-1 lg:[grid-template-columns:1.15fr_1px_0.85fr] gap-8" data-tour="card-saldo-total">
            {/* Esquerda: Saldo livre */}
            <div className="min-w-0" data-tour="saldo-livre">
              <Rotulo>Saldo livre · Disponível agora</Rotulo>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <Valor porte="heroi" className={data.saldoLivre >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-red-600 dark:text-red-400'}>
                  {formatCurrency(data.saldoLivre)}
                </Valor>
                {variacaoGastos !== null && (
                  <span className="inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {variacaoGastos <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {variacaoGastos >= 0 ? '+' : ''}{variacaoGastos.toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
                É o que sobra do seu saldo depois dos gastos fixos do mês.
              </p>
              {/* Piso de 172px: em Geist Mono 22px o valor mede ~158, e `.valor`
                  não quebra linha — a 140 ele vazava por cima do vizinho na largura
                  em que cabiam exatamente três colunas. */}
              <div className="border-t border-zinc-100 dark:border-white/[0.05] mt-5 pt-5 grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(172px,1fr))]">
                <div className="min-w-0" data-tour="card-saldo-total-mini">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Saldo total</p>
                  <Valor porte="medio" className="block mt-0.5 text-zinc-900 dark:text-zinc-50">{formatCurrency(data.saldoTotal)}</Valor>
                </div>
                <div className="min-w-0" data-tour="card-a-receber">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">A receber</p>
                  <Valor porte="medio" className="block mt-0.5 text-zinc-900 dark:text-zinc-50">{formatCurrency(data.totalEmprestimosMesAtual)}</Valor>
                  {/* Sem ninguém com gasto compartilhado no mês, "0 de 0" é ruído: a linha some. */}
                  {data.totalPessoas > 0 && (
                    <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {data.pessoasQuitadas} de {data.totalPessoas} {data.totalPessoas === 1 ? "acertou" : "acertaram"}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Meus gastos</p>
                  <Valor porte="medio" className="block mt-0.5 text-zinc-900 dark:text-zinc-50">{formatCurrency(data.totalGastosMesAtual)}</Valor>
                </div>
              </div>
            </div>

            {/* Divisória */}
            <div className="hidden lg:block bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />

            {/* Direita: Fluxo do mês */}
            <div className="min-w-0" data-tour="fluxo-mensal">
              <Rotulo className="mb-4">Fluxo do mês</Rotulo>
              <div className="space-y-3">
                <div data-tour="card-receitas-fixas">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">Receitas fixas</span>
                    <span className="font-mono valor text-zinc-900 dark:text-zinc-100">{formatCurrency(data.receitasFixasMensais)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(data.receitasFixasMensais / maxFluxo) * 100}%` }} />
                  </div>
                </div>
                <div data-tour="card-gastos-fixos">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">Gastos fixos</span>
                    <span className="font-mono valor text-zinc-900 dark:text-zinc-100">{formatCurrency(data.gastosFixosMensais)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-300 dark:bg-white/25 rounded-full" style={{ width: `${(data.gastosFixosMensais / maxFluxo) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-zinc-100 dark:border-white/[0.05]">
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">Sobra mensal</span>
                <Valor porte="medio" className={sobraMensal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {sobraMensal >= 0 ? '+' : ''}{formatCurrency(sobraMensal)}
                </Valor>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Linha 2: Por mês + Últimos lançamentos */}
      <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        {/* Gráfico de barras - Gastos por mês */}
        <Card className="min-w-0 overflow-hidden" data-tour="grafico-mensal">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Por mês</h2>
            <Rotulo as="span">Últimos 6 meses</Rotulo>
          </div>
          {data.tendenciaMensal.length > 0 ? (
            <div className="h-44">
              {/* initialDimension: o ResponsiveContainer da v3 nasce com -1×-1 e só mede
                  um quadro depois, o que dispara um aviso de tamanho no console (recharts
                  #6716). A altura vem do pai; a largura é chute de desktop, vale um quadro. */}
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 176 }}>
                <BarChart data={data.tendenciaMensal} margin={{ top: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="mes" stroke={chartAxis} fontSize={11} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} />
                  <YAxis stroke={chartAxis} fontSize={10} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ fill: chartCursor }}
                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Meus Gastos']}
                  />
                  <Bar dataKey="meusGastos" radius={[6, 6, 0, 0]}>
                    {data.tendenciaMensal.map((_, index) => (
                      <Cell key={`cell-mes-${index}`} fill={index === data.tendenciaMensal.length - 1 ? chartBarraAtual : chartBarra} />
                    ))}
                    {/* Valor do mês atual acima da barra */}
                    <LabelList
                      dataKey="meusGastos"
                      content={(props) => {
                        const { x, y, width, value, index } = props as { x?: number; y?: number; width?: number; value?: number; index?: number };
                        if (index !== data.tendenciaMensal.length - 1) return null;
                        if (x === undefined || y === undefined || width === undefined) return null;
                        return (
                          <text
                            x={x + width / 2}
                            y={y - 6}
                            textAnchor="middle"
                            fill={chartBarraAtual}
                            fontSize={11}
                            fontFamily="Geist Mono, monospace"
                            fontWeight={600}
                          >
                            {formatCurrency(Number(value) || 0)}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <PageEmptyState
              compact
              title="Sem dados para o gráfico"
              description="Adicione novos gastos neste mês para visualizar a tendência."
            />
          )}
        </Card>

        {/* Últimos lançamentos (pessoais) */}
        <Card className="min-w-0" data-tour="ultimos-gastos">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">Últimos lançamentos</h2>
          {data.top5MeusGastos.length > 0 ? (
            <>
              <div>
                {data.top5MeusGastos.slice(0, 5).map((gasto, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-white/[0.05] last:border-b-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      gasto.categoria.toLowerCase().includes('fixo') ? 'bg-zinc-300' : 'bg-emerald-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{gasto.descricao}</p>
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 capitalize">{gasto.categoria}</p>
                    </div>
                    <span className="font-mono valor text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-shrink-0">
                      −{formatCurrency(gasto.valor)}
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/gastos/lancamentos" className="inline-block text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-3">
                Ver todos os gastos →
              </Link>
            </>
          ) : (
            <PageEmptyState
              compact
              title="Nenhum gasto no período"
              description="Quando você registrar gastos, eles aparecerão aqui automaticamente."
            />
          )}
        </Card>
      </div>

      {/* Linha 3: Onde o dinheiro foi + Metas do mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Onde o dinheiro foi */}
        <Card className="min-w-0">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Onde o dinheiro foi</h2>
          {data.gastosPorCategoria.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const top5 = data.gastosPorCategoria.slice(0, 5);
                const totalCategorias = data.gastosPorCategoria.reduce((acc, c) => acc + c.valor, 0);
                const maxCategoria = Math.max(...top5.map((c) => c.valor), 1);
                return top5.map((cat, i) => (
                  <div key={cat.categoria}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 capitalize truncate">{cat.categoria}</span>
                      <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatCurrency(cat.valor)} · {totalCategorias > 0 ? Math.round((cat.valor / totalCategorias) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${TONS_CATEGORIA[i] || TONS_CATEGORIA[TONS_CATEGORIA.length - 1]}`}
                        style={{ width: `${(cat.valor / maxCategoria) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <PageEmptyState
              compact
              title="Sem gastos categorizados"
              description="Registre gastos no mês para ver a distribuição por categoria."
            />
          )}
        </Card>

        {/* Metas do mês */}
        <Card className="min-w-0" data-tour="metas-section">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Metas do mês</h2>
          {data.metasGasto.length > 0 ? (
            <div className="space-y-4">
              {data.metasGasto.map((meta) => {
                const porcentagem = meta.limite > 0 ? (meta.gastoAtual / meta.limite) * 100 : 0;
                const estourou = porcentagem > 100;
                const quaseEstourando = porcentagem >= 80 && porcentagem <= 100;
                return (
                  <div key={meta.id}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 capitalize truncate">{meta.categoria}</span>
                      <span className="font-mono valor text-[13px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatCurrency(meta.gastoAtual)} / {formatCurrency(meta.limite)}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${estourou ? 'bg-red-50 dark:bg-red-950/30' : 'bg-zinc-100 dark:bg-white/[0.04]'}`}>
                      <div
                        className={`h-full rounded-full ${estourou ? 'bg-red-500' : quaseEstourando ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(porcentagem, 100)}%` }}
                      />
                    </div>
                    {estourou ? (
                      <p className="font-mono text-[11px] text-red-600 dark:text-red-400 mt-1">
                        {porcentagem.toFixed(0)}% usado · estourou o limite
                      </p>
                    ) : quaseEstourando ? (
                      <p className="font-mono text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                        {porcentagem.toFixed(0)}% usado · quase no limite
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <PageEmptyState
              compact
              title="Nenhuma meta definida"
              description="Crie metas por categoria em Gastos › Metas para acompanhá-las aqui."
            />
          )}
        </Card>
      </div>
      {/* Linha 4: Gastos totais · 6 meses */}
      {data.tendenciaMensal.length > 0 && (
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Gastos totais · 6 meses</h2>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400" data-tour="trend-6meses-meus">
                <span className="w-3 h-[3px] rounded-full bg-emerald-600" />
                Meus gastos
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400" data-tour="trend-6meses-compartilhados">
                <span className="w-3 h-[3px] rounded-full bg-zinc-300 dark:bg-zinc-600" />
                Compartilhados
              </span>
            </div>
          </div>
          <div className="h-64">
            {/* Mesmo motivo do gráfico de barras acima — ver recharts #6716. */}
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 900, height: 256 }}>
              <AreaChart data={data.tendenciaMensal}>
                <defs>
                  <linearGradient id="colorMeus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={chartAreaTopo}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="mes" stroke={chartAxis} fontSize={11} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} fontSize={10} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: chartCursor, strokeWidth: 1 }}
                  formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value) || 0), name === 'meusGastos' ? 'Meus gastos' : 'Compartilhados']}
                />
                <Area type="monotone" dataKey="meusGastos" stroke={chartBarra} fillOpacity={1} fill="url(#colorMeus)" strokeWidth={2.5} dot={{ r: 3, fill: chartBarra }} />
                <Area type="monotone" dataKey="compartilhados" stroke={chartNeutro} strokeDasharray="5 4" fill="none" strokeWidth={2} dot={{ r: 3, fill: chartNeutro }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

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
