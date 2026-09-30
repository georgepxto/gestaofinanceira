import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks";

export interface Acao {
  rotulo: string;
  icone: ReactNode;
  onClick: () => void;
  tom?: "neutro" | "perigo";
}

interface FolhaAcoesProps {
  aberta: boolean;
  titulo: string;
  acoes: Acao[];
  onFechar: () => void;
}

/**
 * O menu ⋯ de um item no celular: cada ação é uma linha de 52px com nome, que
 * quatro ícones sem legenda nunca tiveram. A destrutiva fica por último, em
 * --danger, separada por um fio.
 */
export const FolhaAcoes = ({ aberta, titulo, acoes, onFechar }: FolhaAcoesProps) => {
  const folhaRef = useFocusTrap(onFechar, aberta);

  if (!aberta) return null;

  const neutras = acoes.filter((a) => a.tom !== "perigo");
  const perigosas = acoes.filter((a) => a.tom === "perigo");

  const Linha = ({ acao }: { acao: Acao }) => (
    <button
      type="button"
      onClick={() => {
        acao.onClick();
        onFechar();
      }}
      className={`w-full h-[52px] px-5 flex items-center gap-3 text-[15px] text-left transition-colors active:bg-surface-3 ${
        acao.tom === "perigo" ? "text-danger-ink" : "text-fg"
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0 text-current" aria-hidden="true">
        {acao.icone}
      </span>
      {acao.rotulo}
    </button>
  );

  return createPortal(
    <>
      <div
        className="md:hidden fixed inset-0 z-modal bg-scrim animate-[fundo-entra_150ms_ease-out]"
        aria-hidden="true"
        /* ds-ok: fundo de dispensa. Quem usa teclado fecha no Esc — o fundo não entra na ordem de foco de propósito */
        onClick={onFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ações: ${titulo}`}
        ref={folhaRef}
        className="md:hidden fixed inset-x-0 bottom-0 z-modal rounded-t bg-surface-2 pb-[max(1rem,env(safe-area-inset-bottom))] animate-[sheet-sobe_250ms_var(--ease-out-cubic)]"
      >
        <div className="w-9 h-1 rounded-sm bg-surface-3 mx-auto mt-2.5" aria-hidden="true" />
        <p className="px-5 pt-3 pb-2 text-sm text-fg-2 break-words">{titulo}</p>

        {neutras.map((acao) => (
          <Linha key={acao.rotulo} acao={acao} />
        ))}

        {perigosas.length > 0 && (
          <div className="border-t border-line mt-1 pt-1">
            {perigosas.map((acao) => (
              <Linha key={acao.rotulo} acao={acao} />
            ))}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};
