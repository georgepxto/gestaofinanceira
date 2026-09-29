import { useEffect, useRef, useState } from "react";
import { DemoApp } from "./DemoApp";
import { Fade } from "./Fade";

const TENTE = [
  "Lance R$ 300 em Mercado e veja o orçamento entrar em alerta.",
  "Divida um gasto com Ana e Bruno e confira quem deve a quem.",
  "Marque o aluguel da Ana como quitado e veja o saldo subir.",
];

export function DemoSection() {
  // Trocar a chave remonta a demo do zero. Antes, ela esmaece; o exemplo novo
  // entra do mesmo jeito, para o recomeço não piscar.
  const [run, setRun] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const restart = () => {
    setFading(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setRun((n) => n + 1);
      setFading(false);
    }, 320);
  };

  return (
    <section id="experimente" data-lp-theme="dark" className="py-24 lg:py-36">
      {/* Desktop: texto e sugestões à esquerda, demo à direita. Celular: as
          sugestões vêm depois da demo, perto de onde a pessoa vai testar. */}
      <div className="lp-wrap grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-10">
        <Fade className="lg:self-end">
          <h2 className="lp-h2 max-w-[14ch]">Experimente antes de criar a conta.</h2>
          <p className="lp-lede mt-6 max-w-[42ch]">
            Esta é a casa de exemplo "Apê 302". Lance, divida e quite como faria no app, a partir das sugestões
            abaixo. Nada sai do seu navegador.
          </p>
        </Fade>

        <Fade delay={0.08} className="-mx-5 sm:mx-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div className="lp-restart" data-fading={fading}>
            <DemoApp key={run} />
          </div>
        </Fade>

        <Fade className="lg:col-start-1 lg:row-start-2">
          <ol className="flex flex-col gap-3">
            {TENTE.map((t, i) => (
              <li key={t} className="flex gap-4 text-[15px] leading-relaxed">
                <span className="lp-num pt-[2px] text-[13px] text-lp-muted">{i + 1}</span>
                <span className="max-w-[40ch]">{t}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={restart} className="lp-link mt-6 text-[15px]">
            Recomeçar o exemplo
          </button>
        </Fade>
      </div>
    </section>
  );
}
