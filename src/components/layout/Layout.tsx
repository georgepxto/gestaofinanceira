import { useState, useCallback, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NotificationBell } from "./NotificationBell";
import { BotaoAjuda } from "./BotaoAjuda";
import { BottomBar } from "./BottomBar";
import { SubPills } from "./SubPills";
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
  const [contaAberta, setContaAberta] = useState(false);
  const [recolhida, setRecolhida] = useState(false);
  const navigate = useNavigate();
  const fecharConta = useCallback(() => setContaAberta(false), []);

  // Contrato pequeno de propósito: lançar leva à tela de Lançamentos com o
  // formulário aberto. O "Lançar" da barra lateral e o "+" do celular chamam isto.
  const abrirLancamento = () => navigate("/gastos/lancamentos?novo=1");

  return (
    <TutorialHelpContext.Provider value={{ helpButton, setHelpButton }}>
      <AcaoPrincipalProvider>
        <div className="min-h-screen bg-page text-fg">
          <TopBar onAbrirConta={() => setContaAberta(true)} userName={userName} userEmail={userEmail} />
          <Sidebar
            onLogout={onLogout}
            onLancar={abrirLancamento}
            aberta={contaAberta}
            onFechar={fecharConta}
            recolhida={recolhida}
            onRecolher={setRecolhida}
            userName={userName}
            userEmail={userEmail}
          />

          <main
            className={`min-h-screen pt-14 md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 transition-[margin] duration-[250ms] ease-out ${
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
              <Suspense fallback={<AparecerSeDemorar><PageLoadingState /></AparecerSeDemorar>}>
                <Outlet />
              </Suspense>
            </div>
          </main>

          <BottomBar onLancar={abrirLancamento} />
        </div>
      </AcaoPrincipalProvider>
    </TutorialHelpContext.Provider>
  );
};
