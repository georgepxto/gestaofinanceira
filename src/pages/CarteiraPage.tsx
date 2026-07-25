import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context";
import { PageHeader, Pista } from "../components/ui/PageHeader";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";
import type { UserFeatures } from "../types/admin";

/**
 * Aba-mãe "Carteira" — onde o dinheiro está.
 * Reúne Contas Bancárias e Cartões de Crédito sob um único cabeçalho, alternando
 * entre as visões por sub-rotas reais (/carteira/contas, /carteira/cartoes).
 *
 * Só apresentação/navegação: o cabeçalho assume a identidade da visão ativa
 * (PageHeader + Pista preservados) e o corpo de cada visão vem pelo <Outlet/>.
 */
interface CarteiraView {
  to: string;
  label: string;
  feature: keyof UserFeatures;
  /** Anchor do tour da sub-visão (mantém os passos atuais funcionando). */
  tourHeaderId: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
}

// Visões cujo cabeçalho ainda é renderizado aqui — quando a página-filha passa
// a renderizar o próprio HEADER_PAGINA (com data-tour), a entrada sai da lista.
const VIEWS: CarteiraView[] = [
  {
    to: "/carteira/cartoes",
    label: "Cartões",
    feature: "cartoes_credito",
    tourHeaderId: "cartoes-header",
    eyebrow: "Faturas",
    title: (
      <>
        Cartões de <Pista>crédito</Pista>
      </>
    ),
    description: "Gerencie seus cartões, limites e faturas",
  },
];

export const CarteiraPage = () => {
  const { features, isAdmin } = useAppContext();
  const location = useLocation();

  const availableViews = VIEWS.filter((v) => isAdmin || features[v.feature]);
  const activeView = availableViews.find((v) => location.pathname.startsWith(v.to));

  return (
    <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
      {activeView && (
        <div data-tour={activeView.tourHeaderId}>
          <PageHeader
            eyebrow={activeView.eyebrow}
            title={activeView.title}
            description={activeView.description}
          />
        </div>
      )}

      <Outlet />
    </div>
  );
};
