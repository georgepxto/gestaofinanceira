import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context";
import { PageHeader, Pista } from "../components/ui/PageHeader";
import { SegmentedTabs } from "../components/ui/SegmentedTabs";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";
import type { UserFeatures } from "../types/admin";

/**
 * Aba-mãe "Na Rua" — o dinheiro que tenho a receber.
 * Reúne três recortes do mesmo domínio sob um cabeçalho único, alternando por
 * sub-rotas reais:
 *  - Por mês   (/a-receber/mes)     — empréstimos parcelados do mês
 *  - Em aberto (/a-receber/aberto)  — cobranças avulsas por saldo
 *  - Por pessoa(/a-receber/pessoas) — devedores
 *
 * Só apresentação/navegação: o cabeçalho assume a identidade da visão ativa
 * (PageHeader + Pista preservados) e o corpo de cada visão vem pelo <Outlet/>.
 */
interface NaRuaView {
  to: string;
  label: string;
  feature: keyof UserFeatures;
  /** Anchor do tour da sub-visão (mantém os passos atuais funcionando). */
  tourHeaderId: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
}

const VIEWS: NaRuaView[] = [
  {
    to: "/a-receber/mes",
    label: "Por mês",
    feature: "gastos_compartilhados",
    tourHeaderId: "gastos-header",
    eyebrow: "Empréstimos",
    title: (
      <>
        Empréstimos do <Pista>mês</Pista>
      </>
    ),
    description: "Valores a receber organizados por devedor",
  },
  {
    to: "/a-receber/aberto",
    label: "Em aberto",
    feature: "saldo_devedor",
    tourHeaderId: "dividas-header",
    eyebrow: "A receber",
    title: (
      <>
        Dívidas em <Pista>aberto</Pista>
      </>
    ),
    description: "Acompanhe quanto ainda precisam te pagar",
  },
  {
    to: "/a-receber/pessoas",
    label: "Por pessoa",
    feature: "pessoas",
    tourHeaderId: "devedores-header",
    eyebrow: "A receber",
    title: (
      <>
        <Pista>Devedores</Pista>
      </>
    ),
    description: "Gerencie pessoas com valores em aberto com você",
  },
];

export const NaRuaPage = () => {
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

      <SegmentedTabs
        ariaLabel="Visões do que está na rua"
        tabs={availableViews.map((v) => ({ to: v.to, label: v.label }))}
      />

      <Outlet />
    </div>
  );
};
