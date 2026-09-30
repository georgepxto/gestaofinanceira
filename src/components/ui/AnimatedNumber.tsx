import { useEffect, useRef, useState } from "react";
import { formatDinheiro, partesDinheiro } from "../../utils/dinheiro";

const DURACAO_MS = 1500;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

const prefereMenosMovimento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * O valor exibido corre do número antigo para o novo em 1,5 s, com ease-out
 * cúbico — o comportamento do protótipo `hedge-saldo-animado.html`.
 *
 * Só anima quando o valor MUDA: na montagem o número aparece pronto (contar de
 * zero a cada troca de tela seria teatro). Com reduced motion, troca na hora.
 */
export function useContagem(alvo: number, duracao = DURACAO_MS) {
  const [exibido, setExibido] = useState(alvo);
  const exibidoRef = useRef(alvo);

  useEffect(() => {
    const de = exibidoRef.current;
    if (de === alvo) return;
    if (prefereMenosMovimento()) {
      exibidoRef.current = alvo;
      setExibido(alvo);
      return;
    }
    const inicio = performance.now();
    let raf = 0;
    const quadro = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracao);
      const v = de + (alvo - de) * easeOutCubic(p);
      exibidoRef.current = v;
      setExibido(v);
      if (p < 1) raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [alvo, duracao]);

  return exibido;
}

interface AnimatedNumberProps {
  valor: number;
  /** Centavos menores e elevados, no estilo Mercury. Só em número de destaque. */
  centavosElevados?: boolean;
  /** "+" em valor positivo. */
  positivo?: boolean;
  /** Formato próprio (percentual, contagem). Ignora `centavosElevados`. */
  formatar?: (v: number) => string;
  className?: string;
}

export function AnimatedNumber({
  valor,
  centavosElevados = false,
  positivo = false,
  formatar,
  className = "",
}: AnimatedNumberProps) {
  const exibido = useContagem(valor);
  // Durante a contagem o leitor de tela ouviria cada quadro: o texto acessível
  // é o valor final, e o que anima fica escondido dele.
  const final = formatar ? formatar(valor) : formatDinheiro(valor, { positivo });

  let visivel: React.ReactNode;
  if (formatar) {
    visivel = formatar(exibido);
  } else if (centavosElevados) {
    const { sinal, inteiro, centavos } = partesDinheiro(exibido, { positivo });
    visivel = (
      <>
        {sinal}
        {inteiro}
        <span className="centavos">{centavos}</span>
      </>
    );
  } else {
    visivel = formatDinheiro(exibido, { positivo });
  }

  return (
    // `relative`: o texto sr-only é absoluto e, sem isto, escapava da fileira
    // rolável do KpiStrip e alargava a página no celular.
    <span className={`valor relative ${className}`}>
      <span aria-hidden="true">{visivel}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
