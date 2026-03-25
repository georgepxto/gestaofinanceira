import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "react-router-dom";
import type { MetaGasto } from "../types";
import { 
  Wallet,
  TrendingUp, 
  TrendingDown, 
  Users, 
  CalendarDays,
  PiggyBank,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Target
} from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { formatCurrency, isGastoAtivoNoMes, getMesFaturaCartao } from "../utils/calculations";
import {
  LineChart,
  Line,
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
  // Tendência de gastos
  totalGastosMesAtual: number;
  totalGastosMesAnterior: number;
  totalEmprestimosMesAtual: number;
  totalEmprestimosMesAnterior: number;
  // Gastos fixos vs variáveis
  gastosFixosMes: number;
  gastosVariaveisMes: number;
  // Novas métricas
  taxaQuitacao: number; // % pessoas que fecharam o mês
  totalPessoas: number;
  pessoasQuitadas: number;
  mediaGastosPorPessoa: number;
  economiasMes: number; // receitas - gastos
  top5Gastos: { descricao: string; valor: number; pessoa: string }[];
  top5MeusGastos: { descricao: string; valor: number; categoria: string }[];
  parcelasProximasFim: { descricao: string; pessoa: string; parcelasRestantes: number }[];
  // Tendência 6 meses
  tendenciaMensal: { mes: string; meusGastos: number; compartilhados: number; total: number }[];
  // Metas de gasto
  metasGasto: (MetaGasto & { gastoAtual: number })[];
}

