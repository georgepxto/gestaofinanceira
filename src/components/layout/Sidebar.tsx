import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  User,
  Banknote,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Wallet,
  LayoutDashboard,
  Target,
  Shield,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useTutorialHelpContext } from "./TutorialHelpContext";
import { useAppContext } from "../../context";

interface SidebarProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, userName, userEmail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { helpButton } = useTutorialHelpContext();
  const { isAdmin, features } = useAppContext();

  // Construir itens do menu baseados nas features do usuário.
  // Uma aba-mãe pode reunir várias features: aparece se ao menos uma estiver ativa.
  const allNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, features: ["dashboard"] as const },
    { path: "/orcamento", label: "Orçamento", icon: Target, features: ["meus_gastos", "metas"] as const },
    { path: "/a-receber", label: "Na Rua", icon: Banknote, features: ["gastos_compartilhados", "saldo_devedor", "pessoas"] as const },
    { path: "/carteira", label: "Carteira", icon: Wallet, features: ["contas_bancarias", "cartoes_credito"] as const },
  ];

  // Filtrar itens baseados nas features habilitadas (admin vê tudo)
  const navItems = isAdmin
    ? allNavItems
    : allNavItems.filter((item) => item.features.some((f) => features[f]));

  const bottomNavItems = [
    ...(features.configuracoes || isAdmin
      ? [{ path: "/configuracoes", label: "Configurações", icon: Settings }]
      : []),
    ...(isAdmin
      ? [{ path: "/admin", label: "Painel Admin", icon: Shield }]
      : []),
  ];

  const NavItem = ({
    path,
    label,
    icon: Icon,
  }: {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const isActive =
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
    return (
      <NavLink
        to={path}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold ring-1 ring-emerald-100 dark:ring-emerald-900/40"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span className="font-medium">{label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir menu de navegação"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
              className="flex w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-500 items-center justify-center shadow-sm transition-colors"
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
          fixed top-0 left-0 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 shadow-sm flex flex-col
          transition-all duration-300 ease-in-out
          
          /* Mobile: drawer */
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-72
          
          /* Desktop: always visible */
          md:translate-x-0
          ${isCollapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <img src="/favicon-light.png" alt="Hedge" className="w-5 h-5 dark:hidden flex-shrink-0" />
            <img src="/favicon-dark.png" alt="Hedge" className="w-5 h-5 hidden dark:block flex-shrink-0" />
            {!isCollapsed && (
              <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Hedge
              </h2>
            )}
          </div>

          {/* Close button (mobile) */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Fechar menu de navegação"
            className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ml-auto"
          >
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>

          {/* Collapse button (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className="hidden md:flex p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ml-auto"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Navigation */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
            {bottomNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            {/* User Info */}
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-900 dark:text-zinc-100 font-medium truncate">{userName || "Usuário"}</p>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate">{userEmail || ""}</p>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-800 transition-colors ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
