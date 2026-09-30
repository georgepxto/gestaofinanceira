import type { ReactNode } from "react";

export type TomPill = "neutro" | "atencao" | "perigo";

const TOM: Record<TomPill, string> = {
  // Fundo do tom a 12% e texto no tom cheio. O texto usa a versão "ink", que
  // no claro é um degrau mais funda para passar em AA sobre o branco.
  neutro: "bg-fg-2/[0.12] text-fg-2",
  atencao: "bg-accent/[0.12] text-accent-ink",
  perigo: "bg-danger/[0.12] text-danger-ink",
};

/** Estado curto: "pago", "vence hoje", "estourou". 20px de altura, raio de 2px. */
export function Pill({ tom = "neutro", children, className = "" }: { tom?: TomPill; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center h-5 px-1.5 rounded-sm text-xs leading-none whitespace-nowrap ${TOM[tom]} ${className}`}
    >
      {children}
    </span>
  );
}
