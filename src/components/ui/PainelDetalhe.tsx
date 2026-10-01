import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks";

interface PainelDetalheProps {
  aberto: boolean;
  titulo: string;
  /** Linha abaixo do título (o total, por exemplo). */
  resumo?: ReactNode;
  onFechar: () => void;
  children: ReactNode;
}

/**
 * Painel só de leitura: abre, mostra, fecha. Mesma casca do formulário (sobe
 * de baixo no celular, entra pela direita no desktop), sem botões de ação —
 * o X, o Esc ou um toque fora fecham. O conteúdo rola quando é comprido.
 */
export function PainelDetalhe({ aberto, titulo, resumo, onFechar, children }: PainelDetalheProps) {
  const painelRef = useFocusTrap<HTMLDivElement>(onFechar, aberto);

  // Fundo parado enquanto o painel está aberto.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal">
      <div
        className="absolute inset-0 bg-scrim animate-[fundo-entra_200ms_ease-out]"
        aria-hidden="true"
        /* ds-ok: fundo de dispensa. Teclado fecha no Esc e no X — o fundo não entra na ordem de foco de propósito */
        onClick={onFechar}
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-detalhe-titulo"
        className="absolute flex flex-col bg-surface-1
          inset-x-0 bottom-0 max-h-[85dvh] rounded-t
          animate-[sheet-sobe_250ms_var(--ease-out-cubic)]
          md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:max-h-none md:rounded-none
          md:animate-[sheet-direita_250ms_var(--ease-out-cubic)]"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-line">
          <div className="min-w-0">
            <h2 id="painel-detalhe-titulo" className="text-lg font-medium text-fg">
              {titulo}
            </h2>
            {resumo && <p className="mt-1 text-sm text-fg-2">{resumo}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            data-autofocus
            className="w-11 h-11 md:w-8 md:h-8 -mr-3 md:-mr-2 -mt-2 md:-mt-1 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg transition-colors"
          >
            <X className="w-5 h-5 md:w-4 md:h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
