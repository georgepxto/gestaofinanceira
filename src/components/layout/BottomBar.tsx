import { Link, useLocation } from "react-router-dom";
import { Home, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { gruposVisiveis } from "./navGroups";
import { useAppContext } from "../../context";

interface BottomBarProps {
  onLancar: () => void;
}

interface Aba {
  to: string;
  label: string;
  Icon: LucideIcon;
  ativo: boolean;
}

/**
 * A navegação do mobile. Os quatro destinos ao alcance do polegar, e a ação
 * principal no centro deles.
 *
 * Antes tudo isso vivia atrás do hambúrguer no canto superior esquerdo — o
 * ponto mais distante do polegar numa tela de seis polegadas — e lançar um
 * gasto custava três toques. A lista é a mesma da sidebar (`navGroups`): o que
 * muda é o alcance, não a informação.
 */
export const BottomBar = ({ onLancar }: BottomBarProps) => {
  const { pathname } = useLocation();
  const { isAdmin, features } = useAppContext();

  const grupos = gruposVisiveis(isAdmin, features);
  const mostrarDashboard = isAdmin || features.dashboard;
  const podeLancar = isAdmin || features.meus_gastos;

  const abas: Aba[] = [
    ...(mostrarDashboard
      ? [{ to: "/", label: "Início", Icon: Home, ativo: pathname === "/" }]
      : []),
    // O destino é o primeiro filho visível, não o prefixo do grupo: assim a aba
    // não depende do redirect do shell de rota para chegar em algum lugar.
    ...grupos.map((g) => ({
      to: g.items[0].path,
      label: g.label,
      Icon: g.icon,
      ativo: pathname.startsWith(g.prefix),
    })),
  ];

  // `Link`, não `NavLink`: quem decide o ativo aqui é o prefixo do grupo, e o
  // `NavLink` sobrescreveria o `aria-current` com o casamento exato do `to`.
  const Celula = ({ to, label, Icon, ativo }: Aba) => (
    <Link
      key={to}
      to={to}
      aria-current={ativo ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors ${
        ativo ? "text-fg" : "text-fg-3 hover:text-fg-2"
      }`}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={1.5} />
      <span className="text-[11px] leading-none">{label}</span>
    </Link>
  );

  const esquerda = abas.slice(0, 2);
  const direita = abas.slice(2);

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-sticky bg-surface-1 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-flow-col auto-cols-fr h-16">
        {esquerda.map((aba) => (
          <Celula key={aba.to} {...aba} />
        ))}

        {/* O botão da tela no celular: quadrado, raio de 4px, laranja. */}
        {podeLancar && (
          <div className="flex items-center justify-center">
            <button
              onClick={onLancar}
              aria-label="Novo lançamento"
              data-tour="barra-btn-novo"
              className="w-12 h-12 rounded bg-accent text-accent-fg flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {direita.map((aba) => (
          <Celula key={aba.to} {...aba} />
        ))}
      </div>
    </nav>
  );
};
