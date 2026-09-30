import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export interface AcaoRapida {
  rotulo: string;
  Icone: LucideIcon;
  onClick?: () => void;
  to?: string;
  "data-tour"?: string;
}

/**
 * A fileira de atalhos logo abaixo de um saldo herói, como no N26 e no
 * Wealthsimple: bloco quadrado de 56px com ícone de traço fino e o nome embaixo.
 * No celular rola na horizontal se não couber.
 */
export function ActionRow({ acoes, className = "" }: { acoes: AcaoRapida[]; className?: string }) {
  return (
    <div className={`sem-barra -mx-4 px-4 md:mx-0 md:px-0 flex gap-4 md:gap-6 overflow-x-auto ${className}`}>
      {acoes.map(({ rotulo, Icone, onClick, to, "data-tour": dataTour }) => {
        const conteudo = (
          <>
            <span className="w-14 h-14 rounded bg-surface-2 flex items-center justify-center text-fg transition-colors group-hover:bg-surface-3">
              <Icone className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </span>
            <span className="text-xs text-fg-2 group-hover:text-fg transition-colors text-center leading-tight">
              {rotulo}
            </span>
          </>
        );
        const classe = "group shrink-0 w-16 flex flex-col items-center gap-2";
        return to ? (
          <Link key={rotulo} to={to} className={classe} data-tour={dataTour}>
            {conteudo}
          </Link>
        ) : (
          <button key={rotulo} type="button" onClick={onClick} className={classe} data-tour={dataTour}>
            {conteudo}
          </button>
        );
      })}
    </div>
  );
}
