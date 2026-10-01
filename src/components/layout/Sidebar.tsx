import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, PanelLeftClose, PanelLeftOpen, Plus, Home, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
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
  /** Desktop: barra reduzida a 72px. Mora no Layout, que desloca o conteúdo. */
  recolhida: boolean;
  onRecolher: (recolhida: boolean) => void;
  userName?: string;
  userEmail?: string;
}

/**
 * Barra lateral do desktop (240px, ou 72px recolhida). No celular não existe:
 * os destinos moram na barra inferior, Configurações na engrenagem do topo e
 * sair da conta dentro de Configurações.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  onLancar,
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

  // ── Indicador deslizante ─────────────────────────────────────────────
  // Um único traço de 2px para a barra inteira: VIAJA do item que estava ativo
  // até o novo — da lista para Configurações e de volta, sem sumir no caminho.
  // Anda por transform (não por `top`) para deslizar macio. Depende da
  // fronteira de Suspense estar dentro do Layout: se a barra desmontasse a cada
  // chunk, teleportaria.
  const asideRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicador, setIndicador] = useState<{ y: number; altura: number } | null>(null);
  // Na primeira medida o traço aparece no lugar, sem viajar do topo.
  const [indicadorPronto, setIndicadorPronto] = useState(false);

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

  const medirIndicador = () => {
    const activePath = [...navPaths, ...rodapePaths].find(isPathActive);
    const el = activePath ? itemRefs.current[activePath] : null;
    const aside = asideRef.current;
    if (!activePath || !el || !aside || el.offsetParent === null) {
      setIndicador(null);
      return;
    }
    const caixa = el.getBoundingClientRect();
    setIndicador({ y: caixa.top - aside.getBoundingClientRect().top + 8, altura: caixa.height - 16 });
  };

  useLayoutEffect(() => {
    medirIndicador();
    // Ao recolher/expandir, a largura anima por 250ms e os nomes quebram em
    // várias linhas no meio do caminho: a medida do início sai errada. Mede
    // de novo quando a barra assenta.
    const t = window.setTimeout(medirIndicador, 270);
    return () => window.clearTimeout(t);
    // Deps enxutas de propósito: `navPaths` e `rodapePaths` são recriados a cada
    // render. O que de fato move o indicador está abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, recolhida, isAdmin, showConfiguracoes, visibleGroups.length]);

  useEffect(() => {
    if (indicador && !indicadorPronto) requestAnimationFrame(() => setIndicadorPronto(true));
  }, [indicador, indicadorPronto]);

  // Janela redimensionada ou lista rolada: o traço acompanha sem viajar.
  useEffect(() => {
    const remedir = () => medirIndicador();
    window.addEventListener("resize", remedir);
    return () => window.removeEventListener("resize", remedir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Dois níveis, para dar para ver o que é seção e o que é aba:
  // - topo (Início, Configurações e o nome das seções): ícone + nome;
  // - aba de uma seção: só o nome, recuado para começar onde o nome da seção
  //   começa. Recolhida, tudo vira ícone, e o fio separa as seções.
  const NavItem = ({ path, label, Icone, topo = false }: { path: string; label: string; Icone: LucideIcon; topo?: boolean }) => {
    const ativo = isPathActive(path);
    return (
      <NavLink
        to={path}
        ref={(el) => {
          itemRefs.current[path] = el;
        }}
        title={recolhida ? label : undefined}
        aria-current={ativo ? "page" : undefined}
        className={`flex items-center gap-3 min-h-[44px] md:min-h-[36px] text-[15px] md:text-sm transition-colors duration-300 ${
          ativo ? "text-fg font-medium" : "text-fg-2 hover:text-fg"
        } ${recolhida ? "md:justify-center md:px-0" : topo ? "px-4" : "pl-[46px] pr-4"}`}
      >
        <Icone
          className={`w-[18px] h-[18px] shrink-0 ${topo || recolhida ? "block" : "hidden"}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className={recolhida ? "md:sr-only" : ""}>{label}</span>
      </NavLink>
    );
  };

  const GroupLabel = ({ children, Icone, para }: { children: React.ReactNode; Icone: LucideIcon; para: string }) => (
    <>
      {/* A seção: ícone + nome em peso médio, acima das abas recuadas. Clicar
          leva à primeira aba — parece link, então funciona como link. */}
      <NavLink
        to={para}
        tabIndex={-1}
        className={`group flex items-center gap-3 px-4 pt-5 pb-1 min-h-[36px] text-sm font-medium text-fg hover:text-fg-2 transition-colors ${recolhida ? "md:sr-only" : ""}`}
      >
        <Icone className="w-[18px] h-[18px] shrink-0 text-fg-3" strokeWidth={1.5} aria-hidden="true" />
        {children}
      </NavLink>
      {/* Recolhida, o nome do grupo vira um fio entre os blocos de ícones. */}
      {recolhida && <span className="hidden md:block mx-5 my-2 h-px bg-line" aria-hidden="true" />}
    </>
  );

  return (
    <>
      <aside
        ref={asideRef}
        aria-label="Navegação"
        className={`
          hidden md:flex fixed top-0 left-0 h-full z-sticky flex-col bg-page
          transition-[width] duration-[250ms] ease-out
          ${recolhida ? "md:w-[72px]" : "md:w-60"}
        `}
      >
        {/* Topo: logo e recolher */}
        <div className={`h-16 shrink-0 flex items-center justify-between px-4 ${recolhida ? "md:justify-center md:px-0" : ""}`}>
          {recolhida ? (
            // Recolhida: o símbolo é o botão de abrir. No hover e no foco ele
            // vira o ícone de expandir, no mesmo lugar onde ficava o de recolher.
            <button
              onClick={() => onRecolher(false)}
              aria-label="Expandir barra lateral"
              title="Expandir barra lateral"
              className="group hidden md:flex w-10 h-10 rounded items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
            >
              <HedgeMark className="h-[22px] w-auto text-accent group-hover:hidden group-focus-visible:hidden" title="Hedge" />
              <PanelLeftOpen className="hidden w-4 h-4 group-hover:block group-focus-visible:block" strokeWidth={1.5} />
            </button>
          ) : (
            <span className="hidden md:inline-flex">
              <Logo />
            </span>
          )}

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
        {indicador && (
          <span
            className={`hidden md:block absolute left-0 top-0 z-10 w-[2px] bg-fg pointer-events-none ${
              indicadorPronto
                ? "viagem"
                : ""
            }`}
            style={{ transform: `translateY(${indicador.y}px)`, height: indicador.altura }}
            aria-hidden="true"
          />
        )}

        <nav
          className="relative hidden md:flex md:flex-1 min-h-0 overflow-y-auto py-2 flex-col"
          onScroll={medirIndicador}
        >
          {(isAdmin || features.dashboard) && <NavItem path="/" label="Início" Icone={Home} topo />}
          {visibleGroups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <GroupLabel Icone={group.icon} para={group.items[0].path}>{group.label}</GroupLabel>
              {group.items.map((item) => (
                <NavItem key={item.path} path={item.path} label={item.label} Icone={item.icon} />
              ))}
            </div>
          ))}
        </nav>

        {/* Rodapé: configurações e usuário */}
        <div className="relative shrink-0 mt-auto md:mt-0 py-3 flex flex-col">
          {isAdmin && <NavItem path="/admin" label="Admin" Icone={ShieldCheck} topo />}
          {showConfiguracoes && <NavItem path="/configuracoes" label="Configurações" Icone={Settings} topo />}

          <div className={`flex items-center gap-3 mt-2 px-4 min-h-[48px] ${recolhida ? "md:justify-center md:px-0" : ""}`}>
            <Avatar nome={userName || userEmail} tamanho={32} />
            <div className={`flex-1 min-w-0 ${recolhida ? "md:hidden" : ""}`}>
              <p className="text-sm text-fg break-words">{userName || "Usuário"}</p>
              {/* E-mail pode cortar: é identificação, não dado financeiro. O title mostra inteiro. */}
              <p className="text-xs text-fg-3 truncate" title={userEmail || undefined}>{userEmail || ""}</p>
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

        </div>
      </aside>
    </>
  );
};
