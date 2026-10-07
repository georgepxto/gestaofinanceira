import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

export interface Segmento {
  chave: string;
  rotulo: ReactNode;
  ativo: boolean;
  /** Com `to`, o segmento é navegação (abas de sub-tela); sem, é um botão. */
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface SegmentedControlProps {
  segmentos: Segmento[];
  /** Nome do grupo para leitor de tela. */
  rotulo: string;
  /** Ocupa a largura toda, com segmentos iguais (abas do celular, formulário). */
  cheio?: boolean;
  tamanho?: "md" | "sm";
  className?: string;
}

/**
 * Escolha entre poucas opções vizinhas: trilho reto em --surface-2 e o item
 * ativo em --surface-1, como um papel por cima. Serve às abas de sub-tela do
 * celular (Contas / Cartões), ao Débito / Crédito do formulário e aos
 * alternadores de período.
 *
 * O papel é um só e DESLIZA até a opção escolhida, em vez de sumir de uma e
 * aparecer na outra. Até a primeira medida, a opção ativa pinta o próprio
 * fundo — nada pisca se o script demorar.
 */
export function SegmentedControl({
  segmentos,
  rotulo,
  cheio = false,
  tamanho = "md",
  className = "",
}: SegmentedControlProps) {
  const navegacao = segmentos.some((s) => s.to);
  const altura = tamanho === "sm" ? "h-11 md:h-8 text-xs" : "h-11 md:h-9 text-[15px] md:text-sm";

  const trilhoRef = useRef<HTMLElement | null>(null);
  const itens = useRef<Record<string, HTMLElement | null>>({});
  const [papel, setPapel] = useState<{ x: number; largura: number } | null>(null);
  const [pronto, setPronto] = useState(false);
  const ativo = segmentos.find((s) => s.ativo)?.chave;

  const medir = () => {
    const el = ativo ? itens.current[ativo] : null;
    const novo = el && el.offsetWidth ? { x: el.offsetLeft, largura: el.offsetWidth } : null;
    setPapel((atual) =>
      atual && novo && atual.x === novo.x && atual.largura === novo.largura ? atual : novo
    );
  };
  const medirRef = useRef(medir);
  medirRef.current = medir;

  useLayoutEffect(medir, [ativo, segmentos.length]);

  // O trilho muda de largura (rotação, barra lateral recolhendo): o papel
  // acompanha sem viajar.
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(() => medirRef.current());
    obs.observe(trilho);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (papel && !pronto) {
      const raf = requestAnimationFrame(() => setPronto(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [papel, pronto]);

  const comPapel = papel !== null;
  const classe = (s: Segmento) =>
    `relative z-[1] ${cheio ? "flex-1" : ""} ${altura} px-3 rounded-sm whitespace-nowrap inline-flex items-center justify-center transition-colors duration-300 disabled:opacity-40 ${
      s.ativo ? `${comPapel ? "" : "bg-surface-1"} text-fg` : "text-fg-2 hover:text-fg"
    }`;
  const guardar = (chave: string) => (el: HTMLElement | null) => {
    itens.current[chave] = el;
  };

  const Trilho = navegacao ? "nav" : "div";

  return (
    <Trilho
      ref={trilhoRef as never}
      aria-label={rotulo}
      role={navegacao ? undefined : "group"}
      className={`relative ${cheio ? "flex" : "inline-flex"} p-0.5 gap-0.5 bg-surface-2 rounded-sm ${className}`}
    >
      {papel && (
        <span
          aria-hidden="true"
          className={`absolute top-0.5 bottom-0.5 left-0 bg-surface-1 rounded-sm pointer-events-none ${
            pronto ? "viagem" : ""
          }`}
          style={{ transform: `translateX(${papel.x}px)`, width: papel.largura }}
        />
      )}
      {segmentos.map((s) =>
        s.to ? (
          <Link
            key={s.chave}
            ref={guardar(s.chave)}
            to={s.to}
            aria-current={s.ativo ? "page" : undefined}
            className={classe(s)}
          >
            {s.rotulo}
          </Link>
        ) : (
          <button
            key={s.chave}
            ref={guardar(s.chave)}
            type="button"
            onClick={s.onClick}
            disabled={s.disabled}
            aria-pressed={s.ativo}
            className={classe(s)}
          >
            {s.rotulo}
          </button>
        ),
      )}
    </Trilho>
  );
}
