import { Check, CreditCard, Landmark, Plus, Repeat, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Surface, SurfaceHeader } from "../ui/Surface";
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
 */
export function PrimeirosPassos({ passos, onDispensar }: PrimeirosPassosProps) {
  const feitos = passos.filter((p) => p.feito).length;
  return (
    <Surface as="section">
      <SurfaceHeader
        titulo="Primeiros passos"
        descricao={`${feitos} de ${passos.length} feitos. Quanto mais completo, mais certo fica o saldo.`}
        className="mb-3"
        acao={
          <button
            type="button"
            onClick={onDispensar}
            className="inline-flex items-center min-h-[44px] -my-3 md:min-h-0 md:my-0 hover:text-fg transition-colors"
          >
            Dispensar
          </button>
        }
      />
      {/* Um segmento por passo: o cheio é o feito. */}
      <div className="flex gap-1 mb-2" aria-hidden="true">
        {passos.map((p) => (
          <span key={p.chave} className={`h-1 flex-1 ${p.feito ? "bg-fg" : "bg-surface-3"}`} />
        ))}
      </div>
      <ListGroup>
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
    </Surface>
  );
}

export const ICONES_DOS_PASSOS = { conta: Landmark, renda: Wallet, fixos: Repeat, cartao: CreditCard, gasto: Plus };
