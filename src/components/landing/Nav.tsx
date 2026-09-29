import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HedgeLogo } from "./HedgeMark";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="lp-nav fixed inset-x-0 top-0 z-50" data-scrolled={scrolled}>
      <nav aria-label="Principal" className="lp-wrap flex h-16 items-center justify-between gap-3">
        <a href="#topo" aria-label="Hedge, voltar ao topo" className="inline-flex min-h-[44px] items-center text-[19px] font-medium">
          <HedgeLogo accent />
        </a>

        <div className="hidden items-center gap-8 text-[15px] lg:flex">
          <a href="#experimente" className="lp-navlink">Experimente</a>
          <a href="#funcionalidades" className="lp-navlink">Funcionalidades</a>
          <a href="#como-funciona" className="lp-navlink">Como funciona</a>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <Link to="/login" className="lp-navlink is-strong px-3 text-[15px]">
            Entrar
          </Link>
          <Link to="/login?mode=signup" className="lp-btn px-4 text-[15px]">
            Começar grátis
          </Link>
        </div>
      </nav>
    </header>
  );
}
