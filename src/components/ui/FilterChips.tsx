import { useRef, type ReactNode } from "react";
import { CalendarDays, X } from "lucide-react";

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
  `shrink-0 h-11 md:h-8 px-3 rounded-sm text-sm whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
    ativo ? "bg-surface-1 text-fg ring-1 ring-inset ring-fg-3" : "bg-surface-2 text-fg-2 hover:text-fg"
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

/**
 * O chip "Dia": abre o seletor de data nativo e vira "Dia 12" quando há um dia
 * escolhido, com um "×" ao lado para limpar.
 */
export function ChipDia({
  valor,
  onChange,
  min,
  max,
  "data-tour": dataTour,
}: {
  /** "yyyy-MM-dd" ou "". */
  valor: string;
  onChange: (valor: string) => void;
  min: string;
  max: string;
  "data-tour"?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const dia = valor ? parseInt(valor.substring(8, 10), 10) : null;

  const abrir = () => {
    const input = ref.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <span className="relative inline-flex shrink-0 gap-px" data-tour={dataTour}>
      <button type="button" onClick={abrir} aria-pressed={!!valor} className={chipClasse(!!valor)}>
        <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
        {dia ? `Dia ${dia}` : "Dia"}
      </button>
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar filtro de dia"
          className={`${chipClasse(true)} px-2`}
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      )}
      {/* O seletor nativo, aberto pelo chip. Fora da vista, mas no lugar do
          chip, para o popup nascer ali. */}
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-label="Dia do mês"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="absolute left-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
      />
    </span>
  );
}
