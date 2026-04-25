export function toActionableErrorMessage(error: unknown, fallback = "Não foi possível concluir a ação."): string {
  const raw = String((error as { message?: string })?.message || error || "").toLowerCase();

  if (raw.includes("jwt") || raw.includes("token") || raw.includes("session")) {
    return "Sua sessão expirou. Atualize a página e faça login novamente para continuar.";
  }

  if (raw.includes("network") || raw.includes("failed to fetch") || raw.includes("fetch")) {
    return "Não conseguimos conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  if (raw.includes("permission") || raw.includes("not authorized") || raw.includes("forbidden") || raw.includes("rls")) {
    return "Você não tem permissão para esta ação. Confirme se está na conta correta ou fale com o administrador.";
  }

  if (raw.includes("foreign key") || raw.includes("23503") || raw.includes("conflict")) {
    return "Este item possui vínculos e não pode ser removido agora. Remova os registros relacionados e tente novamente.";
  }

  if (raw.includes("duplicate") || raw.includes("already exists") || raw.includes("23505")) {
    return "Já existe um registro com esses dados. Ajuste as informações e tente salvar novamente.";
  }

  if (raw.includes("invalid") || raw.includes("form") || raw.includes("parse")) {
    return "Alguns campos estão inválidos. Revise os dados preenchidos e tente novamente.";
  }

  return `${fallback} Tente novamente em instantes.`;
}
