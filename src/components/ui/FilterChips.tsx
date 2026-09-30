import type { ReactNode } from "react";

export interface Filtro<T extends string = string> {
  valor: T;
  rotulo: ReactNode;
}

interface FilterChipsProps<T extends string> {
  filtros: Filtro<T>[];
  ativo: T;
  onChange: (valor: T) => void;
  rotulo: string;
  /** Chip extra no fim da linha (o "Dia", que abre o seletor de data). */
  extra?: ReactNode;
  className?: string;
}

/** Classe de um chip, para quem desenha um chip fora da lista (o "Dia"). */
export const chipClasse = (ativo: boolean) =>
  `shrink-0 h-9 md:h-8 px-3 rounded-sm text-sm whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
    ativo ? "bg-surface-1 text-fg ring-1 ring-inset ring-line" : "bg-surface-2 text-fg-2 hover:text-fg"
  }`;

/** Filtros numa linha só, retos. Rola na horizontal no celular se precisar. */
export function FilterChips<T extends string>({ filtros, ativo, onChange, rotulo, extra, className = "" }: FilterChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={`sem-barra -mx-4 px-4 md:mx-0 md:px-0 flex gap-1.5 overflow-x-auto ${className}`}
    >
      {filtros.map((f) => (
        <button
          key={f.valor}
          type="button"
          aria-pressed={ativo === f.valor}
          onClick={() => onChange(f.valor)}
          className={chipClasse(ativo === f.valor)}
        >
          {f.rotulo}
        </button>
      ))}
      {extra}
    </div>
  );
}
