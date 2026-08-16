import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus } from "lucide-react";
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
      ? [{ to: "/", label: "Dashboard", Icon: LayoutDashboard, ativo: pathname === "/" }]
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
  // `NavLink` sobrescreveria o `aria-current` com o casamento exato do `to` —
  // em /a-receber/aberto a aba ficava verde na tela e sem marca nenhuma para
  // leitor de tela, porque o `to` dela é /a-receber/pessoas.
  const Celula = ({ to, label, Icon, ativo }: Aba) => (
    <Link
      key={to}
      to={to}
      aria-current={ativo ? "page" : undefined}
      className={`relative flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors ${
        ativo
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {/* O mesmo traço da sidebar, deitado. */}
      {ativo && (
        <span
          className="absolute top-0 w-6 h-[3px] rounded-full bg-emerald-500"
          aria-hidden="true"
        />
      )}
      <Icon className="w-[22px] h-[22px]" strokeWidth={1.75} />
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </Link>
  );

  const esquerda = abas.slice(0, 2);
  const direita = abas.slice(2);

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/[0.06] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-flow-col auto-cols-fr h-16">
        {esquerda.map((aba) => (
          <Celula key={aba.to} {...aba} />
        ))}

        {podeLancar && (
          <div className="flex items-center justify-center">
            <button
              onClick={onLancar}
              aria-label="Novo lançamento"
              /* O anel na cor da barra é o que recorta o botão dela. A sombra é
                 neutra de propósito: o botão sobe acima da barra, então ganha
                 elevação, mas sombra colorida em botão vira halo (a guarda tem
                 regra para isso). No escuro só o anel separa. */
              className="-mt-3 w-[52px] h-[52px] rounded-2xl bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 shadow-lg shadow-black/10 dark:shadow-none active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" strokeWidth={2.25} />
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
