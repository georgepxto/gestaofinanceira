import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  User,
  Users,
  CreditCard,
  TrendingDown,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Building2,
  Wallet,
  LayoutDashboard,
  Target,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface SidebarProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, userName, userEmail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/eu", label: "Meus Gastos", icon: User },
    { path: "/gastos", label: "Gastos do Mês", icon: CreditCard },
    { path: "/dividas", label: "Saldo Devedor", icon: TrendingDown },
    { path: "/pessoas", label: "Pessoas", icon: Users },
    { path: "/contas", label: "Contas Bancárias", icon: Building2 },
    { path: "/cartoes", label: "Cartões de Crédito", icon: Wallet },
    { path: "/metas", label: "Metas de Gasto", icon: Target },
  ];

  const bottomNavItems = [
    { path: "/configuracoes", label: "Configurações", icon: Settings },
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
    const isActive = location.pathname === path;
    return (
      <NavLink
        to={path}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold border-l-4 border-emerald-600"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
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
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="ml-4 text-lg font-bold text-gray-900 dark:text-gray-100">
            Reppago
          </h1>
        </div>
        <NotificationBell />
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
          fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 shadow-sm
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
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Reppago
            </h2>
          )}
          
          {/* Close button (mobile) */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-auto"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          {/* Collapse button (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-auto"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          
          {/* User Info */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{userName || "Usuário"}</p>
                <p className="text-xs text-emerald-600 truncate">{userEmail || ""}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onLogout}
            className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900 transition-colors ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
