import type { ReactNode } from "react";

export interface ItemLegenda {
  rotulo: string;
  valor: ReactNode;
  /** Só "perigo" muda a cor (disponível negativo). */
  tom?: "normal" | "perigo";
}

interface ProgressBarProps {
  valor: number;
  maximo: number;
  /** Rótulo acessível ("Alimentação: 85% do limite"). */
  rotulo: string;
  /** "Usado · Pendente · Disponível", no estilo Mercury. */
  legenda?: ItemLegenda[];
  /** Barra de participação (sem estado): sempre em --fg-3, sem laranja nem vermelho. */
  neutra?: boolean;
  /**
   * Barra de progresso bom (quanto já foi pago): sempre em --fg. Pagar 80% de
   * uma cobrança não é alerta, então a régua de estado não vale aqui.
   */
  progresso?: boolean;
  className?: string;
}

/**
 * 4px, reta, trilho em --surface-3. O preenchimento é estado: --fg no normal,
 * --accent a partir de 80%, --danger acima de 100%. Estourada, a escala passa a
 * ir até o valor usado e um marcador fica no ponto dos 100%, para mostrar
 * quanto passou do limite.
 */
export function ProgressBar({ valor, maximo, rotulo, legenda, neutra = false, progresso = false, className = "" }: ProgressBarProps) {
  const fracao = maximo > 0 ? valor / maximo : 0;
  const estourou = !neutra && !progresso && fracao > 1;
  const escala = estourou ? valor : maximo;
  const largura = escala > 0 ? Math.max(0, Math.min(1, valor / escala)) : 0;
  const marcador = estourou ? maximo / valor : null;

  const cor = neutra ? "bg-fg-3" : progresso ? "bg-fg" : estourou ? "bg-danger" : fracao >= 0.8 ? "bg-accent" : "bg-fg";

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fracao * 100)}
        className="relative h-1 bg-surface-3"
      >
        <div
          className={`h-full ${cor} transition-[width] duration-500 ease-out`}
          style={{ width: `${largura * 100}%` }}
        />
        {marcador !== null && (
          <span
            aria-hidden="true"
            className="absolute -top-1 w-px h-3 bg-fg"
            style={{ left: `${marcador * 100}%` }}
          />
        )}
      </div>

      {legenda && legenda.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {legenda.map((item) => (
            <div key={item.rotulo} className="min-w-0">
              <dt className="text-xs text-fg-3">{item.rotulo}</dt>
              <dd className={`valor text-[15px] md:text-sm mt-0.5 ${item.tom === "perigo" ? "text-danger-ink" : "text-fg"}`}>
                {item.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
