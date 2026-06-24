import { NavLink, useMatch } from "react-router-dom";

export interface SegmentedTab {
  /** Rota de destino da visão. */
  to: string;
  /** Rótulo curto exibido na pílula. */
  label: string;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  /** Rótulo acessível do grupo (ex.: "Visões da carteira"). */
  ariaLabel: string;
}

function SegmentedTab({ to, label }: SegmentedTab) {
  const isActive = !!useMatch({ path: to, end: false });
  return (
    <NavLink
      to={to}
      role="tab"
      aria-selected={isActive}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-900 ${
        isActive
          ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-900 dark:text-emerald-400"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </NavLink>
  );
}

/**
 * Controle segmentado de sub-navegação — o mesmo gesto das pílulas de filtro
 * usadas pelo app (Pendentes/Pagos, Crédito/Débito), reaproveitado para alternar
 * as visões internas de uma aba-mãe. Cada pílula é um NavLink (sub-rota real),
 * então deep-link, voltar/avançar e foco continuam funcionando.
 *
 * Só apresentação: não conhece feature flags — recebe apenas as visões que o
 * usuário pode ver. Se houver uma única visão, não renderiza nada.
 */
export function SegmentedTabs({ tabs, ariaLabel }: SegmentedTabsProps) {
  if (tabs.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-800/60"
    >
      {tabs.map((tab) => (
        <SegmentedTab key={tab.to} {...tab} />
      ))}
    </div>
  );
}
