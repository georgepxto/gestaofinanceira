import { useEffect, useState } from "react";

const CONSULTA = "(max-width: 767px)";

/** Verdadeiro abaixo de 768px — o mesmo corte do `md:` do Tailwind. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(CONSULTA).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const onChange = () => setIsMobile(mq.matches);
    // Sincroniza uma vez: entre o `useState` e este efeito a janela pode ter
    // mudado de faixa (rotação de tela, DevTools).
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
