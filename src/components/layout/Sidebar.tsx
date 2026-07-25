import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Receipt,
  Coins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useTutorialHelpContext } from "./TutorialHelpContext";
import { useAppContext } from "../../context";
import type { UserFeatures } from "../../types/admin";

interface SidebarProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

interface NavChild {
  path: string;
  label: string;
  feature: keyof UserFeatures;
}

/**
 * Grupos da navegação — os itens apontam para as sub-rotas reais que já
 * existem. Ícone só no rótulo do grupo; os itens são texto puro.
 */
const NAV_GROUPS: { label: string; icon: LucideIcon; items: NavChild[] }[] = [
  {
    label: "Carteira",
    icon: Wallet,
    items: [
      { path: "/carteira/contas", label: "Contas e receitas", feature: "contas_bancarias" },
      { path: "/carteira/cartoes", label: "Cartões", feature: "cartoes_credito" },
    ],
  },
  {
    label: "Gastos",
    icon: Receipt,
    items: [
      { path: "/gastos/lancamentos", label: "Lançamentos", feature: "meus_gastos" },
      { path: "/gastos/metas", label: "Metas", feature: "metas" },
    ],
  },
  {
    label: "A receber",
    icon: Coins,
    items: [
      { path: "/a-receber/pessoas", label: "Por pessoa", feature: "pessoas" },
      { path: "/a-receber/aberto", label: "Em aberto", feature: "saldo_devedor" },
      { path: "/a-receber/mes", label: "Do mês", feature: "gastos_compartilhados" },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, userName, userEmail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { helpButton } = useTutorialHelpContext();
  const { isAdmin, features } = useAppContext();

  // Admin vê tudo; usuário comum só vê os itens cujas features estão ativas.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: isAdmin ? group.items : group.items.filter((item) => features[item.feature]),
  })).filter((group) => group.items.length > 0);

  const showConfiguracoes = features.configuracoes || isAdmin;

  const NavItem = ({ path, label }: { path: string; label: string }) => {
    const isActive =
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
    return (
      <NavLink
        to={path}
        onClick={() => setIsOpen(false)}
        title={isCollapsed ? label : undefined}
        className={`relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-colors ${
          isActive
            ? "text-zinc-900 font-semibold dark:text-zinc-50"
            : "text-zinc-500 font-medium hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.04]"
        } ${isCollapsed ? "md:justify-center" : ""}`}
      >
        {/* Seleção discreta: texto escuro + traço esmeralda fino à esquerda. */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-emerald-500"
            aria-hidden="true"
          />
        )}
        {/* Recolhida, o item vira a inicial (não há mais ícone por tela). */}
        <span className={`font-mono text-xs font-semibold hidden ${isCollapsed ? "md:inline" : ""}`} aria-hidden="true">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className={isCollapsed ? "md:hidden" : ""}>{label}</span>
      </NavLink>
    );
  };

  const GroupLabel = ({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) => (
    <p
      className={`flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 px-3 pt-4 pb-1 ${
        isCollapsed ? "md:justify-center md:px-0" : ""
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
      <span className={isCollapsed ? "md:hidden" : ""}>{children}</span>
    </p>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir menu de navegação"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </button>
          <img src="/favicon-light.png" alt="Hedge" className="w-4 h-4 ml-3 dark:hidden" />
          <img src="/favicon-dark.png" alt="Hedge" className="w-4 h-4 ml-3 hidden dark:block" />
          <h1 className="ml-2 font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Hedge
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {helpButton && (
            <button
              onClick={helpButton.onClick}
              data-tour={helpButton.dataTour}
              title={helpButton.title}
              aria-label={helpButton.ariaLabel}
              className="flex w-8 h-8 rounded-full border border-zinc-300 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-500 items-center justify-center shadow-sm transition-colors"
            >
              ?
            </button>
          )}
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-white/[0.06] z-50 flex flex-col
          transition-all duration-300 ease-in-out

          /* Mobile: drawer */
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-72

          /* Desktop: always visible */
          md:translate-x-0
          ${isCollapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* Topo: logo + recolher */}
        <div className="h-[68px] flex items-center justify-between px-5 border-b border-zinc-100 dark:border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/favicon-light.png" alt="Hedge" className="w-7 h-7 dark:hidden flex-shrink-0 object-contain" />
            <img src="/favicon-dark.png" alt="Hedge" className="w-7 h-7 hidden dark:block flex-shrink-0 object-contain" />
            <h2
              className={`font-display font-bold text-[19px] tracking-tight text-zinc-900 dark:text-zinc-50 ${
                isCollapsed ? "md:hidden" : ""
              }`}
            >
              Hedge
            </h2>
          </div>

          {/* Fechar (mobile) */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Fechar menu de navegação"
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Recolher (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className={`hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100 transition-colors ${
              isCollapsed ? "ml-0" : ""
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-0.5">
          {(isAdmin || features.dashboard) && (
            <NavItem path="/" label="Dashboard" />
          )}
          {visibleGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <GroupLabel icon={group.icon}>{group.label}</GroupLabel>
              {group.items.map((item) => (
                <NavItem key={item.path} path={item.path} label={item.label} />
              ))}
            </div>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="shrink-0 p-3 border-t border-zinc-100 dark:border-white/[0.05] bg-[#FCFCFC] dark:bg-white/[0.03] flex flex-col gap-0.5">
          {isAdmin && <NavItem path="/admin" label="Admin" />}
          {showConfiguracoes && (
            <NavItem path="/configuracoes" label="Configurações" />
          )}

          {/* Cartão do usuário (logout embutido) */}
          <div
            className={`flex items-center gap-3 p-2.5 mt-1.5 bg-white dark:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.06] rounded-xl ${
              isCollapsed ? "md:justify-center md:p-2" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-emerald-700 dark:text-emerald-400">
                {(userName || userEmail || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
              <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {userName || "Usuário"}
              </p>
              <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {userEmail || ""}
              </p>
            </div>
            <button
              onClick={onLogout}
              aria-label="Sair da conta"
              title="Sair"
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors flex-shrink-0 ${
                isCollapsed ? "md:hidden" : ""
              }`}
            >
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
