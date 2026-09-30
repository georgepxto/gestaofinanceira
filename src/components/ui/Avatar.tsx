interface AvatarProps {
  nome?: string | null;
  /** Em px. 36 é o bloco de ícone de lista; 32 cabe na barra do topo. */
  tamanho?: 28 | 32 | 36 | 40;
  className?: string;
}

/** Inicial do nome num quadrado de --surface-2. Pessoa e usuário, iguais. */
export function Avatar({ nome, tamanho = 36, className = "" }: AvatarProps) {
  const inicial = (nome?.trim() || "?").charAt(0).toLocaleUpperCase("pt-BR");
  return (
    <span
      aria-hidden="true"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho <= 32 ? 13 : 14 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-sm bg-surface-2 text-fg font-medium ${className}`}
    >
      {inicial}
    </span>
  );
}
