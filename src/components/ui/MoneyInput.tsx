import { forwardRef, type InputHTMLAttributes } from "react";
import { formatCurrencyInput } from "../../utils/calculations";

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
  /** Valor em pt-BR sem símbolo ("212,40"), como os formulários já guardam. */
  value: string;
  onChange: (valor: string) => void;
  /** "heroi": o valor grande no topo do formulário (40px). "campo": campo comum. */
  tamanho?: "heroi" | "campo";
}

/**
 * O único campo de dinheiro do app.
 *
 * Preenche da direita para a esquerda, como maquininha: digitar 2-1-2-4-0 dá
 * 212,40 — os dois últimos dígitos são sempre os centavos. O valor sai no
 * formato que os formulários já gravam e que `parseCurrency` lê.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, tamanho = "campo", placeholder = "0,00", className = "", ...rest },
  ref,
) {
  const aoDigitar = (e: React.ChangeEvent<HTMLInputElement>) => onChange(formatCurrencyInput(e.target.value));

  if (tamanho === "heroi") {
    // Largura em `ch` acompanha o número: a Geist Mono tem todos os dígitos da
    // mesma largura, então "R$" fica sempre encostado no valor, centralizado.
    const largura = Math.max((value || placeholder).length, 4) + 0.5;
    return (
      <div className={`flex items-baseline justify-center gap-2 ${className}`}>
        <span className="valor text-xl text-fg-3" aria-hidden="true">
          R$
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={aoDigitar}
          placeholder={placeholder}
          style={{ width: `${largura}ch` }}
          // `valor-entrada` existe porque o index.css força 16px em todo input
          // (anti-zoom do iOS) com !important, e engoliria os 40px.
          className="valor-entrada valor max-w-full bg-transparent border-0 p-0 outline-none text-[40px] leading-none tracking-[-0.02em] text-fg placeholder:text-fg-3 focus-visible:outline-none"
          {...rest}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center h-11 bg-surface-2 border border-line rounded-sm focus-within:border-fg-3 transition-colors ${className}`}
    >
      <span className="valor pl-3 pr-1.5 text-fg-3" aria-hidden="true">
        R$
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={aoDigitar}
        placeholder={placeholder}
        className="valor flex-1 min-w-0 h-full bg-transparent border-0 pr-3 outline-none text-fg placeholder:text-fg-3 focus-visible:outline-none"
        {...rest}
      />
    </div>
  );
});
