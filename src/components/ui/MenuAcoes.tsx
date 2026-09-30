import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { FolhaAcoes, type Acao } from "./FolhaAcoes";
import { useIsMobile } from "../../hooks";

interface MenuAcoesProps {
  /** Nome do item, para o rótulo acessível e o título da folha. */
  titulo: string;
  acoes: Acao[];
  className?: string;
}

/**
 * O menu ⋯ de um item que não é linha de lista (bloco de fixo, card de pessoa).
 * No celular abre a folha de ações; no desktop, um menu suspenso ao lado.
 */
export function MenuAcoes({ titulo, acoes, className = "" }: MenuAcoesProps) {
  const [aberto, setAberto] = useState(false);
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto || isMobile) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto, isMobile]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Ações: ${titulo}`}
        aria-haspopup={isMobile ? "dialog" : "menu"}
        aria-expanded={aberto}
        className="w-11 h-11 md:w-8 md:h-8 -mr-2 md:mr-0 rounded flex items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 md:w-4 md:h-4" strokeWidth={1.5} />
      </button>

      {isMobile ? (
        <FolhaAcoes aberta={aberto} titulo={titulo} acoes={acoes} onFechar={() => setAberto(false)} />
      ) : (
        aberto && (
          <div
            role="menu"
            aria-label={`Ações: ${titulo}`}
            className="absolute right-0 top-full mt-1 z-dropdown min-w-[200px] bg-surface-2 border border-line rounded py-1 animate-[fundo-entra_120ms_ease-out]"
          >
            {acoes.map((acao, i) => (
              <button
                key={acao.rotulo}
                type="button"
                role="menuitem"
                autoFocus={i === 0}
                onClick={() => {
                  setAberto(false);
                  acao.onClick();
                }}
                className={`w-full h-9 px-3 flex items-center gap-2.5 text-sm text-left transition-colors hover:bg-surface-3 ${
                  acao.tom === "perigo" ? "text-danger-ink" : "text-fg"
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">
                  {acao.icone}
                </span>
                {acao.rotulo}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
