import type { ReactNode } from "react";

interface KpiStripProps {
  children: ReactNode;
  className?: string;
  "data-tour"?: string;
}

/**
 * De 2 a 4 indicadores. No desktop ficam em linha dentro de uma superfície; no
 * celular viram uma fileira que rola na horizontal com scroll-snap — empilhados,
 * ocupavam a primeira tela inteira antes do conteúdo.
 *
 * A fileira sangra até a borda da tela (o -mx-4 desfaz o respiro da página), e
 * o último indicador cortado pela borda é o que avisa que há mais.
 */
export function KpiStrip({ children, className = "", "data-tour": dataTour }: KpiStripProps) {
  return (
    <div
      data-tour={dataTour}
      className={`sem-barra -mx-4 px-4 scroll-px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory
        md:mx-0 md:px-5 md:py-5 md:gap-0 md:overflow-visible md:bg-surface-1 md:rounded
        md:grid md:[grid-template-columns:repeat(auto-fit,minmax(0,1fr))] ${className}`}
    >
      {children}
    </div>
  );
}

interface KpiProps {
  rotulo: ReactNode;
  /** Já formatado — normalmente um <Valor porte="medio"> ou <AnimatedNumber>. */
  valor: ReactNode;
  /** Linha fina de contexto ("0 de 2 acertaram"). */
  meta?: ReactNode;
  "data-tour"?: string;
}

export function Kpi({ rotulo, valor, meta, "data-tour": dataTour }: KpiProps) {
  return (
    <div
      data-tour={dataTour}
      className="snap-start shrink-0 w-[46%] min-w-[152px] bg-surface-1 rounded p-4
        md:w-auto md:min-w-0 md:bg-transparent md:rounded-none md:p-0 md:pr-6"
    >
      <p className="text-xs text-fg-2">{rotulo}</p>
      <div className="mt-1.5 text-fg">{valor}</div>
      {meta && <p className="mt-1 text-xs text-fg-3">{meta}</p>}
    </div>
  );
}
