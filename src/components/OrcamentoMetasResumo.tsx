import { useEffect, useMemo, useState } from "react";
import { Target } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../utils/calculations";
import type { MeuGasto, MetaGasto } from "../types";

interface OrcamentoMetasResumoProps {
  /** Gastos pessoais do mês em visualização (vem do contexto). */
  meusGastosDoMes: MeuGasto[];
}

interface LinhaConsumo extends MetaGasto {
  gasto: number;
  pct: number;
}

function corDoConsumo(pct: number) {
  if (pct > 100) return { barra: "bg-red-500", texto: "text-red-600" };
  if (pct >= 80) return { barra: "bg-amber-500", texto: "text-amber-600" };
  return { barra: "bg-emerald-500", texto: "text-emerald-600 dark:text-emerald-400" };
}

/**
 * Faixa "orçado vs. gasto" — o elemento-assinatura da aba Orçamento.
 * Cruza, só em leitura, as metas por categoria com os gastos pessoais do mês,
 * mostrando de relance onde o consumo está perto do teto. Não altera nenhuma
 * regra de negócio: replica o mesmo cálculo de consumo já usado no Dashboard.
 *
 * Quieto por padrão: se não há metas, não renderiza nada.
 */
export function OrcamentoMetasResumo({ meusGastosDoMes }: OrcamentoMetasResumoProps) {
  const [metas, setMetas] = useState<MetaGasto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!supabase) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase.from("metas_gasto").select("*").order("categoria");
      if (ativo) {
        setMetas(data || []);
        setLoaded(true);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const linhas = useMemo<LinhaConsumo[]>(() => {
    return metas
      .map((meta) => {
        const gasto = meusGastosDoMes
          .filter(
            (g) =>
              (g.categoria_gasto || g.categoria || "").toLowerCase() ===
              meta.categoria.toLowerCase()
          )
          .reduce((soma, g) => soma + g.valor, 0);
        const pct = meta.limite > 0 ? (gasto / meta.limite) * 100 : 0;
        return { ...meta, gasto, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [metas, meusGastosDoMes]);

  // Quieto enquanto carrega ou quando não há metas definidas.
  if (!loaded || linhas.length === 0) return null;

  const totalGasto = linhas.reduce((soma, l) => soma + l.gasto, 0);
  const totalLimite = linhas.reduce((soma, l) => soma + l.limite, 0);
  const pctTotal = totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0;
  const corTotal = corDoConsumo(pctTotal);
  const restante = totalLimite - totalGasto;

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Orçado versus gasto do mês"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            <Target className="h-3.5 w-3.5" />
            Orçado vs. gasto
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalGasto)}
            <span className="text-base font-medium text-zinc-500 dark:text-zinc-400">
              {" "}
              / {formatCurrency(totalLimite)}
            </span>
          </p>
        </div>
        <p className={`shrink-0 text-right text-sm font-medium ${corTotal.texto}`}>
          {restante >= 0
            ? `${formatCurrency(restante)} disponível`
            : `${formatCurrency(Math.abs(restante))} acima`}
        </p>
      </div>

      {/* Barra total */}
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.04]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${corTotal.barra}`}
          style={{ width: `${Math.min(pctTotal, 100)}%` }}
        />
      </div>

      {/* Trilha por categoria */}
      <ul className="space-y-3">
        {linhas.map((linha) => {
          const cor = corDoConsumo(linha.pct);
          return (
            <li key={linha.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium capitalize text-zinc-700 dark:text-zinc-300">
                  {linha.categoria}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  <span className={cor.texto}>{formatCurrency(linha.gasto)}</span>
                  {" / "}
                  {formatCurrency(linha.limite)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.04]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${cor.barra}`}
                  style={{ width: `${Math.min(linha.pct, 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
