import { Wallet, Receipt, Coins, Landmark, CreditCard, ScrollText, Gauge, Users, Hourglass, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserFeatures } from "../../types/admin";

export interface NavChild {
  path: string;
  label: string;
  feature: keyof UserFeatures;
  /** Só aparece com a barra lateral recolhida, no lugar do nome. */
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavChild[];
  /** Prefixo de rota do grupo — usado pela barra inferior e pelas pílulas. */
  prefix: string;
}

/**
 * Grupos da navegação — os itens apontam para as sub-rotas reais que já
 * existem. Expandida, a barra mostra os itens como texto; recolhida, como
 * ícone (com o nome no title e para leitor de tela).
 *
 * Mora aqui, e não na Sidebar, porque a barra inferior do mobile e as pílulas
 * de sub-tela desenham esta mesma lista. Uma lista com três consumidores é a
 * própria informação de navegação do app — não é detalhe de um componente.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Carteira",
    icon: Wallet,
    prefix: "/carteira",
    items: [
      { path: "/carteira/contas", label: "Contas e receitas", feature: "contas_bancarias", icon: Landmark },
      { path: "/carteira/cartoes", label: "Cartões", feature: "cartoes_credito", icon: CreditCard },
    ],
  },
  {
    label: "Gastos",
    icon: Receipt,
    prefix: "/gastos",
    items: [
      { path: "/gastos/lancamentos", label: "Lançamentos", feature: "meus_gastos", icon: ScrollText },
      { path: "/gastos/metas", label: "Metas", feature: "metas", icon: Gauge },
    ],
  },
  {
    label: "A receber",
    icon: Coins,
    prefix: "/a-receber",
    items: [
      { path: "/a-receber/pessoas", label: "Por pessoa", feature: "pessoas", icon: Users },
      { path: "/a-receber/aberto", label: "Em aberto", feature: "saldo_devedor", icon: Hourglass },
      { path: "/a-receber/mes", label: "Do mês", feature: "gastos_compartilhados", icon: CalendarDays },
    ],
  },
];

/**
 * Admin vê tudo; usuário comum só vê os itens cujas features estão ativas.
 * Grupo que ficou sem item nenhum não aparece — nem na sidebar, nem na barra.
 */
export function gruposVisiveis(isAdmin: boolean, features: UserFeatures): NavGroup[] {
  return NAV_GROUPS.map((grupo) => ({
    ...grupo,
    items: isAdmin ? grupo.items : grupo.items.filter((item) => features[item.feature]),
  })).filter((grupo) => grupo.items.length > 0);
}
