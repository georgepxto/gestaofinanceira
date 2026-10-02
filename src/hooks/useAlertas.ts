import { useState, useEffect, useCallback } from "react";
import { subMonths, startOfMonth, getDaysInMonth, getDate, parseISO, differenceInCalendarMonths } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAppContext } from "../context";
import { formatCurrency, isGastoAtivoNoMes } from "../utils/calculations";
import { categoriaDeGasto } from "../utils/categories";
import type { CartaoCredito, MeuGasto, Gasto, Receita, MetaGasto } from "../types";
import { gastosPessoaisDoMes, valorDaMinhaParte } from "../utils/gastosDoMes";

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

      // Buscar dados em paralelo
      const [
        { data: meusGastos },
        { data: gastosCompartilhados },
        { data: receitas },
        { data: metas },
        { data: cartoesRaw },
      ] = await Promise.all([
        supabase.from("meus_gastos").select("*"),
        supabase.from("gastos").select("*"),
        supabase.from("receitas").select("*"),
        supabase.from("metas_gasto").select("*"),
        supabase.from("cartoes_credito").select("*"),
      ]);
      const cartoes = (cartoesRaw as CartaoCredito[]) || [];

      const todosGastos = (meusGastos as MeuGasto[]) || [];
      const todosCompartilhados = (gastosCompartilhados as Gasto[]) || [];
      const todasReceitas = (receitas as Receita[]) || [];
      const todasMetas = (metas as MetaGasto[]) || [];

      // Gastos pessoais do mês atual e anterior
      // Mesmas regras de Lançamentos e do Início (utils/gastosDoMes).
      const gastosDoMes = gastosPessoaisDoMes(todosGastos, cartoes, mesAtual);
      const gastosDoMesAnterior = gastosPessoaisDoMes(todosGastos, cartoes, mesAnterior);

      // Compartilhados do mês
      const compartilhadosDoMes = todosCompartilhados.filter((g) =>
        isGastoAtivoNoMes(g, mesAtual)
      );

      // Receitas fixas (Match Dashboard Logic)
      const receitasFixasMensais = todasReceitas
        .filter((r) => r.tipo === "fixo" || r.tipo === "recorrente")
        .reduce((acc, r) => acc + r.valor, 0);

      // Totais
      const totalGastosMes = gastosDoMes.reduce((acc, g) => acc + valorDaMinhaParte(g), 0);
      const totalEmprestimosMes = compartilhadosDoMes.reduce(
        (acc, g) => acc + g.valor_total / g.num_parcelas,
        0
      );
      // 2. Gastos Fixos (ignora data, sempre conta se ativo)
      const gastosFixos = todosGastos
        .filter((g) => g.categoria === "fixo" && g.ativo !== false)
        .reduce((acc, g) => acc + g.valor, 0);

      // 3. Gastos Variáveis (apenas mês atual)
      const gastosVariaveis = gastosDoMes
        .filter((g) => g.categoria === "pessoal")
        .reduce((acc, g) => acc + valorDaMinhaParte(g), 0);

      const totalMeusGastos = gastosFixos + gastosVariaveis;

      const novasAlertas: Alerta[] = [];

      // a) Categorias com aumento ≥30% vs mês anterior
      const catMapAtual = new Map<string, number>();
      gastosDoMes.forEach((g) => {
        const cat = categoriaDeGasto(g);
        catMapAtual.set(cat, (catMapAtual.get(cat) || 0) + valorDaMinhaParte(g));
      });
      const catMapAnterior = new Map<string, number>();
      gastosDoMesAnterior.forEach((g) => {
        const cat = categoriaDeGasto(g);
        catMapAnterior.set(cat, (catMapAnterior.get(cat) || 0) + valorDaMinhaParte(g));
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
      // Só compra parcelada (2x ou mais, não recorrente) cuja ÚLTIMA parcela
      // cai neste mês. Antes o Math.min contava também tudo o que já tinha
      // acabado em meses passados — e saíam "308 parcelas acabam este mês".
      const parcelasAcabando = todosCompartilhados.filter((g) => {
        if (g.recorrente || (g.num_parcelas || 1) < 2) return false;
        const parcelaDoMes = differenceInCalendarMonths(agora, parseISO(g.data_inicio)) + 1;
        return parcelaDoMes === g.num_parcelas;
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
            (g) => categoriaDeGasto(g).toLowerCase() === meta.categoria.toLowerCase()
          )
          .reduce((acc, g) => acc + valorDaMinhaParte(g), 0);
        if (gastoAtual > meta.limite) {
          novasAlertas.push({
            tipo: "danger",
            titulo: `Limite de ${meta.categoria} estourado`,
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
