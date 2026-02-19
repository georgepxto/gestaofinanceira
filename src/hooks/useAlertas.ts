import { useState, useEffect, useCallback } from "react";
import { format, subMonths, startOfMonth, endOfMonth, getDaysInMonth, getDate } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAppContext } from "../context";
import { formatCurrency, isGastoAtivoNoMes } from "../utils/calculations";
import type { MeuGasto, Gasto, Receita, MetaGasto } from "../types";

export interface Alerta {
  tipo: "danger" | "warning" | "info";
  titulo: string;
  mensagem: string;
}

export const useAlertas = () => {
  const { user } = useAppContext();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  const calcularAlertas = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    try {
      const agora = new Date();
      const mesAtual = startOfMonth(agora);
      const mesAnterior = subMonths(mesAtual, 1);
      const mesAtualFiltro = format(agora, "yyyy-MM");
      const inicioMesAnterior = startOfMonth(mesAnterior);
      const fimMesAnterior = endOfMonth(mesAnterior);

      // Buscar dados em paralelo
      const [
        { data: meusGastos },
        { data: gastosCompartilhados },
        { data: receitas },
        { data: metas },
      ] = await Promise.all([
        supabase.from("meus_gastos").select("*"),
        supabase.from("gastos").select("*"),
        supabase.from("receitas").select("*"),
        supabase.from("metas_gasto").select("*"),
      ]);

      const todosGastos = (meusGastos as MeuGasto[]) || [];
      const todosCompartilhados = (gastosCompartilhados as Gasto[]) || [];
      const todasReceitas = (receitas as Receita[]) || [];
      const todasMetas = (metas as MetaGasto[]) || [];

      // Gastos pessoais do mês atual e anterior
      const gastosDoMes = todosGastos.filter(
        (g) => g.data.substring(0, 7) === mesAtualFiltro
      );
      const gastosDoMesAnterior = todosGastos.filter((g) => {
        const d = new Date(g.data);
        return d >= inicioMesAnterior && d <= fimMesAnterior;
      });

      // Compartilhados do mês
      const compartilhadosDoMes = todosCompartilhados.filter((g) =>
        isGastoAtivoNoMes(g, mesAtual)
      );

      // Receitas fixas (Match Dashboard Logic)
      const receitasFixasMensais = todasReceitas
        .filter((r) => r.tipo === "fixo" || r.tipo === "recorrente")
        .reduce((acc, r) => acc + r.valor, 0);

      // Totais
      const totalGastosMes = gastosDoMes.reduce((acc, g) => acc + g.valor, 0);
      const totalEmprestimosMes = compartilhadosDoMes.reduce(
        (acc, g) => acc + g.valor_total / g.num_parcelas,
        0
      );
      // 2. Gastos Fixos (ignora data, sempre conta se ativo)
      const gastosFixos = todosGastos
        .filter((g) => g.categoria === "fixo" && g.ativo !== false)
        .reduce((acc, g) => acc + g.valor, 0);

      // 3. Gastos Variáveis (apenas mês atual)
      const gastosVariaveis = todosGastos
        .filter(
          (g) =>
            g.categoria === "pessoal" &&
            g.data.substring(0, 7) === mesAtualFiltro
        )
        .reduce((acc, g) => acc + g.valor, 0);

      const totalMeusGastos = gastosFixos + gastosVariaveis;

      const novasAlertas: Alerta[] = [];

      // a) Categorias com aumento ≥30% vs mês anterior
      const catMapAtual = new Map<string, number>();
      gastosDoMes.forEach((g) => {
        const cat = g.categoria_gasto || g.categoria || "Outros";
        catMapAtual.set(cat, (catMapAtual.get(cat) || 0) + g.valor);
      });
      const catMapAnterior = new Map<string, number>();
      gastosDoMesAnterior.forEach((g) => {
        const cat = g.categoria_gasto || g.categoria || "Outros";
        catMapAnterior.set(cat, (catMapAnterior.get(cat) || 0) + g.valor);
      });
      catMapAtual.forEach((valorAtual, cat) => {
        const valorAnterior = catMapAnterior.get(cat) || 0;
        if (valorAnterior > 0 && valorAtual > valorAnterior) {
          const aumento =
            ((valorAtual - valorAnterior) / valorAnterior) * 100;
          if (aumento >= 30) {
            novasAlertas.push({
              tipo: aumento >= 80 ? "danger" : "warning",
              titulo: `${cat} subiu ${aumento.toFixed(0)}%`,
              mensagem: `De ${formatCurrency(valorAnterior)} para ${formatCurrency(valorAtual)} este mês.`,
            });
          }
        }
      });

      // b) Gastos vs receita + dias restantes
      if (receitasFixasMensais > 0) {
        // Para este alerta, usamos Total Geral (Compartilhado + Pessoal)
        const totalGeral = totalGastosMes + totalEmprestimosMes;
        const pctGasto = (totalGeral / receitasFixasMensais) * 100;
        const diasNoMes = getDaysInMonth(agora);
        const diaAtual = getDate(agora);
        const diasRestantes = Math.max(diasNoMes - diaAtual, 0);

        if (pctGasto >= 90 && diasRestantes > 5) {
          novasAlertas.push({
            tipo: pctGasto >= 100 ? "danger" : "warning",
            titulo: `Já gastou ${pctGasto.toFixed(0)}% da receita`,
            mensagem: `${formatCurrency(totalGeral)} de ${formatCurrency(receitasFixasMensais)} — faltam ${diasRestantes} dias.`,
          });
        } else if (pctGasto >= 70 && diasRestantes > 10) {
          novasAlertas.push({
            tipo: "info",
            titulo: `${pctGasto.toFixed(0)}% da receita comprometida`,
            mensagem: `Faltam ${diasRestantes} dias. ${formatCurrency(receitasFixasMensais - totalGeral)} disponível.`,
          });
        }
      }

      // c) Parcelas acabando este mês
      const parcelasAcabando = todosCompartilhados.filter((g) => {
        const dataInicio = new Date(g.data_inicio);
        const mesesDesdeInicio = Math.floor(
          (agora.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const parcelaAtual = Math.min(mesesDesdeInicio + 1, g.num_parcelas);
        return parcelaAtual === g.num_parcelas;
      });
      if (parcelasAcabando.length > 0) {
        novasAlertas.push({
          tipo: "info",
          titulo: `${parcelasAcabando.length} parcela${parcelasAcabando.length > 1 ? "s acabam" : " acaba"} este mês`,
          mensagem:
            parcelasAcabando
              .slice(0, 3)
              .map((g) => g.descricao)
              .join(", ") +
            (parcelasAcabando.length > 3
              ? ` e mais ${parcelasAcabando.length - 3}`
              : ""),
        });
      }

      // d) Metas estouradas
      todasMetas.forEach((meta) => {
        const gastoAtual = gastosDoMes
          .filter(
            (g) =>
              (g.categoria_gasto || g.categoria || "").toLowerCase() ===
              meta.categoria.toLowerCase()
          )
          .reduce((acc, g) => acc + g.valor, 0);
        if (gastoAtual > meta.limite) {
          novasAlertas.push({
            tipo: "danger",
            titulo: `Meta de ${meta.categoria} estourada`,
            mensagem: `${formatCurrency(gastoAtual)} de ${formatCurrency(meta.limite)} (${((gastoAtual / meta.limite - 1) * 100).toFixed(0)}% acima).`,
          });
        }
      });

      // e) Economia negativa (Apenas Meus Gastos)
      const economiasMeusGastos = receitasFixasMensais - totalMeusGastos;
      if (economiasMeusGastos < 0) {
        novasAlertas.push({
          tipo: "danger",
          titulo: "Gastos superam a receita",
          mensagem: `Você está ${formatCurrency(Math.abs(economiasMeusGastos))} no vermelho este mês.`,
        });
      }

      setAlertas(novasAlertas);
    } catch (err) {
      console.error("Erro ao calcular alertas:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    calcularAlertas();
  }, [calcularAlertas]);

  return { alertas, loading, refetch: calcularAlertas };
};
