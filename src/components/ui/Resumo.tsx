import type { ReactNode } from "react";
import { KpiStrip, Kpi } from "./KpiStrip";

interface ResumoProps {
  children: ReactNode;
  className?: string;
  "data-tour"?: string;
}

/** Adaptador do nome antigo para o <KpiStrip>. */
export const Resumo = ({ children, className = "", "data-tour": dataTour }: ResumoProps) => (
  <KpiStrip className={className} data-tour={dataTour}>
    {children}
  </KpiStrip>
);

interface ResumoItemProps {
  rotulo: ReactNode;
  children: ReactNode;
  apoio?: ReactNode;
  tomRotulo?: "neutro" | "acento";
  "data-tour"?: string;
}

/** Adaptador do nome antigo para o <Kpi>. */
export const ResumoItem = ({ rotulo, children, apoio, "data-tour": dataTour }: ResumoItemProps) => (
  <Kpi rotulo={rotulo} valor={children} meta={apoio} data-tour={dataTour} />
);
