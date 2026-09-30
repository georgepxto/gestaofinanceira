/** Bloco de carregamento reto em --surface-3, com brilho sutil. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-sm ${className}`} />;
}
