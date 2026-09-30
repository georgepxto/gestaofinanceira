import { Logo } from "../ui/Logo";
import { Avatar } from "../ui/Avatar";
import { NotificationBell } from "./NotificationBell";
import { BotaoAjuda } from "./BotaoAjuda";

interface TopBarProps {
  onAbrirConta: () => void;
  userName?: string;
  userEmail?: string;
}

/**
 * Barra do topo no celular: logo, ajuda, sino e avatar. O avatar abre a gaveta
 * da conta — do lado do polegar, onde antes ficava o hambúrguer.
 */
export function TopBar({ onAbrirConta, userName, userEmail }: TopBarProps) {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-sticky h-14 bg-page flex items-center justify-between pl-4 pr-2">
      <Logo />
      <div className="flex items-center">
        <BotaoAjuda />
        <NotificationBell />
        <button
          onClick={onAbrirConta}
          aria-label="Abrir conta e configurações"
          className="w-11 h-11 flex items-center justify-center rounded"
        >
          <Avatar nome={userName || userEmail} tamanho={28} />
        </button>
      </div>
    </header>
  );
}
