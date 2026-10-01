import { useState } from "react";
import { Check, ChevronDown, ChevronRight, CreditCard, Landmark, Plus, Repeat, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Surface } from "../ui/Surface";
import { ListGroup, ListRow } from "../ui/ListRow";

export interface Passo {
  chave: string;
  titulo: string;
  detalhe: string;
  Icone: LucideIcon;
  feito: boolean;
  /** Ausente quando o passo depende de outro (sem conta, renda não entra no saldo). */
  onFazer?: () => void;
  opcional?: boolean;
}

interface PrimeirosPassosProps {
  passos: Passo[];
  onDispensar: () => void;
}

/**
 * O que falta para o app mostrar o retrato inteiro, no Início, no ritmo da
 * pessoa. Cada item se marca sozinho quando é feito (lido dos dados, não de um
 * clique), e o cartão some quando tudo foi feito ou quando ela dispensa.
 *
 * Fica abaixo do saldo e, fechado, ocupa uma linha: o progresso e o próximo
 * passo. A lista inteira abre em "Ver todos" — o saldo é a resposta da tela,
 * a lista de tarefas não pode empurrá-lo para baixo.
 */
export function PrimeirosPassos({ passos, onDispensar }: PrimeirosPassosProps) {
  const [aberto, setAberto] = useState(false);
  const feitos = passos.filter((p) => p.feito).length;
  const proximo = passos.find((p) => !p.feito && p.onFazer);
  return (
    <Surface as="section" aria-label="Primeiros passos">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-fg">
          Primeiros passos <span className="text-fg-2">· {feitos} de {passos.length}</span>
        </p>
        <div className="shrink-0 flex items-center -my-2 -mr-2 text-xs text-fg-2">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="inline-flex items-center gap-1 min-h-[44px] md:min-h-[32px] px-2 rounded-sm hover:text-fg transition-colors"
          >
            {aberto ? "Fechar" : "Ver todos"}
            <ChevronDown className={`w-3.5 h-3.5 viagem ${aberto ? "rotate-180" : ""}`} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDispensar}
            className="inline-flex items-center min-h-[44px] md:min-h-[32px] px-2 rounded-sm hover:text-fg transition-colors"
          >
            Dispensar
          </button>
        </div>
      </div>
      {/* Um segmento por passo: o cheio é o feito. */}
      <div className="flex gap-1 mt-3" aria-hidden="true">
        {passos.map((p) => (
          <span key={p.chave} className={`h-1 flex-1 transition-colors duration-500 ${p.feito ? "bg-fg" : "bg-surface-3"}`} />
        ))}
      </div>
      {!aberto && proximo && (
        <button
          type="button"
          onClick={proximo.onFazer}
          className="group mt-3 w-full flex items-center justify-between gap-3 min-h-[44px] text-left"
        >
          <span className="min-w-0 text-sm">
            <span className="text-fg-2">Próximo: </span>
            <span className="text-fg">{proximo.titulo}</span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-fg-3 group-hover:text-fg transition-colors" strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
      {aberto && (
        <ListGroup className="mt-2">
          {passos.map((p) => (
            <ListRow
              key={p.chave}
              icone={p.feito ? <Check className="w-4 h-4" strokeWidth={2} /> : <p.Icone className="w-4 h-4" strokeWidth={1.5} />}
              titulo={p.titulo}
              meta={p.feito ? "Feito" : p.opcional ? `${p.detalhe} Opcional.` : p.detalhe}
              onAbrir={p.feito ? undefined : p.onFazer}
              pago={p.feito}
            />
          ))}
        </ListGroup>
      )}
    </Surface>
  );
}

export const ICONES_DOS_PASSOS = { conta: Landmark, renda: Wallet, fixos: Repeat, cartao: CreditCard, gasto: Plus };
