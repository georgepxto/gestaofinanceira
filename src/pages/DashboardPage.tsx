import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Target,
} from "lucide-react";
import { useAppContext } from "../context";
import { useTheme } from "../hooks/useTheme";
import { GuidedTourOverlay } from "../components/GuidedTourOverlay";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../components/ui/AsyncState";
import { useGuidedTour, usePageTutorialHelpButton } from "../hooks";
import { supabase } from "../lib/supabase";
import { formatCurrency, isGastoAtivoNoMes } from "../utils/calculations";
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
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  Area,
  AreaChart,
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
  taxaQuitacao: number;
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

const CORES_GRAFICO = [
  "#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5", "#A1A1AA", "#D4D4D8"
];

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
    target: "[data-tour='trend-comparison']",
    alvo: "Comparativo mensal",
    titulo: "Comparação com o mês anterior",
    descricao:
      "Veja se seus gastos e valores a receber aumentaram ou diminuíram em relação ao mês anterior.",
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
    target: "[data-tour='taxa-quitacao']",
    alvo: "Taxa de quitação",
    titulo: "Taxa de quitação",
    descricao:
      "Mostra quantas pessoas já quitaram os valores do mês. É um indicador rápido do andamento.",
  },
  {
    target: "[data-tour='media-por-pessoa']",
    alvo: "Média por pessoa",
    titulo: "Média por pessoa",
    descricao:
      "Exibe a média de valores a receber por pessoa neste mês.",
  },
  {
    target: "[data-tour='economias-mes']",
    alvo: "Economias do mês",
    titulo: "Economias do mês",
    descricao:
      "Aqui você vê se o mês terminou com sobra ou com déficit.",
  },
  {
    target: "[data-tour='projecao-saldo']",
    alvo: "Projeção de saldo",
    titulo: "Projeção de Saldo (12 meses)",
    descricao:
      "Este gráfico estima como seu saldo pode evoluir nos próximos 12 meses com base no seu fluxo mensal atual (receitas fixas menos gastos fixos).",
  },
  {
    target: "[data-tour='top5-gastos']",
    alvo: "Top 5 gastos",
    titulo: "Maiores gastos do mês",
    descricao:
      "Lista os 5 maiores gastos compartilhados do mês, do maior para o menor.",
  },
  {
    target: "[data-tour='parcelas-acabando']",
    alvo: "Parcelas acabando",
    titulo: "Parcelas próximas do fim",
    descricao:
      "Mostra quais lançamentos parcelados estão quase terminando.",
    placement: "below",
  },
  {
    target: "[data-tour='fixos-variaveis']",
    alvo: "Fixos x variáveis",
    titulo: "Gastos fixos vs variáveis",
    descricao:
      "Compara o que é recorrente com o que é variável nos seus gastos pessoais.",
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
  const { user } = useAppContext();
  const { theme } = useTheme();
  const location = useLocation();

  const tooltipStyle = useMemo(() => theme === "dark"
    ? { backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", boxShadow: "0 4px 24px -4px rgba(0,0,0,0.5)", fontSize: "12px", color: "#f3f4f6" }
    : { backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: "12px" },
    [theme]
  );
  const tooltipLabelStyle = useMemo(() => theme === "dark" ? { color: "#f9fafb", fontWeight: 600 } : { color: "#111827", fontWeight: 600 }, [theme]);
  const tooltipItemStyle = useMemo(() => theme === "dark" ? { color: "#d1d5db" } : { color: "#111827" }, [theme]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mesVisualizacao, setMesVisualizacao] = useState(new Date());
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
    taxaQuitacao: 0,
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
        const cat = g.categoria_gasto || g.categoria || "Outros";
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
        const cat = g.categoria || "Outros";
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
        .eq("mes", format(mesVisualizacao, "MMMM yyyy", { locale: ptBR }));
      
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
      
      const taxaQuitacao = totalPessoas > 0 ? (pessoasQuitadas / totalPessoas) * 100 : 0;

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
          categoria: g.categoria_gasto || g.categoria || 'Outros',
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
          .filter(g => (g.categoria_gasto || g.categoria || "").toLowerCase() === meta.categoria.toLowerCase())
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
        taxaQuitacao,
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
      {/* Header com saudação + seletor de mês */}
      <div className="flex items-center justify-between flex-wrap gap-4" data-tour="dashboard-header">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">
            Painel · <span className="capitalize">{format(mesVisualizacao, "MMMM", { locale: ptBR })}</span>
          </p>
          <h1 className="font-display font-bold tracking-tight text-3xl text-zinc-900 dark:text-zinc-100">Olá, {user?.user_metadata?.nome?.split(' ')[0] || 'Usuário'}</h1>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-xl p-2 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="month-selector">
          <button
            onClick={() => setMesVisualizacao(subMonths(mesVisualizacao, 1))}
            aria-label="Mês anterior"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
          <span className="px-4 py-1 font-mono text-sm text-zinc-900 dark:text-zinc-100 font-medium min-w-[140px] text-center capitalize">
            {format(mesVisualizacao, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setMesVisualizacao(addMonths(mesVisualizacao, 1))}
            aria-label="Próximo mês"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

      </div>

      {/* Card Herói: Saldo livre + Fluxo do mês */}
      {(() => {
        const sobraMensal = data.receitasFixasMensais - data.gastosFixosMensais;
        const maxFluxo = Math.max(data.receitasFixasMensais, data.gastosFixosMensais, 1);
        return (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 lg:grid-cols-2" data-tour="card-saldo-total">
            {/* Esquerda: Saldo livre */}
            <div className="p-6" data-tour="saldo-livre">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">Saldo livre · Disponível agora</p>
              <p className={`font-display font-extrabold tracking-tighter text-5xl sm:text-6xl mt-2 inline-block scale-x-90 origin-left ${data.saldoLivre >= 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(data.saldoLivre)}
              </p>
              {/* Mini-stats */}
              <div className="mt-6 flex flex-wrap">
                <div className="pr-5" data-tour="card-saldo-total-mini">
                  <p className="text-zinc-400 text-xs">Saldo total</p>
                  <p className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{formatCurrency(data.saldoTotal)}</p>
                </div>
                <div className="px-5 border-l border-zinc-100 dark:border-zinc-800" data-tour="card-a-receber">
                  <p className="text-zinc-400 text-xs">A receber</p>
                  <p className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{formatCurrency(data.totalEmprestimosMesAtual)}</p>
                </div>
                <div className="pl-5 border-l border-zinc-100 dark:border-zinc-800">
                  <p className="text-zinc-400 text-xs">Meus gastos</p>
                  <p className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{formatCurrency(data.totalGastosMesAtual)}</p>
                </div>
              </div>
            </div>

            {/* Direita: Fluxo do mês */}
            <div className="p-6 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800" data-tour="fluxo-mensal">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 mb-4">Fluxo do mês</p>
              <div className="space-y-3">
                <div data-tour="card-receitas-fixas">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">Receitas fixas</span>
                    <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(data.receitasFixasMensais)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(data.receitasFixasMensais / maxFluxo) * 100}%` }} />
                  </div>
                </div>
                <div data-tour="card-gastos-fixos">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">Gastos fixos</span>
                    <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(data.gastosFixosMensais)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-300 dark:bg-zinc-600 rounded-full" style={{ width: `${(data.gastosFixosMensais / maxFluxo) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">Sobra mensal</span>
                <span className={`font-mono tabular-nums font-semibold ${sobraMensal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sobraMensal >= 0 ? '+' : ''}{formatCurrency(sobraMensal)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Gastos por Mês + Últimos Gastos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gráfico de barras - Gastos por mês */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm min-w-0 overflow-hidden" data-tour="grafico-mensal">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-bold text-zinc-900 dark:text-zinc-100">Por mês</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">Últimos 6 meses</span>
          </div>
          {data.tendenciaMensal.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data.tendenciaMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={11} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={10} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Meus Gastos']}
                  />
                  <Bar dataKey="meusGastos" radius={[6, 6, 0, 0]}>
                    {data.tendenciaMensal.map((_, index) => (
                      <Cell key={`cell-mes-${index}`} fill={index === data.tendenciaMensal.length - 1 ? "#047857" : "#059669"} />
                    ))}
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
        </div>

        {/* Últimos gastos (pessoais) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="ultimos-gastos">
          <span className="font-display font-bold text-zinc-900 dark:text-zinc-100 mb-4 block">Últimos lançamentos</span>
          {data.top5MeusGastos.length > 0 ? (
            <div className="space-y-0">
              {data.top5MeusGastos.slice(0, 5).map((gasto, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      gasto.categoria.toLowerCase().includes('fixo') ? 'bg-zinc-500' : 'bg-zinc-300'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{gasto.descricao}</p>
                      <p className="font-mono text-[11px] text-zinc-400 capitalize">{gasto.categoria}</p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-shrink-0 ml-2">
                    −{formatCurrency(gasto.valor)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <PageEmptyState
              compact
              title="Nenhum gasto no período"
              description="Quando você registrar gastos, eles aparecerão aqui automaticamente."
            />
          )}
        </div>
      </div>

      {/* Tendência de Gastos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="trend-comparison">
        <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-zinc-400" />
          Tendência de Gastos (vs mês anterior)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Meus Gastos */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 sm:p-4 border border-zinc-100 dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Meus Gastos</p>
            <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(data.totalGastosMesAtual)}</p>
            {data.totalGastosMesAnterior > 0 && (
              <div className="flex items-center gap-1 mt-1 sm:mt-2 flex-wrap">
                {data.totalGastosMesAtual > data.totalGastosMesAnterior ? (
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                ) : data.totalGastosMesAtual < data.totalGastosMesAnterior ? (
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                ) : null}
                <span className={`font-mono tabular-nums text-xs sm:text-sm ${data.totalGastosMesAtual > data.totalGastosMesAnterior ? 'text-red-500' : 'text-emerald-500'}`}>
                  {data.totalGastosMesAnterior > 0
                    ? `${Math.abs(((data.totalGastosMesAtual - data.totalGastosMesAnterior) / data.totalGastosMesAnterior) * 100).toFixed(0)}%`
                    : '—'}
                </span>
                <span className="font-mono tabular-nums text-zinc-400 dark:text-zinc-500 text-xs">({formatCurrency(data.totalGastosMesAnterior)} ant.)</span>
              </div>
            )}
          </div>

          {/* Empréstimos/Gastos Compartilhados */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 sm:p-4 border border-zinc-100 dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Gastos Compartilhados</p>
            <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(data.totalEmprestimosMesAtual)}</p>
            {data.totalEmprestimosMesAnterior > 0 && (
              <div className="flex items-center gap-1 mt-1 sm:mt-2 flex-wrap">
                {data.totalEmprestimosMesAtual > data.totalEmprestimosMesAnterior ? (
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                ) : data.totalEmprestimosMesAtual < data.totalEmprestimosMesAnterior ? (
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                ) : null}
                <span className={`font-mono tabular-nums text-xs sm:text-sm ${data.totalEmprestimosMesAtual > data.totalEmprestimosMesAnterior ? 'text-red-500' : 'text-emerald-500'}`}>
                  {data.totalEmprestimosMesAnterior > 0
                    ? `${Math.abs(((data.totalEmprestimosMesAtual - data.totalEmprestimosMesAnterior) / data.totalEmprestimosMesAnterior) * 100).toFixed(0)}%`
                    : '—'}
                </span>
                <span className="font-mono tabular-nums text-zinc-400 dark:text-zinc-500 text-xs">({formatCurrency(data.totalEmprestimosMesAnterior)} ant.)</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Tendência - 6 meses (unificado) */}
      {data.tendenciaMensal.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100">Tendência · 6 meses</h2>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400" data-tour="trend-6meses-meus">
                <span className="w-3 h-0.5 rounded-full bg-emerald-600" />
                Meus gastos
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400" data-tour="trend-6meses-compartilhados">
                <span className="w-3 border-t-2 border-dashed border-zinc-400" />
                Compartilhados
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data.tendenciaMensal}>
                <defs>
                  <linearGradient id="colorMeus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={11} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={10} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value) || 0), name === 'meusGastos' ? 'Meus gastos' : 'Compartilhados']}
                />
                <Area type="monotone" dataKey="meusGastos" stroke="#059669" fillOpacity={1} fill="url(#colorMeus)" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} />
                <Area type="monotone" dataKey="compartilhados" stroke="#D4D4D8" strokeDasharray="5 4" fill="none" strokeWidth={2} dot={{ r: 3, fill: '#D4D4D8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metas de Gasto por Categoria */}
      {data.metasGasto.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="metas-section">
          <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-zinc-400" />
            Metas de Gasto
          </h2>
          <div className="space-y-4">
            {data.metasGasto.map((meta) => {
              const porcentagem = meta.limite > 0 ? (meta.gastoAtual / meta.limite) * 100 : 0;
              const estourou = porcentagem > 100;
              const quaseEstourando = porcentagem >= 80 && porcentagem <= 100;

              return (
                <div key={meta.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">{meta.categoria}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono tabular-nums text-sm font-bold ${estourou ? 'text-red-600' : quaseEstourando ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(meta.gastoAtual)}
                      </span>
                      <span className="font-mono tabular-nums text-zinc-400 dark:text-zinc-500 text-xs">/ {formatCurrency(meta.limite)}</span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        estourou ? 'bg-red-500' : quaseEstourando ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(porcentagem, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${estourou ? 'text-red-600 font-semibold' : quaseEstourando ? 'text-amber-600' : 'text-zinc-500'}`}>
                      {estourou ? `Limite excedido em ${(porcentagem - 100).toFixed(0)}%` :
                       quaseEstourando ? `${porcentagem.toFixed(0)}% usado` :
                       `${porcentagem.toFixed(0)}% usado`}
                    </span>
                    <span className={`font-mono tabular-nums text-xs ${estourou ? 'text-red-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {estourou ? `+${formatCurrency(meta.gastoAtual - meta.limite)} acima` :
                       `${formatCurrency(meta.limite - meta.gastoAtual)} restante`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Novas Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Taxa de Quitação */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="taxa-quitacao">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-zinc-400" />
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Taxa de Quitação</span>
          </div>
          <p className="font-mono tabular-nums text-3xl font-bold text-zinc-900 dark:text-zinc-100">{data.taxaQuitacao.toFixed(0)}%</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
            {data.pessoasQuitadas} de {data.totalPessoas} pessoas quitaram
          </p>
          <div className="mt-3 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${data.taxaQuitacao}%` }}
            />
          </div>
        </div>

        {/* Média por Pessoa */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="media-por-pessoa">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-zinc-400" />
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Média por Pessoa</span>
          </div>
          <p className="font-mono tabular-nums text-3xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(data.mediaGastosPorPessoa)}</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
            {data.totalPessoas} pessoas com gastos este mês
          </p>
        </div>

        {/* Economias do Mês */}
        <div className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border shadow-sm ${data.economiasMes >= 0 ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-red-200 dark:border-red-900/40'}`} data-tour="economias-mes">
          <div className="flex items-center gap-2 mb-2">
            {data.economiasMes >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              {data.economiasMes >= 0 ? 'Economizando' : 'Gastando mais'}
            </span>
          </div>
          <p className={`font-mono tabular-nums text-3xl font-bold ${data.economiasMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(data.economiasMes))}</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
            {data.economiasMes >= 0 ? 'Sobra mensal' : 'Déficit mensal'}
          </p>
        </div>
      </div>

      {/* Top 5 Gastos e Parcelas Próximas do Fim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Gastos do Mês */}
        {data.top5Gastos.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="top5-gastos">
            <h3 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-zinc-400" />
              Top 5 Gastos do Mês
            </h3>
            <div className="space-y-3">
              {data.top5Gastos.map((gasto, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-100 text-sm font-medium truncate max-w-[140px]">{gasto.descricao}</p>
                      <p className="text-zinc-400 dark:text-zinc-500 text-xs">{gasto.pessoa}</p>
                    </div>
                  </div>
                  <p className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100 font-semibold">{formatCurrency(gasto.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parcelas Próximas do Fim */}
        {data.parcelasProximasFim.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="parcelas-acabando">
            <h3 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Parcelas Acabando
            </h3>
            <div className="space-y-3">
              {data.parcelasProximasFim.map((parcela, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <div>
                    <p className="text-zinc-900 dark:text-zinc-100 text-sm font-medium truncate max-w-[180px]">{parcela.descricao}</p>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs">{parcela.pessoa}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono tabular-nums text-amber-600 font-bold text-lg">{parcela.parcelasRestantes}</p>
                    <p className="text-amber-500 text-xs">
                      {parcela.parcelasRestantes === 1 ? 'parcela' : 'parcelas'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de Projeção Anual */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="projecao-saldo">
        <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-zinc-400" />
          Projeção de Saldo (12 meses)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={data.projecaoAnual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
              <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={12} fontFamily="Geist Mono, monospace" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#A1A1AA"
                fontSize={12}
                fontFamily="Geist Mono, monospace"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => [formatCurrency(value as number), 'Saldo']}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#059669"
                strokeWidth={3}
                dot={{ fill: '#059669', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#059669' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gastos Fixos vs Variáveis */}
      {(data.gastosFixosMes > 0 || data.gastosVariaveisMes > 0) && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-tour="fixos-variaveis">
          <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-zinc-400" />
            Gastos Fixos vs Variáveis (Meus Gastos)
          </h2>
          <div className="space-y-4">
            {/* Barra de proporção */}
            <div className="h-8 rounded-lg overflow-hidden flex">
              {data.gastosFixosMes > 0 && (
                <div
                  className="bg-emerald-600 flex items-center justify-center"
                  style={{ width: `${(data.gastosFixosMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100}%` }}
                >
                  <span className="font-mono tabular-nums text-xs font-medium text-white">
                    {((data.gastosFixosMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {data.gastosVariaveisMes > 0 && (
                <div
                  className="bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center"
                  style={{ width: `${(data.gastosVariaveisMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100}%` }}
                >
                  <span className="font-mono tabular-nums text-xs font-medium text-zinc-700 dark:text-zinc-100">
                    {((data.gastosVariaveisMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {/* Cards com valores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-emerald-700 dark:text-emerald-400 text-sm mb-1 font-medium">Gastos Fixos</p>
                <p className="font-mono tabular-nums text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(data.gastosFixosMes)}</p>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Contas recorrentes</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-1 font-medium">Gastos Variáveis</p>
                <p className="font-mono tabular-nums text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(data.gastosVariaveisMes)}</p>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Gastos pessoais</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Gastos por Categoria */}
      {data.gastosPorCategoria.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-zinc-400" />
            Gastos por Categoria (30 dias)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data.gastosPorCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis
                  type="number"
                  stroke="#A1A1AA"
                  fontSize={12}
                  fontFamily="Geist Mono, monospace"
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis
                  dataKey="categoria"
                  type="category"
                  stroke="#A1A1AA"
                  fontSize={11}
                  fontFamily="Geist Mono, monospace"
                  width={80}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => [formatCurrency(value as number), 'Valor']}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {data.gastosPorCategoria.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico de Empréstimos por Pessoa */}
      {data.emprestadosPorPessoa.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Empréstimos por Pessoa
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data.emprestadosPorPessoa} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis
                  type="number"
                  stroke="#A1A1AA"
                  fontSize={12}
                  fontFamily="Geist Mono, monospace"
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis
                  dataKey="pessoa"
                  type="category"
                  stroke="#A1A1AA"
                  fontSize={11}
                  fontFamily="Geist Mono, monospace"
                  width={80}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => [formatCurrency(value as number), 'Valor']}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {data.emprestadosPorPessoa.map((_, index) => (
                    <Cell key={`cell-pessoa-${index}`} fill={CORES_GRAFICO[(index + 2) % CORES_GRAFICO.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico de Empréstimos por Categoria */}
      {data.emprestadosPorCategoria.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-zinc-400" />
            Empréstimos por Categoria
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data.emprestadosPorCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis
                  type="number"
                  stroke="#A1A1AA"
                  fontSize={12}
                  fontFamily="Geist Mono, monospace"
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis
                  dataKey="categoria"
                  type="category"
                  stroke="#A1A1AA"
                  fontSize={11}
                  fontFamily="Geist Mono, monospace"
                  width={90}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => [formatCurrency(value as number), 'Valor']}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {data.emprestadosPorCategoria.map((_, index) => (
                    <Cell key={`cell-cat-emp-${index}`} fill={CORES_GRAFICO[(index + 4) % CORES_GRAFICO.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
