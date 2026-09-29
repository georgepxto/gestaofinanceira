import { lazy, Suspense, useRef } from "react";
import "../components/landing/landing.css";
import { Nav } from "../components/landing/Nav";
import { Hero } from "../components/landing/Hero";
import { ScrollProgress } from "../components/landing/ScrollProgress";
import { SafeBoundary } from "../components/landing/SafeBoundary";

const BelowFold = lazy(() => import("../components/landing/BelowFold"));

/* Landing (rota "/"). Cada <section data-lp-theme> define o tema da página
   enquanto está no meio da tela: escuro no hero, claro no dashboard e nas
   funcionalidades, escuro de novo a partir de "Como funciona".
   Nav e hero vão no chunk de entrada; o resto carrega em seguida. */
export const LandingPage = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="lp min-h-screen" data-theme="dark">
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <SafeBoundary>
          <Suspense fallback={null}>
            <BelowFold rootRef={rootRef} />
          </Suspense>
        </SafeBoundary>
      </main>
    </div>
  );
};
