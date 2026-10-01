import type { ReactNode, HTMLAttributes } from "react";
import { useTemSubAbas } from "../layout/SubPills";

// `title` no DOM é uma string (tooltip); aqui é o `<h1>` da página.
/**
 * As ações do cabeçalho. No celular ocupam a largura toda: o seletor de mês
 * fica na linha de cima e os botões dividem a de baixo em partes iguais —
 * bordas alinhadas dos dois lados, em vez de uma fileira torta. (Flex, não
 * grade: botão escondido no celular não deixa buraco.) Exportado para a tela
 * que embrulha as ações num elemento próprio (para o tutorial apontar).
 */
export const classeAcoesCabecalho =
  "flex flex-wrap gap-2 w-full basis-full " +
  "[&>*]:flex-1 [&>*:first-child]:basis-full " +
  "md:items-center md:w-auto md:basis-auto md:[&>*]:flex-none md:[&>*:first-child]:basis-auto";

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
export const PageHeader = ({ eyebrow: _eyebrow, title, description, action, nota, className = "", ...rest }: PageHeaderProps) => {
  // No celular com abas, a aba ativa já é o título: repetir empurra os números
  // para baixo. O <h1> continua lá para o leitor de tela.
  const soDesktop = useTemSubAbas();
  return (
    <div className={className} {...rest}>
      <div className="flex items-end justify-between flex-wrap gap-x-6 gap-y-4">
        <div className={`min-w-0 ${soDesktop ? "sr-only md:not-sr-only" : ""}`}>
          <h1 className="text-2xl md:text-[28px] leading-tight font-title tracking-[-0.01em] text-fg">{title}</h1>
          {description && <p className="text-[15px] md:text-sm text-fg-2 mt-1">{description}</p>}
        </div>
        {action && <div className={classeAcoesCabecalho}>{action}</div>}
      </div>
      {nota && <p className="mt-3 text-xs text-fg-3">{nota}</p>}
    </div>
  );
};
