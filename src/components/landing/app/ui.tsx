import type { ReactNode } from "react";

/* Recorte de uma tela do app na landing: a parte de cima inteira e a base
   dissolvendo (lp-crop). As telas em si moram em telas.tsx e usam os
   componentes do app. */
export function ScreenCrop({ label, height, children }: { label: string; height?: number; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className={`overflow-hidden sm:rounded ${height ? "lp-crop" : ""}`} style={height ? { maxHeight: height } : undefined}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