const CORES_GRAFICO = [
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#06B6D4", "#F97316", "#14B8A6", "#6366F1", "#EC4899"
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const DashboardPage = () => {
  const { user } = useAppContext();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
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

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || !user) return;
    
    setLoading(true);
    try {
      // Buscar todos os dados em paralelo para acelerar o carregamento
      const [
        { data: contas },
        { data: saldosDevedores },
        { data: meusGastos },
        { data: receitas },
        { data: gastosCompartilhados },
        { data: cartoesCredito }
      ] = await Promise.all([
        supabase.from("contas_bancarias").select("*"),
        supabase.from("saldos_devedores").select("*"),
        supabase.from("meus_gastos").select("*"),
        supabase.from("receitas").select("*"),
        supabase.from("gastos").select("*"),
        supabase.from("cartoes_credito").select("*"),
      ]);

      const getMesRealDoGasto = (g: MeuGasto) => {
        if (g.tipo === "credito" && g.cartao_id) {
          const cartao = (cartoesCredito || []).find(c => c.id === g.cartao_id);
          if (cartao && cartao.melhor_dia_compra) {
            const date = getMesFaturaCartao(g.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
            return format(date, "yyyy-MM");
          }
        }
        return g.data.substring(0, 7);
      };

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
        .filter(g => {
          if (g.categoria !== "fixo" || g.ativo === false) return false;
          
          const mesAtualView = format(mesVisualizacao, "yyyy-MM");
          
          let mesCriacao = g.data.substring(0, 7);
          if (g.tipo === "credito" && g.cartao_id) {
            const cartao = (cartoesCredito || []).find((c: any) => c.id === g.cartao_id);
            if (cartao && cartao.melhor_dia_compra) {
              const proxMesDate = getMesFaturaCartao(g.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
              mesCriacao = format(proxMesDate, "yyyy-MM");
            }
          }
          
          if (mesAtualView < mesCriacao) return false;

          if (g.meses_suspensos?.includes(mesAtualView)) return false;

          const mesHoje = format(new Date(), "yyyy-MM");
          if (mesAtualView === mesHoje && g.dia_vencimento) {
            const hoje = new Date().getDate();
            if (hoje < g.dia_vencimento) return false;
          }

          return true;
        });
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
        .filter(g => getMesRealDoGasto(g) === mesAtualFiltro);


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
      const mesAnteriorFiltro = format(mesAnterior, "yyyy-MM");
      
      const gastosDoMesAnterior = (meusGastos as MeuGasto[] || [])
        .filter(g => getMesRealDoGasto(g) === mesAnteriorFiltro);
      
      const gastosCompartilhadosDoMesAnterior = (gastosCompartilhados as Gasto[] || [])
        .filter(g => isGastoAtivoNoMes(g, mesAnterior));
      
      const totalGastosMesAnterior = gastosDoMesAnterior.reduce((acc, g) => acc + g.valor, 0);
      const totalEmprestimosMesAnterior = gastosCompartilhadosDoMesAnterior.reduce((acc, g) => acc + g.valor_total / g.num_parcelas, 0);

      // Calcular gastos fixos vs variáveis do mês (de "Meus Gastos")
      // Gastos fixos ativos e já iniciados contam
      const gastosFixosAtivos = (meusGastos as MeuGasto[] || [])
        .filter(g => {
          if (g.categoria !== 'fixo' || g.ativo === false) return false;
          let mesCriacao = g.data.substring(0, 7);
          if (g.tipo === "credito" && g.cartao_id) {
            const cartao = (cartoesCredito || []).find((c: any) => c.id === g.cartao_id);
            if (cartao && cartao.melhor_dia_compra) {
              const proxMesDate = getMesFaturaCartao(g.data, cartao.melhor_dia_compra, cartao.dia_vencimento);
              mesCriacao = format(proxMesDate, "yyyy-MM");
            }
          }
          return format(mesVisualizacao, "yyyy-MM") >= mesCriacao;
        });
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

      // Últimos 5 meus gastos pessoais do mês
      const top5MeusGastos = [...gastosDoMes]
        .sort((a, b) => {
          const dateA = new Date(a.data || 0).getTime();
          const dateB = new Date(b.data || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5)
        .map(g => ({
          descricao: g.descricao || 'Sem descrição',
          valor: g.valor,
          categoria: g.categoria_gasto || g.categoria || 'Outros',
        }));

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
          .filter(g => getMesRealDoGasto(g) === mesKey)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-4 px-4">
      {/* Header com saudação + seletor de mês */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Olá, {user?.user_metadata?.nome?.split(' ')[0] || 'Usuário'} 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Visão geral das suas finanças</p>
        </div>
        
        {/* Seletor de Mês */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl p-2 border border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setMesVisualizacao(subMonths(mesVisualizacao, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <span className="px-4 py-1 text-gray-900 dark:text-gray-100 font-medium min-w-[140px] text-center">
            {format(mesVisualizacao, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setMesVisualizacao(addMonths(mesVisualizacao, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Saldo Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.saldoTotal)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Todas as contas</p>
        </div>

        {/* Valor a Receber do Mês */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.totalEmprestimosMesAtual)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Gastos compartilhados do mês</p>
        </div>

        {/* Receitas Fixas */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Receitas Fixas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.receitasFixasMensais)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Por mês</p>
        </div>

        {/* Gastos Fixos */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Gastos Fixos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.gastosFixosMensais)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Por mês</p>
        </div>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-2 gap-4">
        {/* Fluxo Mensal */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-5 h-5 text-purple-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Fluxo Mensal</span>
          </div>
          <p className={`text-xl font-bold ${data.receitasFixasMensais - data.gastosFixosMensais >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {data.receitasFixasMensais - data.gastosFixosMensais >= 0 ? '+' : ''}{formatCurrency(data.receitasFixasMensais - data.gastosFixosMensais)}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Receitas - Gastos</p>
        </div>

        {/* Saldo Livre */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-5 h-5 text-pink-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Saldo Livre</span>
          </div>
          <p className={`text-xl font-bold ${data.saldoLivre >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(data.saldoLivre)}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Após gastos fixos</p>
        </div>
      </div>

      {/* Gastos por Mês + Últimos Gastos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gráfico de barras - Gastos por mês */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Meus gastos por mês</span>
            <span className="text-xs text-gray-400">Últimos 6 meses</span>
          </div>
          {data.tendenciaMensal.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tendenciaMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="mes" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    labelStyle={{ color: '#111827', fontWeight: 600 }}
                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Meus Gastos']}
                  />
                  <Bar dataKey="meusGastos" radius={[6, 6, 0, 0]} fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
              Sem dados suficientes
            </div>
          )}
        </div>

        {/* Últimos gastos (pessoais) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 block">Últimos gastos</span>
          {data.top5MeusGastos.length > 0 ? (
            <div className="space-y-0">
              {data.top5MeusGastos.slice(0, 5).map((gasto, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">
                      {gasto.categoria.toLowerCase().includes('alimenta') ? '🛒' :
                       gasto.categoria.toLowerCase().includes('transport') ? '🚗' :
                       gasto.categoria.toLowerCase().includes('lazer') || gasto.categoria.toLowerCase().includes('entretenimento') ? '🎬' :
                       gasto.categoria.toLowerCase().includes('saúde') || gasto.categoria.toLowerCase().includes('saude') ? '💊' :
                       gasto.categoria.toLowerCase().includes('fixo') ? '🏠' :
                       '💳'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{gasto.descricao}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{gasto.categoria}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0 ml-2">
                    -{formatCurrency(gasto.valor)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              Nenhum gasto este mês
            </div>
          )}
        </div>
      </div>

      {/* Tendência de Gastos */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-orange-500" />
          Tendência de Gastos (vs mês anterior)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Meus Gastos */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-1">Meus Gastos</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.totalGastosMesAtual)}</p>
            {data.totalGastosMesAnterior > 0 && (
              <div className="flex items-center gap-1 mt-1 sm:mt-2 flex-wrap">
                {data.totalGastosMesAtual > data.totalGastosMesAnterior ? (
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                ) : data.totalGastosMesAtual < data.totalGastosMesAnterior ? (
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                ) : null}
                <span className={`text-xs sm:text-sm ${data.totalGastosMesAtual > data.totalGastosMesAnterior ? 'text-red-500' : 'text-emerald-500'}`}>
                  {data.totalGastosMesAnterior > 0 
                    ? `${Math.abs(((data.totalGastosMesAtual - data.totalGastosMesAnterior) / data.totalGastosMesAnterior) * 100).toFixed(0)}%`
                    : '—'}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs">({formatCurrency(data.totalGastosMesAnterior)} ant.)</span>
              </div>
            )}
          </div>

          {/* Empréstimos/Gastos Compartilhados */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-1">Gastos Compartilhados</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.totalEmprestimosMesAtual)}</p>
            {data.totalEmprestimosMesAnterior > 0 && (
              <div className="flex items-center gap-1 mt-1 sm:mt-2 flex-wrap">
                {data.totalEmprestimosMesAtual > data.totalEmprestimosMesAnterior ? (
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                ) : data.totalEmprestimosMesAtual < data.totalEmprestimosMesAnterior ? (
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                ) : null}
                <span className={`text-xs sm:text-sm ${data.totalEmprestimosMesAtual > data.totalEmprestimosMesAnterior ? 'text-red-500' : 'text-emerald-500'}`}>
                  {data.totalEmprestimosMesAnterior > 0 
                    ? `${Math.abs(((data.totalEmprestimosMesAtual - data.totalEmprestimosMesAnterior) / data.totalEmprestimosMesAnterior) * 100).toFixed(0)}%`
                    : '—'}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs">({formatCurrency(data.totalEmprestimosMesAnterior)} ant.)</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Gráficos de Tendência - 6 meses */}
      {data.tendenciaMensal.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Meus Gastos */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm min-w-0 overflow-hidden">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Meus Gastos (6 meses)
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tendenciaMensal}>
                  <defs>
                    <linearGradient id="colorMeus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" stroke="#6B7280" fontSize={11} />
                  <YAxis stroke="#6B7280" fontSize={10} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#111827' }}
                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Meus Gastos']}
                  />
                  <Area type="monotone" dataKey="meusGastos" stroke="#3B82F6" fillOpacity={1} fill="url(#colorMeus)" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gastos Compartilhados */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm min-w-0 overflow-hidden">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Compartilhados (6 meses)
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tendenciaMensal}>
                  <defs>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" stroke="#6B7280" fontSize={11} />
                  <YAxis stroke="#6B7280" fontSize={10} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#111827' }}
                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Compartilhados']}
                  />
                  <Area type="monotone" dataKey="compartilhados" stroke="#10B981" fillOpacity={1} fill="url(#colorComp)" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Metas de Gasto por Categoria */}
      {data.metasGasto.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
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
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{meta.categoria}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${estourou ? 'text-red-600' : quaseEstourando ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(meta.gastoAtual)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">/ {formatCurrency(meta.limite)}</span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        estourou ? 'bg-gradient-to-r from-red-500 to-red-400' : 
                        quaseEstourando ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 
                        'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(porcentagem, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${estourou ? 'text-red-600 font-bold' : quaseEstourando ? 'text-amber-600' : 'text-gray-500'}`}>
                      {estourou ? `⚠️ Estourou ${(porcentagem - 100).toFixed(0)}%` : 
                       quaseEstourando ? `⚡ ${porcentagem.toFixed(0)}% usado` :
                       `${porcentagem.toFixed(0)}% usado`}
                    </span>
                    <span className={`text-xs ${estourou ? 'text-red-600' : 'text-gray-500'}`}>
                      {estourou ? `+${formatCurrency(meta.gastoAtual - meta.limite)} excedido` : 
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
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Taxa de Quitação</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.taxaQuitacao.toFixed(0)}%</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {data.pessoasQuitadas} de {data.totalPessoas} pessoas quitaram
          </p>
          <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${data.taxaQuitacao}%` }}
            />
          </div>
        </div>

        {/* Média por Pessoa */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-cyan-600" />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Média por Pessoa</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.mediaGastosPorPessoa)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {data.totalPessoas} pessoas com gastos este mês
          </p>
        </div>

        {/* Economias do Mês */}
        <div className={`bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm ${data.economiasMes >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {data.economiasMes >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              {data.economiasMes >= 0 ? 'Economizando' : 'Gastando mais'}
            </span>
          </div>
          <p className={`text-3xl font-bold ${data.economiasMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(data.economiasMes))}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {data.economiasMes >= 0 ? 'Sobra mensal' : 'Déficit mensal'}
          </p>
        </div>
      </div>

      {/* Top 5 Gastos e Parcelas Próximas do Fim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Gastos do Mês */}
        {data.top5Gastos.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              Top 5 Gastos do Mês
            </h3>
            <div className="space-y-3">
              {data.top5Gastos.map((gasto, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-gray-900 dark:text-gray-100 text-sm font-medium truncate max-w-[140px]">{gasto.descricao}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs">{gasto.pessoa}</p>
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(gasto.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parcelas Próximas do Fim */}
        {data.parcelasProximasFim.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Parcelas Acabando
            </h3>
            <div className="space-y-3">
              {data.parcelasProximasFim.map((parcela, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 text-sm font-medium truncate max-w-[180px]">{parcela.descricao}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{parcela.pessoa}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-600 font-bold text-lg">{parcela.parcelasRestantes}</p>
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
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Projeção de Saldo (12 meses)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={data.projecaoAnual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" stroke="#6B7280" fontSize={12} />
              <YAxis 
                stroke="#6B7280" 
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ color: '#111827' }}
                itemStyle={{ color: '#111827' }}
                formatter={(value) => [formatCurrency(value as number), 'Saldo']}
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gastos Fixos vs Variáveis */}
      {(data.gastosFixosMes > 0 || data.gastosVariaveisMes > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-600" />
            Gastos Fixos vs Variáveis (Meus Gastos)
          </h2>
          <div className="space-y-4">
            {/* Barra de proporção */}
            <div className="h-8 rounded-lg overflow-hidden flex">
              {data.gastosFixosMes > 0 && (
                <div 
                  className="bg-blue-500 flex items-center justify-center"
                  style={{ width: `${(data.gastosFixosMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100}%` }}
                >
                  <span className="text-xs font-medium text-white">
                    {((data.gastosFixosMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {data.gastosVariaveisMes > 0 && (
                <div 
                  className="bg-indigo-400 flex items-center justify-center"
                  style={{ width: `${(data.gastosVariaveisMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100}%` }}
                >
                  <span className="text-xs font-medium text-white">
                    {((data.gastosVariaveisMes / (data.gastosFixosMes + data.gastosVariaveisMes)) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {/* Cards com valores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 !border-l-blue-500">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Gastos Fixos</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.gastosFixosMes)}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Contas recorrentes</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 !border-l-indigo-400">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Gastos Variáveis</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.gastosVariaveisMes)}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Gastos pessoais</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Gastos por Categoria */}
      {data.gastosPorCategoria.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Gastos por Categoria (30 dias)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data.gastosPorCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  type="number" 
                  stroke="#6B7280" 
                  fontSize={12}
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis 
                  dataKey="categoria" 
                  type="category" 
                  stroke="#6B7280" 
                  fontSize={11}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: '#111827' }}
                  itemStyle={{ color: '#111827' }}
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
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Empréstimos por Pessoa
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data.emprestadosPorPessoa} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  type="number" 
                  stroke="#6B7280" 
                  fontSize={12}
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis 
                  dataKey="pessoa" 
                  type="category" 
                  stroke="#6B7280" 
                  fontSize={11}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: '#111827' }}
                  itemStyle={{ color: '#111827' }}
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
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            Empréstimos por Categoria
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data.emprestadosPorCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  type="number" 
                  stroke="#6B7280" 
                  fontSize={12}
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis 
                  dataKey="categoria" 
                  type="category" 
                  stroke="#6B7280" 
                  fontSize={11}
                  width={90}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: '#111827' }}
                  itemStyle={{ color: '#111827' }}
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
    </div>
  );
};
