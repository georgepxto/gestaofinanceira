import { useState, type ReactNode } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { FolhaAcoes, type Acao } from "./FolhaAcoes";

export type { Acao };

interface ListRowProps {
  /**
   * Controle interativo à esquerda (o checkbox de "pago"). Fica FORA do alvo de
   * toque da linha — botão dentro de botão não é HTML válido.
   */
  prefixo?: ReactNode;
  /** Conteúdo do bloco de 36px (ícone lucide, ponto de categoria, avatar). */
  icone?: ReactNode;
  /** Bloco pronto no lugar do de 36px (um <Avatar>, por exemplo). */
  iconeCru?: ReactNode;
  titulo: ReactNode;
  /** Linha de meta em --fg-2: "Débito · Ana, Bruno". */
  meta?: ReactNode;
  /** Já formatado. Nunca é cortado: quem quebra linha é o título. */
  valor?: ReactNode;
  /** Abaixo do valor, menor ("de R$ 180,00"). */
  subvalor?: ReactNode;
  /** Pago/quitado: check pequeno e valor em --fg-2. Nunca riscado. */
  pago?: boolean;
  /** Ação primária — normalmente editar. Vira o alvo de toque da linha. */
  onAbrir?: () => void;
  /** Editar, excluir… No desktop aparecem no hover; no celular, no menu ⋯. */
  acoes?: Acao[];
  /** Algo sob a linha que ocupa a largura (barra de progresso). */
  rodape?: ReactNode;
  /** Item recém-criado: entra com fade e 8px de deslize. */
  novo?: boolean;
  dataTour?: string;
  className?: string;
  /** "div" fora de uma lista <ul> (o adaptador do LinhaLista, por exemplo). */
  as?: "li" | "div";
}

/**
 * A linha das listas: bloco de ícone, título, meta e valor. Sem card em volta —
 * a lista separa as linhas com um fio de 1px (ver <ListGroup>).
 */
export function ListRow({
  prefixo,
  icone,
  iconeCru,
  titulo,
  meta,
  valor,
  subvalor,
  pago = false,
  onAbrir,
  acoes,
  rodape,
  novo = false,
  dataTour,
  className = "",
  as: Tag = "li",
}: ListRowProps) {
  const [folhaAberta, setFolhaAberta] = useState(false);
  const tituloTexto = typeof titulo === "string" ? titulo : "item";

  const miolo = (
    <>
      {iconeCru ??
        (icone && (
          <span
            aria-hidden="true"
            // Com checkbox à esquerda, no celular o bloco sai: são 48px que o
            // título precisa para não quebrar em três linhas.
            className={`w-9 h-9 shrink-0 rounded-sm bg-surface-2 items-center justify-center text-fg-2 ${prefixo ? "hidden md:flex" : "flex"}`}
          >
            {icone}
          </span>
        ))}

      <span className="flex-1 min-w-0">
        <span className="block text-[15px] md:text-sm text-fg break-words">{titulo}</span>
        {meta && <span className="block text-xs text-fg-2 mt-0.5 break-words">{meta}</span>}
      </span>

      {valor !== undefined && (
        <span className="shrink-0 text-right">
          <span className={`flex items-center justify-end gap-1.5 valor text-[15px] md:text-sm ${pago ? "text-fg-2" : "text-fg"}`}>
            {pago && !prefixo && <Check className="w-3.5 h-3.5 text-fg-2" strokeWidth={2} aria-label="pago" />}
            {valor}
          </span>
          {subvalor && <span className="block valor text-xs text-fg-3 mt-0.5">{subvalor}</span>}
        </span>
      )}
    </>
  );

  const alvo = "flex items-center gap-3 flex-1 min-w-0 text-left py-3";

  return (
    <Tag
      data-tour={dataTour}
      className={`group relative list-none ${novo ? "animate-[entra-item_300ms_ease-out]" : ""} ${className}`}
    >
      <div className="flex items-center gap-3 min-h-[60px] md:min-h-[56px]">
        {prefixo}
        {onAbrir ? (
          <button type="button" onClick={onAbrir} className={`${alvo} rounded-sm`}>
            {miolo}
          </button>
        ) : (
          <div className={alvo}>{miolo}</div>
        )}

        {acoes && acoes.length > 0 && (
          <>
            {/* Desktop: aparecem no hover e no foco de teclado. */}
            <span className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              {acoes.map((acao) => (
                <button
                  key={acao.rotulo}
                  type="button"
                  onClick={acao.onClick}
                  title={acao.rotulo}
                  aria-label={`${acao.rotulo}: ${tituloTexto}`}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-surface-2 ${
                    acao.tom === "perigo" ? "text-fg-3 hover:text-danger-ink" : "text-fg-3 hover:text-fg"
                  }`}
                >
                  {acao.icone}
                </button>
              ))}
            </span>

            {/* Celular: um alvo de 44px que abre o menu com as ações nomeadas. */}
            <button
              type="button"
              onClick={() => setFolhaAberta(true)}
              aria-label={`Ações: ${tituloTexto}`}
              aria-haspopup="dialog"
              className="md:hidden w-11 h-11 -mr-2 shrink-0 rounded flex items-center justify-center text-fg-3"
            >
              <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <FolhaAcoes
              aberta={folhaAberta}
              titulo={tituloTexto}
              acoes={acoes}
              onFechar={() => setFolhaAberta(false)}
            />
          </>
        )}
      </div>
      {rodape && <div className="pb-3 -mt-1">{rodape}</div>}
    </Tag>
  );
}

interface ListGroupProps {
  /** "Hoje", "Ontem", "29 de set" — ver rotuloDia(). Sem título, só a lista. */
  titulo?: ReactNode;
  /** À direita do título: o total do dia, uma contagem. */
  aoLado?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Linhas agrupadas, com fio de 1px entre elas e cabeçalho em 12px --fg-3. */
export function ListGroup({ titulo, aoLado, children, className = "" }: ListGroupProps) {
  return (
    <section className={className}>
      {titulo && (
        <div className="flex items-baseline justify-between gap-3 pt-4 pb-1">
          <h3 className="text-xs text-fg-3">{titulo}</h3>
          {aoLado && <span className="valor text-xs text-fg-3">{aoLado}</span>}
        </div>
      )}
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}
