import { Wallet, Receipt, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserFeatures } from "../../types/admin";

export interface NavChild {
  path: string;
  label: string;
  feature: keyof UserFeatures;
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
 * existem. Ícone só no rótulo do grupo; os itens são texto puro.
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
      { path: "/carteira/contas", label: "Contas e receitas", feature: "contas_bancarias" },
      { path: "/carteira/cartoes", label: "Cartões", feature: "cartoes_credito" },
    ],
  },
  {
    label: "Gastos",
    icon: Receipt,
    prefix: "/gastos",
    items: [
      { path: "/gastos/lancamentos", label: "Lançamentos", feature: "meus_gastos" },
      { path: "/gastos/metas", label: "Metas", feature: "metas" },
    ],
  },
  {
    label: "A receber",
    icon: Coins,
    prefix: "/a-receber",
    items: [
      { path: "/a-receber/pessoas", label: "Por pessoa", feature: "pessoas" },
      { path: "/a-receber/aberto", label: "Em aberto", feature: "saldo_devedor" },
      { path: "/a-receber/mes", label: "Do mês", feature: "gastos_compartilhados" },
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
