import type { CSSProperties } from "react";
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
 * No celular os atalhos dividem a largura em colunas iguais, alinhados às
 * bordas do resto da tela; no desktop ficam lado a lado.
 */
export function ActionRow({ acoes, className = "" }: { acoes: AcaoRapida[]; className?: string }) {
  return (
    <div
      className={`grid gap-2 [grid-template-columns:repeat(var(--colunas),minmax(0,1fr))] md:flex md:gap-6 ${className}`}
      style={{ "--colunas": acoes.length } as CSSProperties}
    >
      {acoes.map(({ rotulo, Icone, onClick, to, "data-tour": dataTour }) => {
        const conteudo = (
          <>
            <span className="w-14 h-14 rounded bg-surface-2 flex items-center justify-center text-fg transition-[background-color,transform] duration-200 group-hover:bg-surface-3 group-active:scale-95">
              <Icone className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </span>
            <span className="text-xs text-fg-2 group-hover:text-fg transition-colors text-center leading-tight">
              {rotulo}
            </span>
          </>
        );
        const classe = "group min-w-0 md:shrink-0 md:w-16 flex flex-col items-center gap-2";
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
