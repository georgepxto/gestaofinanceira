/** Ponto de 8px com a cor da categoria (ou do cartão). O único círculo do app. */
export function PontoCategoria({ cor, className = "" }: { cor: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      /* ds-ok: ponto de 8px de categoria — o único elemento redondo do sistema */
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: cor }}
    />
  );
}
