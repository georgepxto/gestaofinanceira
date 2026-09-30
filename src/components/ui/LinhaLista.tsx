import type { ReactNode } from "react";
import { ListRow, type Acao } from "./ListRow";

export type { Acao };

interface LinhaListaProps {
  prefixo?: ReactNode;
  icone?: ReactNode;
  titulo: string;
  meta?: ReactNode;
  valor: ReactNode;
  /** Pago, quitado, suspenso: vira o estado "pago" do ListRow (check, sem risco). */
  atenuado?: boolean;
  onAbrir?: () => void;
  acoes?: Acao[];
  /** Obsoleto: as ações do desktop agora saem de `acoes`, no hover. */
  acoesDesktop?: ReactNode;
  classeCaixa?: string;
  dataTour?: string;
}

/**
 * Adaptador do nome antigo para o <ListRow>, enquanto as telas migram. Tela
 * nova usa ListRow e ListGroup direto.
 */
export const LinhaLista = ({ atenuado, acoesDesktop, classeCaixa = "", acoes, ...props }: LinhaListaProps) => (
  <div className={`flex items-center ${classeCaixa}`}>
    <ListRow {...props} as="div" pago={atenuado} acoes={acoes} className="flex-1 min-w-0" />
    {/* Sem `acoes`, os botões que a tela ainda desenha à mão seguem no desktop. */}
    {!acoes && acoesDesktop && <span className="hidden md:flex items-center gap-1">{acoesDesktop}</span>}
  </div>
);

/** O contêiner da lista: fio de 1px entre as linhas. */
export const LISTA_CLASSES = "divide-y divide-line";
