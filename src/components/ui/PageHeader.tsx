import type { ReactNode, HTMLAttributes } from "react";

// `title` no DOM é uma string (tooltip); aqui é o `<h1>` da página.
interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Obsoleto: o sobretítulo em caixa-alta saiu do sistema. Ignorado. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Seletor de mês, ações secundárias e no máximo um botão laranja. */
  action?: ReactNode;
  /** Linha discreta abaixo do cabeçalho (uma nota sobre como ler a tela). */
  nota?: ReactNode;
}

/**
 * Cabeçalho de tela: título (24/28px, 450) e uma descrição curta à esquerda;
 * à direita, o que age sobre a tela inteira.
 */
export const PageHeader = ({ eyebrow: _eyebrow, title, description, action, nota, className = "", ...rest }: PageHeaderProps) => (
  <div className={className} {...rest}>
    <div className="flex items-end justify-between flex-wrap gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-[28px] leading-tight font-title tracking-[-0.01em] text-fg">{title}</h1>
        {description && <p className="text-[15px] md:text-sm text-fg-2 mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
    </div>
    {nota && <p className="mt-3 text-xs text-fg-3">{nota}</p>}
  </div>
);
