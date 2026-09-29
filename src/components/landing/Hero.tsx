import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { LiveBalanceCard } from "./LiveBalanceCard";

const d = (ms: number) => ({ "--lp-d": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section id="topo" data-lp-theme="dark" className="relative overflow-hidden">
      <div aria-hidden="true" className="lp-hero-grid pointer-events-none absolute inset-0" />

      <div className="lp-wrap relative grid items-center gap-12 pb-10 pt-[calc(64px+env(safe-area-inset-top)+48px)] lg:min-h-[100svh] lg:grid-cols-[55fr_45fr] lg:gap-10 lg:pb-16 lg:pt-[calc(64px+56px)]">
        <div className="max-w-[640px]">
          <h1 className="lp-h1 lp-rise" style={d(0)}>
            Seu dinheiro deixa pistas.
          </h1>
          <p className="lp-lede lp-rise mt-6 max-w-[34rem]" style={d(120)}>
            O Hedge junta o que entra e o que sai e mostra para onde foi. Use sozinho ou
            dividindo as contas com quem mora com você.
          </p>
          <div className="lp-rise mt-9 flex flex-wrap items-center gap-x-7 gap-y-3" style={d(240)}>
            <Link to="/login?mode=signup" className="lp-btn lp-btn-lg">
              Começar grátis
            </Link>
            <a href="#experimente" className="lp-link text-[15px]">
              Experimentar o app
            </a>
          </div>
          <p className="lp-rise mt-6 text-[14px] text-lp-muted" style={d(300)}>
            Gratuito, sem anúncios.
          </p>
        </div>

        <div className="lp-rise -mx-5 sm:mx-0" style={d(180)}>
          <LiveBalanceCard />
        </div>
      </div>
    </section>
  );
}
