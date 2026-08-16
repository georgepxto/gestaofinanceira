import type { ReactNode } from "react";
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
 * As ações secundárias de um item de lista, no mobile.
 *
 * Na linha elas eram quatro botões-fantasma de ~30px encostados uns nos outros
 * — abaixo do mínimo de 44px, com *Excluir* colado em *Editar*. Aqui cada ação
 * é uma linha de 52px e **ganha nome**, que quatro ícones sem legenda nunca
 * tiveram. A destrutiva fica por último, em vermelho, separada por um fio.
 *
 * Sem gesto de arrastar de propósito: é invisível, briga com a rolagem da lista
 * e não tem equivalente de teclado.
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
      className={`w-full h-[52px] px-5 flex items-center gap-3 text-[15px] text-left transition-colors active:bg-zinc-50 dark:active:bg-white/[0.04] ${
        acao.tom === "perigo"
          ? "text-red-600 dark:text-red-400"
          : "text-zinc-800 dark:text-zinc-100"
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        {acao.icone}
      </span>
      {acao.rotulo}
    </button>
  );

  return (
    <>
      <div
        className="md:hidden fixed inset-0 z-modal bg-black/60"
        aria-hidden="true"
        /* ds-ok: fundo de dispensa. Quem usa teclado fecha no Esc — o fundo não entra na ordem de foco de propósito */
        onClick={onFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ações de ${titulo}`}
        ref={folhaRef}
        className="md:hidden fixed inset-x-0 bottom-0 z-modal rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/[0.09] shadow-xl dark:shadow-black/60 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-white/[0.14] mx-auto mt-2.5" aria-hidden="true" />
        <p className="px-5 pt-3 pb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {titulo}
        </p>

        {neutras.map((acao) => (
          <Linha key={acao.rotulo} acao={acao} />
        ))}

        {perigosas.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-white/[0.05] mt-1 pt-1">
            {perigosas.map((acao) => (
              <Linha key={acao.rotulo} acao={acao} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
