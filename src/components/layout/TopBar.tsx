import { Link, useLocation } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "./NotificationBell";
import { BotaoAjuda } from "./BotaoAjuda";
import { useAppContext } from "../../context";

interface TopBarProps {
  onLogout: () => void;
}

/**
 * Barra do topo no celular: logo, ajuda, sino e a engrenagem de
 * Configurações. Antes o avatar abria uma gaveta com uma opção só; agora a
 * engrenagem leva direto, e sair da conta mora em Configurações.
 */
export function TopBar({ onLogout }: TopBarProps) {
  const { pathname } = useLocation();
  const { isAdmin, features } = useAppContext();
  const temConfiguracoes = isAdmin || features.configuracoes;
  const naTela = pathname.startsWith("/configuracoes");

  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-sticky h-14 bg-page flex items-center justify-between pl-4 pr-2">
      <Logo />
      <div className="flex items-center">
        <BotaoAjuda />
        <NotificationBell />
        {temConfiguracoes ? (
          <Link
            to="/configuracoes"
            aria-label="Configurações"
            aria-current={naTela ? "page" : undefined}
            className={`w-11 h-11 flex items-center justify-center rounded transition-colors ${
              naTela ? "text-fg" : "text-fg-2 hover:text-fg"
            }`}
          >
            {/* A engrenagem dá um quarto de volta ao chegar em Configurações. */}
            <Settings
              className={`w-5 h-5 viagem ${naTela ? "rotate-90" : ""}`}
              strokeWidth={naTela ? 1.75 : 1.5}
            />
          </Link>
        ) : (
          // Sem a tela de Configurações (desligada pelo admin), sair fica aqui.
          <button
            onClick={onLogout}
            aria-label="Sair da conta"
            className="w-11 h-11 flex items-center justify-center rounded text-fg-2 hover:text-fg transition-colors"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
}
