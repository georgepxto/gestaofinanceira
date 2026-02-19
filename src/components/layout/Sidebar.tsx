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
            ? "bg-gray-700/60 text-cyan-400 border-l-4 border-cyan-400"
            : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
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
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 z-40 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-white">
            Reppago
          </h1>
        </div>
        <NotificationBell />
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-gray-900 border-r border-gray-700 z-50
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
        <div className="h-16 flex items-center justify-between px-4 bg-gray-800">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-white">
              Reppago
            </h2>
          )}
          
          {/* Close button (mobile) */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors ml-auto"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* Collapse button (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-2 hover:bg-gray-800 rounded-lg transition-colors ml-auto"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-800 space-y-3">
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          
          {/* User Info */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{userName || "Usuário"}</p>
                <p className="text-xs text-cyan-400 truncate">{userEmail || ""}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onLogout}
            className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-600/50 transition-colors ${
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
