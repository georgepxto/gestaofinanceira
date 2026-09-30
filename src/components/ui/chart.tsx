import { useEffect, useMemo, useState } from "react";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatDinheiro, formatDinheiroCompacto, ticksRedondos } from "../../utils/dinheiro";

/**
 * Tema único dos gráficos (Recharts).
 *
 * O Recharts escreve cor em atributo de SVG, onde var() não é garantido em todo
 * navegador — então as cores são lidas dos tokens do index.css no momento do
 * render, e relidas quando o tema troca. Nenhum hex mora aqui.
 */
const ler = (nome: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

export interface ChartCores {
  fg: string;
  fg2: string;
  fg3: string;
  line: string;
  surface2: string;
  surface3: string;
  accent: string;
  danger: string;
  categorias: string[];
}

/**
 * Muda quando a classe do <html> muda (tema). Observar a classe, e não o
 * contexto do tema, é o que garante ler os tokens DEPOIS da troca: o efeito do
 * ThemeProvider roda depois dos efeitos dos filhos.
 */
function useVersaoDoTema() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => setVersao((v) => v + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return versao;
}

export function useChartTheme() {
  const versao = useVersaoDoTema();

  return useMemo(() => {
    const cores: ChartCores = {
      fg: ler("--fg"),
      fg2: ler("--fg-2"),
      fg3: ler("--fg-3"),
      line: ler("--line"),
      surface2: ler("--surface-2"),
      surface3: ler("--surface-3"),
      accent: ler("--accent"),
      danger: ler("--danger"),
      categorias: Array.from({ length: 8 }, (_, i) => ler(`--cat-${i + 1}`)),
    };

    const tickEstilo = {
      fill: cores.fg3,
      fontSize: 12,
      fontFamily: "'Geist Mono', ui-monospace, monospace",
    };

    return {
      cores,
      /** Grid horizontal quase invisível. */
      grid: { stroke: cores.line, strokeOpacity: 0.6, vertical: false, strokeDasharray: "0" },
      eixoX: { tick: tickEstilo, axisLine: false, tickLine: false, tickMargin: 8 },
      eixoY: {
        tick: tickEstilo,
        axisLine: false,
        tickLine: false,
        width: 64,
        tickFormatter: (v: number) => formatDinheiroCompacto(v),
      },
      tooltip: {
        cursor: { fill: cores.surface3, fillOpacity: 0.4 },
        contentStyle: {
          backgroundColor: cores.surface2,
          border: `1px solid ${cores.line}`,
          borderRadius: 4,
          boxShadow: "none",
          padding: "8px 12px",
          fontSize: 12,
          color: cores.fg,
        },
        labelStyle: { color: cores.fg2, marginBottom: 4 },
        itemStyle: { color: cores.fg, fontFamily: "'Geist Mono', ui-monospace, monospace", padding: 0 },
        formatter: (v: ValueType | undefined) => formatDinheiro(Number(v ?? 0)),
      },
    };
  }, [versao]);
}

/** Domínio e ticks redondos para o eixo de dinheiro: sem rótulo repetido. */
export function eixoDinheiro(valores: number[], quantos = 4) {
  const max = Math.max(0, ...valores.filter(Number.isFinite));
  const ticks = ticksRedondos(max, quantos);
  return { ticks, domain: [0, ticks[ticks.length - 1] || 1] as [number, number] };
}

/** Cor de categoria pela posição (ver corDaCategoria em utils/categories). */
export function corCategoria(cores: ChartCores, indice: number) {
  return cores.categorias[((indice % 8) + 8) % 8];
}
