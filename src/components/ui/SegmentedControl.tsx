import type { ReactNode } from "react";
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
 */
export function SegmentedControl({
  segmentos,
  rotulo,
  cheio = false,
  tamanho = "md",
  className = "",
}: SegmentedControlProps) {
  const navegacao = segmentos.some((s) => s.to);
  const altura = tamanho === "sm" ? "h-8 text-[13px]" : "h-11 md:h-9 text-[15px] md:text-sm";

  const classe = (s: Segmento) =>
    `${cheio ? "flex-1" : ""} ${altura} px-3 rounded-sm whitespace-nowrap inline-flex items-center justify-center transition-colors disabled:opacity-40 ${
      s.ativo ? "bg-surface-1 text-fg" : "text-fg-2 hover:text-fg"
    }`;

  const Trilho = navegacao ? "nav" : "div";

  return (
    <Trilho
      aria-label={rotulo}
      role={navegacao ? undefined : "group"}
      className={`${cheio ? "flex" : "inline-flex"} p-0.5 gap-0.5 bg-surface-2 rounded-sm ${className}`}
    >
      {segmentos.map((s) =>
        s.to ? (
          <Link
            key={s.chave}
            to={s.to}
            aria-current={s.ativo ? "page" : undefined}
            className={classe(s)}
          >
            {s.rotulo}
          </Link>
        ) : (
          <button
            key={s.chave}
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
