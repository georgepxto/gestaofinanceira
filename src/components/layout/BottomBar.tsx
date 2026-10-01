import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

  // O destaque da aba: o mesmo traço de 2px da barra lateral, deitado no topo
  // da barra, que VIAJA de uma aba para a outra. Fora das abas (Configurações)
  // ele some em vez de ficar apontando para o lugar errado.
  const barraRef = useRef<HTMLDivElement | null>(null);
  const celulas = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [traco, setTraco] = useState<{ x: number; largura: number } | null>(null);
  const [tracoPronto, setTracoPronto] = useState(false);
  const ativa = abas.find((a) => a.ativo)?.to;

  const medir = () => {
    const el = ativa ? celulas.current[ativa] : null;
    const barra = barraRef.current;
    if (!el || !barra) return setTraco((t) => (t ? { ...t, largura: 0 } : null));
    const largura = 28;
    const x = el.offsetLeft + el.offsetWidth / 2 - largura / 2;
    setTraco((t) => (t && t.x === x && t.largura === largura ? t : { x, largura }));
  };

  useLayoutEffect(medir, [ativa, abas.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const medirRef = useRef(medir);
  medirRef.current = medir;
  useEffect(() => {
    const remedir = () => medirRef.current();
    window.addEventListener("resize", remedir);
    return () => window.removeEventListener("resize", remedir);
  }, []);
  useEffect(() => {
    if (traco && !tracoPronto) requestAnimationFrame(() => setTracoPronto(true));
  }, [traco, tracoPronto]);

  // `Link`, não `NavLink`: quem decide o ativo aqui é o prefixo do grupo, e o
  // `NavLink` sobrescreveria o `aria-current` com o casamento exato do `to`.
  const Celula = ({ to, label, Icon, ativo }: Aba) => (
    <Link
      key={to}
      to={to}
      ref={(el) => {
        celulas.current[to] = el;
      }}
      aria-current={ativo ? "page" : undefined}
      className={`group flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors duration-300 ${
        ativo ? "text-fg" : "text-fg-3 hover:text-fg-2"
      }`}
    >
      {/* O ícone da aba que acabou de ficar ativa sobe 1px e assenta. */}
      <Icon
        className={`w-[22px] h-[22px] viagem group-active:scale-90 ${
          ativo ? "-translate-y-px" : ""
        }`}
        strokeWidth={ativo ? 1.75 : 1.5}
      />
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
      <div ref={barraRef} className="relative grid grid-flow-col auto-cols-fr h-16">
        {traco && (
          <span
            aria-hidden="true"
            className={`absolute top-0 left-0 h-[2px] bg-fg pointer-events-none ${
              tracoPronto
                ? "viagem"
                : ""
            }`}
            style={{ transform: `translateX(${traco.x}px)`, width: traco.largura, opacity: traco.largura ? 1 : 0 }}
          />
        )}
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
