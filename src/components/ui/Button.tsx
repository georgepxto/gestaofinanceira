import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variante = "principal" | "secundario" | "fantasma" | "perigo";

const VARIANTE: Record<Variante, string> = {
  // Laranja: uma por tela (ver AcaoPrincipalContext). Texto quase-preto.
  principal: "bg-accent text-accent-fg hover:bg-accent/90",
  secundario: "bg-surface-2 text-fg hover:bg-surface-3",
  fantasma: "text-fg-2 hover:text-fg hover:bg-surface-2",
  perigo: "bg-danger text-accent-fg hover:bg-danger/90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  icone?: ReactNode;
  carregando?: boolean;
  cheio?: boolean;
  tamanho?: "md" | "sm";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variante = "secundario",
    icone,
    carregando = false,
    cheio = false,
    tamanho = "md",
    className = "",
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const altura = tamanho === "sm" ? "h-9 px-3 text-sm" : "h-11 md:h-10 px-4 text-[15px] md:text-sm";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || carregando}
      className={`${altura} ${cheio ? "w-full" : ""} inline-flex items-center justify-center gap-2 rounded font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTE[variante]} ${className}`}
      {...rest}
    >
      {carregando ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : icone}
      {children}
    </button>
  );
});
