import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context";
import { PageHeader, Pista } from "../components/ui/PageHeader";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";
import type { UserFeatures } from "../types/admin";

/**
 * Aba-mãe "Gastos" — o que gasto vs. quanto quero gastar.
 * Reúne os Lançamentos pessoais e as Metas por categoria sob um cabeçalho
 * único, alternando por sub-rotas reais (/gastos/lancamentos, /gastos/metas).
 *
 * Só apresentação/navegação: o cabeçalho assume a identidade da visão ativa
 * (PageHeader + Pista preservados) e o corpo de cada visão vem pelo <Outlet/>.
 */
interface OrcamentoView {
  to: string;
  label: string;
  feature: keyof UserFeatures;
  /** Anchor do tour da sub-visão (mantém os passos atuais funcionando). */
  tourHeaderId: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
}

const VIEWS: OrcamentoView[] = [
  {
    to: "/gastos/lancamentos",
    label: "Lançamentos",
    feature: "meus_gastos",
    tourHeaderId: "eu-header",
    eyebrow: "Pessoal",
    title: (
      <>
        Meus <Pista>gastos</Pista>
      </>
    ),
    description: "Despesas pessoais e gastos fixos",
  },
  {
    to: "/gastos/metas",
    label: "Metas",
    feature: "metas",
    tourHeaderId: "metas-header",
    eyebrow: "Orçamento",
    title: (
      <>
        Metas de <Pista>gasto</Pista>
      </>
    ),
    description: "Defina tetos mensais por categoria",
  },
];

export const OrcamentoPage = () => {
  const { features, isAdmin } = useAppContext();
  const location = useLocation();

  const availableViews = VIEWS.filter((v) => isAdmin || features[v.feature]);
  const activeView =
    availableViews.find((v) => location.pathname.startsWith(v.to)) ?? availableViews[0];

  return (
    <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
      <div data-tour={activeView?.tourHeaderId}>
        <PageHeader
          eyebrow={activeView?.eyebrow}
          title={activeView?.title}
          description={activeView?.description}
        />
      </div>

      <Outlet />
    </div>
  );
};
