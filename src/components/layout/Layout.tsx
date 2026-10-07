import { useState, useEffect, useRef, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../../context";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NotificationBell } from "./NotificationBell";
import { BotaoAjuda } from "./BotaoAjuda";
import { BottomBar } from "./BottomBar";
import { SubPills } from "./SubPills";
import { ordemDaRota } from "./navGroups";
import { AparecerSeDemorar } from "./BootSplash";
import { AcaoPrincipalProvider } from "./AcaoPrincipalContext";
import { PageLoadingState } from "../ui/AsyncState";
import {
  TutorialHelpContext,
  type TutorialHelpButtonConfig,
} from "./TutorialHelpContext";

interface LayoutProps {
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export const Layout: React.FC<LayoutProps> = ({ onLogout, userName, userEmail }) => {
  const [helpButton, setHelpButton] = useState<TutorialHelpButtonConfig | null>(null);
  const [recolhida, setRecolhida] = useState(false);

  // O "Lançar" da barra lateral e o "+" do celular abrem o formulário de gasto
  // por cima da tela atual — ele vive no App, acima das rotas. Antes levavam
  // para Lançamentos, e cancelar deixava a pessoa longe de onde estava.
  const { setShowFormMeuGasto } = useAppContext();
  const abrirLancamento = () => setShowFormMeuGasto(true);

  // Para que lado a tela nova entra: o mesmo para onde o traço da navegação
  // andou. Passada a chegada, volta a "nenhuma" — aí o esqueleto que vira
  // conteúdo só esmaece, sem deslizar de novo.
  const { pathname } = useLocation();
  const [direcao, setDirecao] = useState<"frente" | "tras" | "nenhuma">("nenhuma");
  const rotaAnterior = useRef(pathname);
  useEffect(() => {
    const de = ordemDaRota(rotaAnterior.current);
    const para = ordemDaRota(pathname);
    rotaAnterior.current = pathname;
    if (de === para) return;
    setDirecao(para > de ? "frente" : "tras");
    const t = window.setTimeout(() => setDirecao("nenhuma"), 500);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <TutorialHelpContext.Provider value={{ helpButton, setHelpButton }}>
      <AcaoPrincipalProvider>
        <div className="min-h-screen bg-page text-fg">
          <TopBar onLogout={onLogout} />
          <Sidebar
            onLogout={onLogout}
            onLancar={abrirLancamento}
            recolhida={recolhida}
            onRecolher={setRecolhida}
            userName={userName}
            userEmail={userEmail}
          />

          <main
            className={`min-h-screen pt-14 md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 transition-[margin] duration-250 ease-out ${
              recolhida ? "md:ml-[72px]" : "md:ml-60"
            }`}
          >
            {/* Ajuda e notificações no desktop: uma faixa discreta acima do
                cabeçalho da tela. No celular moram na barra do topo. */}
            <div className="hidden md:flex justify-end items-center gap-1 h-12 px-6">
              <BotaoAjuda />
              <NotificationBell />
            </div>

            <div className="max-w-[1200px] mx-auto">
              <SubPills />

              {/* Fronteira de suspense DENTRO do layout: ao carregar o chunk de
                  uma tela, só o conteúdo suspende — a barra lateral fica montada
                  e o indicador viaja em vez de teleportar. Passados 300ms, o
                  esqueleto entra no lugar certo. */}
              {/* `key`: cada tela é um elemento novo, e a chegada roda de novo. */}
              <div key={pathname} className="tela" data-direcao={direcao}>
                <Suspense fallback={<AparecerSeDemorar><div className="px-4 md:px-8"><PageLoadingState /></div></AparecerSeDemorar>}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </main>

          <BottomBar onLancar={abrirLancamento} />
        </div>
      </AcaoPrincipalProvider>
    </TutorialHelpContext.Provider>
  );
};
