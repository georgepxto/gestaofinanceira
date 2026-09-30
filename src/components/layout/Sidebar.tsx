import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { X, LogOut, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { HedgeMark } from "../landing/HedgeMark";
import { Logo } from "../ui/Logo";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { gruposVisiveis } from "./navGroups";
import { useAcaoPrincipal } from "./AcaoPrincipalContext";
import { useAppContext } from "../../context";

interface SidebarProps {
  onLogout: () => void;
  onLancar: () => void;
  /** Gaveta da conta no celular (aberta pelo avatar da barra do topo). */
  aberta: boolean;
  onFechar: () => void;
  /** Desktop: barra reduzida a 72px. Mora no Layout, que desloca o conteúdo. */
  recolhida: boolean;
  onRecolher: (recolhida: boolean) => void;
  userName?: string;
  userEmail?: string;
}

/**
 * Barra lateral do desktop (240px) e, no celular, a gaveta da conta.
 *
 * No celular os destinos moram na barra inferior; aqui sobra o que é conta —
 * Configurações, Admin e sair. Repetir a lista de telas na gaveta é o que faz
 * app de celular parecer painel de administração.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  onLancar,
  aberta,
  onFechar,
  recolhida,
  onRecolher,
  userName,
  userEmail,
}) => {
  const location = useLocation();
  const { isAdmin, features } = useAppContext();
  const { paginaTemAcao } = useAcaoPrincipal();

  const visibleGroups = gruposVisiveis(isAdmin, features);
  const showConfiguracoes = features.configuracoes || isAdmin;
  const podeLancar = isAdmin || features.meus_gastos;

  // Esc fecha a gaveta do celular.
  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberta, onFechar]);

  // ── Indicador deslizante ─────────────────────────────────────────────
  // Um único traço de 2px por área (nav e rodapé) VIAJA até o item ativo com
  // transição contínua de `top`. Depende da fronteira de Suspense estar dentro
  // do Layout: se a barra desmontasse a cada chunk, teleportaria.
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicador, setIndicador] = useState<{ area: "nav" | "rodape"; top: number; altura: number } | null>(null);

  const isPathActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navPaths = [
    ...(isAdmin || features.dashboard ? ["/"] : []),
    ...visibleGroups.flatMap((g) => g.items.map((i) => i.path)),
  ];
  const rodapePaths = [
    ...(isAdmin ? ["/admin"] : []),
    ...(showConfiguracoes ? ["/configuracoes"] : []),
  ];

  useLayoutEffect(() => {
    const activePath = [...navPaths, ...rodapePaths].find(isPathActive);
    const el = activePath ? itemRefs.current[activePath] : null;
    if (!activePath || !el) {
      setIndicador(null);
      return;
    }
    setIndicador({
      area: rodapePaths.includes(activePath) ? "rodape" : "nav",
      top: el.offsetTop + 8,
      altura: el.offsetHeight - 16,
    });
    // Deps enxutas de propósito: `navPaths` e `rodapePaths` são recriados a cada
    // render. O que de fato move o indicador está abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, recolhida, isAdmin, showConfiguracoes, visibleGroups.length]);

  const Indicador = ({ area }: { area: "nav" | "rodape" }) =>
    indicador?.area === area ? (
      <span
        className="absolute left-0 w-[2px] bg-fg transition-[top,height] duration-300 ease-out"
        style={{ top: indicador.top, height: indicador.altura }}
        aria-hidden="true"
      />
    ) : null;

  const NavItem = ({ path, label }: { path: string; label: string }) => {
    const ativo = isPathActive(path);
    return (
      <NavLink
        to={path}
        ref={(el) => {
          itemRefs.current[path] = el;
        }}
        onClick={onFechar}
        title={recolhida ? label : undefined}
        aria-current={ativo ? "page" : undefined}
        className={`flex items-center min-h-[44px] md:min-h-[36px] px-4 text-[15px] md:text-sm transition-colors ${
          ativo ? "text-fg" : "text-fg-2 hover:text-fg"
        } ${recolhida ? "md:justify-center md:px-0" : ""}`}
      >
        {/* Recolhida, o item vira a inicial. */}
        <span className={`hidden ${recolhida ? "md:inline" : ""}`} aria-hidden="true">
          {label.charAt(0)}
        </span>
        <span className={recolhida ? "md:sr-only" : ""}>{label}</span>
      </NavLink>
    );
  };

  const GroupLabel = ({ children }: { children: React.ReactNode }) => (
    <p className={`px-4 pt-5 pb-1 text-xs text-fg-3 ${recolhida ? "md:sr-only" : ""}`}>{children}</p>
  );

  return (
    <>
      {/* Fundo da gaveta (celular) */}
      {aberta && (
        <div
          className="md:hidden fixed inset-0 z-overlay bg-scrim animate-[fundo-entra_150ms_ease-out]"
          aria-hidden="true"
          /* ds-ok: fundo de dispensa. Teclado fecha no Esc e no botão da gaveta — o fundo não entra na ordem de foco de propósito */
          onClick={onFechar}
        />
      )}

      <aside
        aria-label="Navegação"
        className={`
          fixed top-0 left-0 h-full z-modal flex flex-col bg-page
          transition-[transform,width] duration-[250ms] ease-out
          w-72 ${aberta ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:z-sticky ${recolhida ? "md:w-[72px]" : "md:w-60"}
          max-md:bg-surface-1
        `}
      >
        {/* Topo: logo e recolher */}
        <div className={`h-16 shrink-0 flex items-center justify-between px-4 ${recolhida ? "md:justify-center md:px-0" : ""}`}>
          {/* No celular a gaveta é a conta, e o título diz isso. */}
          <span className="md:hidden text-base font-medium text-fg">Conta</span>
          <span className="hidden md:inline-flex">
            {recolhida ? <HedgeMark className="h-[22px] w-auto text-accent" title="Hedge" /> : <Logo />}
          </span>

          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="md:hidden w-11 h-11 -mr-2 rounded flex items-center justify-center text-fg-2 hover:text-fg transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
          {!recolhida && (
            <button
              onClick={() => onRecolher(true)}
              aria-label="Recolher barra lateral"
              className="hidden md:flex w-8 h-8 -mr-1 rounded items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Ação principal. Laranja, a não ser que a tela aberta tenha a própria. */}
        {podeLancar && (
          <div className={`hidden md:block px-4 pb-2 ${recolhida ? "md:px-3" : ""}`}>
            <Button
              variante={paginaTemAcao ? "secundario" : "principal"}
              cheio
              onClick={onLancar}
              data-tour="sidebar-btn-lancar"
              aria-label={recolhida ? "Lançar gasto" : undefined}
              icone={<Plus className="w-4 h-4" strokeWidth={1.75} />}
              className={recolhida ? "px-0" : ""}
            >
              {!recolhida && "Lançar"}
            </Button>
          </div>
        )}

        {/* Destinos — só no desktop; no celular vivem na barra inferior. */}
        <nav className="relative hidden md:flex md:flex-1 min-h-0 overflow-y-auto py-2 flex-col">
          <Indicador area="nav" />
          {(isAdmin || features.dashboard) && <NavItem path="/" label="Início" />}
          {visibleGroups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <GroupLabel>{group.label}</GroupLabel>
              {group.items.map((item) => (
                <NavItem key={item.path} path={item.path} label={item.label} />
              ))}
            </div>
          ))}
        </nav>

        {/* Rodapé: configurações e usuário */}
        <div className="relative shrink-0 mt-auto md:mt-0 py-3 flex flex-col">
          <Indicador area="rodape" />
          {isAdmin && <NavItem path="/admin" label="Admin" />}
          {showConfiguracoes && <NavItem path="/configuracoes" label="Configurações" />}

          <div className={`flex items-center gap-3 mt-2 px-4 min-h-[48px] ${recolhida ? "md:justify-center md:px-0" : ""}`}>
            <Avatar nome={userName || userEmail} tamanho={32} />
            <div className={`flex-1 min-w-0 ${recolhida ? "md:hidden" : ""}`}>
              <p className="text-sm text-fg break-words">{userName || "Usuário"}</p>
              {/* E-mail pode cortar: é identificação, não dado financeiro. */}
              <p className="text-xs text-fg-3 truncate">{userEmail || ""}</p>
            </div>
            <button
              onClick={onLogout}
              aria-label="Sair da conta"
              title="Sair"
              className={`w-11 h-11 md:w-8 md:h-8 -mr-2 md:mr-0 rounded flex items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors shrink-0 ${
                recolhida ? "md:hidden" : ""
              }`}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {recolhida && (
            <button
              onClick={() => onRecolher(false)}
              aria-label="Expandir barra lateral"
              className="hidden md:flex mx-auto mt-2 w-8 h-8 rounded items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
