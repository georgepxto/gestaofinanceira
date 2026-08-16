import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { FolhaAcoes, type Acao } from "./FolhaAcoes";

export type { Acao };

interface LinhaListaProps {
  /**
   * Controle interativo à esquerda (o checkbox de "pago"). Fica FORA do alvo de
   * toque da linha — botão dentro de botão não é HTML válido, e clicar em
   * "pago" não pode abrir a edição.
   */
  prefixo?: ReactNode;
  /** Quadrado de 36px à esquerda, decorativo. */
  icone?: ReactNode;
  titulo: string;
  /** Segunda linha: data, vencimento, badges. No máximo dois no mobile. */
  meta?: ReactNode;
  /** Já formatado. Não recebe `truncate`: quem cede espaço é o título. */
  valor: ReactNode;
  /** Pago, quitado, suspenso. Um recurso só: texto atenuado com risco. */
  atenuado?: boolean;
  /** Ação primária — normalmente editar. Vira o alvo de toque da linha inteira. */
  onAbrir?: () => void;
  /** Secundárias. No mobile viram folha; no desktop, os botões que a tela já desenha. */
  acoes?: Acao[];
  /** Botões-fantasma do desktop, escondidos no mobile pela própria linha. */
  acoesDesktop?: ReactNode;
  /** Sobrepõe fundo e borda da caixa — usado pela linha de dívida (âmbar). */
  classeCaixa?: string;
  /** Repassado à caixa, para âncoras de tour. */
  dataTour?: string;
}

/**
 * A linha de duas linhas das listas do app.
 *
 * Numa tela de 390px, título, badges e valor disputavam a mesma linha e o valor
 * — o dado que a pessoa está procurando — era o último a caber. Aqui título e
 * meta empilham, o valor fica à direita do título e nunca é cortado.
 *
 * No mobile a lista é fio de 1px entre linhas; a partir de `md:` volta a ser a
 * caixa com `bg-app-row`, raio e borda que o desktop já tinha. Todas as regras
 * novas vivem abaixo de `md:` de propósito.
 */
export const LinhaLista = ({
  prefixo,
  icone,
  titulo,
  meta,
  valor,
  atenuado = false,
  onAbrir,
  acoes,
  acoesDesktop,
  classeCaixa = "",
  dataTour,
}: LinhaListaProps) => {
  const [folhaAberta, setFolhaAberta] = useState(false);

  const conteudo = (
    <>
      {icone && (
        <span className="w-9 h-9 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          {icone}
        </span>
      )}

      <span className="flex-1 min-w-0">
        <span
          className={`block text-sm font-semibold truncate ${
            // Atenuado é UM recurso: cor mais fraca com risco. Empilhar opacity
            // por cima deixa o texto ilegível no escuro.
            atenuado
              ? "text-zinc-500 dark:text-zinc-400 line-through"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {titulo}
        </span>
        {meta && (
          <span className="block font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {meta}
          </span>
        )}
      </span>

      <span
        className={`font-mono valor text-[15px] font-semibold flex-shrink-0 ${
          atenuado ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {valor}
      </span>
    </>
  );

  // A caixa é o contêiner, não o botão: no desktop os botões-fantasma precisam
  // ficar DENTRO dela, como a tela já desenhava.
  const CLASSES_CAIXA =
    "flex items-center gap-3 w-full px-4 py-3 min-h-[60px] " +
    "md:px-3.5 md:py-3.5 md:rounded-xl md:bg-app-row md:dark:bg-white/[0.03] " +
    "md:border md:border-zinc-100 md:dark:border-white/[0.05] " +
    classeCaixa;

  const CLASSES_ALVO =
    "flex items-center gap-3 flex-1 min-w-0 text-left -my-3 py-3 md:-my-3.5 md:py-3.5 " +
    "transition-colors active:bg-zinc-50 dark:active:bg-white/[0.04]";

  return (
    <div className={CLASSES_CAIXA} data-tour={dataTour}>
      {prefixo}
      {onAbrir ? (
        <button type="button" onClick={onAbrir} className={CLASSES_ALVO}>
          {conteudo}
        </button>
      ) : (
        <div className={CLASSES_ALVO}>{conteudo}</div>
      )}

      {acoes && acoes.length > 0 && (
        <>
          {/* Mobile: um alvo de 44px que abre a folha, no lugar de quatro de 30px. */}
          <button
            type="button"
            onClick={() => setFolhaAberta(true)}
            aria-label={`Ações de ${titulo}`}
            aria-haspopup="dialog"
            className="md:hidden w-11 h-11 -mr-2 flex items-center justify-center flex-shrink-0 rounded-lg text-zinc-400 dark:text-zinc-500 active:bg-zinc-50 dark:active:bg-white/[0.04]"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <FolhaAcoes
            aberta={folhaAberta}
            titulo={titulo}
            acoes={acoes}
            onFechar={() => setFolhaAberta(false)}
          />
        </>
      )}

      {/* Desktop: os botões-fantasma que a tela já desenhava, intactos. */}
      {acoesDesktop && <span className="hidden md:flex items-center gap-1">{acoesDesktop}</span>}
    </div>
  );
};

/** O contêiner da lista: fio no mobile, respiro entre caixas no desktop. */
export const LISTA_CLASSES =
  "divide-y divide-zinc-100 dark:divide-white/[0.05] md:divide-y-0 md:space-y-2.5 md:px-5 md:pb-5";
