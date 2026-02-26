// ========== TIPOS ADMIN ==========

export interface UserRole {
  role: "admin" | "user";
  is_active: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  nome: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
  role: "admin" | "user";
}

export interface UserFeatures {
  dashboard: boolean;
  meus_gastos: boolean;
  gastos_compartilhados: boolean;
  saldo_devedor: boolean;
  pessoas: boolean;
  contas_bancarias: boolean;
  cartoes_credito: boolean;
  metas: boolean;
  exportar_pdf: boolean;
  configuracoes: boolean;
}

// ========== TIPOS ADMIN V2 ==========

export interface UsageStats {
  total_users: number;
  active_today: number;
  active_7d: number;
  active_30d: number;
  new_users_7d: number;
  new_users_30d: number;
  logins_today: number;
  logins_7d: number;
  logins_30d: number;
  daily_logins: { dia: string; total: number }[];
  daily_signups: { dia: string; total: number }[];
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  email: string;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface InactiveUser {
  id: string;
  email: string;
  nome: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  days_inactive: number;
  is_active: boolean;
}

export interface LoginAttemptResult {
  blocked: boolean;
  remaining_attempts: number;
  locked_until?: string;
  message?: string;
}

export type AdminTab = "users" | "dashboard" | "inactive" | "logs";

// ========== CONSTANTES ==========

export const DEFAULT_FEATURES: UserFeatures = {
  dashboard: true,
  meus_gastos: true,
  gastos_compartilhados: true,
  saldo_devedor: true,
  pessoas: true,
  contas_bancarias: true,
  cartoes_credito: true,
  metas: true,
  exportar_pdf: true,
  configuracoes: true,
};

export const FEATURE_LABELS: Record<keyof UserFeatures, string> = {
  dashboard: "Dashboard",
  meus_gastos: "Meus Gastos",
  gastos_compartilhados: "Gastos Compartilhados",
  saldo_devedor: "Saldo Devedor",
  pessoas: "Pessoas",
  contas_bancarias: "Contas Bancárias",
  cartoes_credito: "Cartões de Crédito",
  metas: "Metas de Gasto",
  exportar_pdf: "Exportar PDF",
  configuracoes: "Configurações",
};

export const FEATURE_DESCRIPTIONS: Record<keyof UserFeatures, string> = {
  dashboard: "Visão geral financeira com gráficos e métricas",
  meus_gastos: "Controle de gastos pessoais, fixos e divididos",
  gastos_compartilhados: "Gastos divididos por pessoa com parcelas",
  saldo_devedor: "Controle de dívidas e valores a receber",
  pessoas: "Cadastro de pessoas para gastos compartilhados",
  contas_bancarias: "Gerenciamento de contas e receitas",
  cartoes_credito: "Controle de cartões e faturas",
  metas: "Definição de tetos por categoria",
  exportar_pdf: "Exportação de relatórios em PDF",
  configuracoes: "Configurações de perfil e aparência",
};
