import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  Icone: LucideIcon;
  /** Uma frase. */
  frase: ReactNode;
  /** Complemento opcional, menor. */
  detalhe?: ReactNode;
  /** Um botão, quando existe um próximo passo óbvio. */
  acao?: ReactNode;
  compacto?: boolean;
  className?: string;
}

/** Ícone pequeno de traço fino, sem círculo em volta; uma frase; talvez um botão. */
export function EmptyState({ Icone, frase, detalhe, acao, compacto = false, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center gap-2 ${compacto ? "py-8" : "py-14"} ${className}`}>
      <Icone className="w-5 h-5 text-fg-3" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-sm text-fg-2 max-w-xs">{frase}</p>
      {detalhe && <p className="text-xs text-fg-3 max-w-xs">{detalhe}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
