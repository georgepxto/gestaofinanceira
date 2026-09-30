import { HedgeMark } from "../landing/HedgeMark";

interface LogoProps {
  /** Esconde o nome e deixa só o monograma (barra recolhida, splash). */
  soMarca?: boolean;
  className?: string;
}

/**
 * O logo do app: o monograma da landing, no laranja da marca, e o nome em
 * Switzer. É o mesmo desenho do cabeçalho da landing — o app e a página de
 * apresentação são uma marca só.
 */
export function Logo({ soMarca = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-fg ${className}`}>
      <HedgeMark
        className="h-[22px] w-auto shrink-0 text-accent"
        title={soMarca ? "Hedge" : undefined}
      />
      {!soMarca && <span className="text-base font-medium tracking-[-0.01em]">Hedge</span>}
    </span>
  );
}
