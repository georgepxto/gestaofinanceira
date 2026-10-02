import { useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { Fade } from "./Fade";
import {
  CropCartoes,
  CropCompartilhados,
  CropContas,
  CropMetas,
  CropPessoais,
  CropRelatorios,
} from "./FeatureCrops";
import { FeatureVisual, type Photo } from "./FeatureVisual";
import { ScrollTrigger, gsap } from "./useLandingMotion";

type Feature = { id: string; title: string; text: string; Crop: ComponentType; photo: Photo; wide?: boolean };

const FEATURES: Feature[] = [
  {
    id: "f-pessoais",
    title: "Gastos pessoais",
    text: "Lance o gasto em segundos e ele já cai na categoria certa do mês.",
    Crop: CropPessoais,
    photo: { src: "/landing/mercado.webp", w: 1000, h: 1500, alt: "Sacolas de pano com batatas, vagens e legumes sobre a mesa." },
  },
  {
    id: "f-compartilhados",
    title: "Gastos compartilhados",
    text: "Quanto cada pessoa te deve, somando o mês e as cobranças, e o que já voltou.",
    Crop: CropCompartilhados,
    photo: { src: "/landing/jantar.webp", w: 1200, h: 800, alt: "Amigos jantando juntos à mesa de um apartamento, com a janela aberta ao fundo.", pos: "50% 70%" },
    wide: true,
  },
  {
    id: "f-cartoes",
    title: "Cartões de crédito",
    text: "Fatura aberta, limite usado e parcelas que ainda vêm pela frente.",
    Crop: CropCartoes,
    photo: { src: "/landing/cartao.webp", w: 1000, h: 1500, alt: "Cartão sendo aproximado da maquininha para pagar." },
  },
  {
    id: "f-metas",
    title: "Limites de gasto",
    text: "Um teto por mês para cada categoria, com aviso antes de estourar e não depois.",
    Crop: CropMetas,
    photo: { src: "/landing/cafe.webp", w: 1000, h: 750, alt: "Pagamento com cartão no balcão de uma cafeteria, ao lado de um café e um doce." },
  },
  {
    id: "f-contas",
    title: "Contas bancárias",
    text: "Cada conta com o saldo que você lança, e o total aparece sozinho.",
    Crop: CropContas,
    photo: { src: "/landing/chaves.webp", w: 1000, h: 667, alt: "Mão segurando as chaves de casa no corredor do prédio." },
  },
  {
    id: "f-relatorios",
    title: "Relatórios em PDF",
    text: "O mês fechado por categoria, pronto para guardar ou mandar para o contador.",
    Crop: CropRelatorios,
    photo: { src: "/landing/contas.webp", w: 1000, h: 1499, alt: "Celular com a calculadora aberta sobre folhas impressas com gráficos." },
  },
];

const num = (i: number) => String(i + 1).padStart(2, "0");

export function Features() {
  const [active, setActive] = useState(0);
  const blocksRef = useRef<HTMLDivElement>(null);

  // Desktop: o bloco que cruza o meio da tela acende o item da lista.
  useLayoutEffect(() => {
    const root = blocksRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      root.querySelectorAll<HTMLElement>("[data-feature]").forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => { if (self.isActive) setActive(i); },
        });
      });
    });
    return () => mm.revert();
  }, []);

  // No toque não há hover: a foto do bloco que está no meio da tela ganha cor.
  useLayoutEffect(() => {
    const root = blocksRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-center", e.isIntersecting)),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    root.querySelectorAll("[data-feature]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="funcionalidades" data-lp-theme="light" className="pb-24 pt-8 lg:pb-40 lg:pt-16">
      <div className="lp-wrap">
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          {/* Título e lista ficam presos juntos no desktop e só saem com a seção */}
          <div>
            <div className="lg:sticky lg:top-[calc(var(--lp-nav-h)+48px)]">
              <Fade>
                <h2 className="lp-h2 max-w-[640px]">Do café ao aluguel dividido.</h2>
              </Fade>
              <nav aria-label="Funcionalidades" className="mt-10 hidden lg:block">
                <ol>
                  {FEATURES.map((f, i) => {
                    const on = i === active;
                    return (
                      <li key={f.id}>
                        <a
                          href={`#${f.id}`}
                          aria-current={on ? "true" : undefined}
                          className={`flex items-baseline gap-5 py-3 transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "text-lp-fg" : "text-lp-muted hover:text-lp-fg"}`}
                        >
                          <span className="lp-num w-6 text-[13px]">{num(i)}</span>
                          <span className="flex-1">
                            <span className="block text-[22px] font-[450] leading-snug">{f.title}</span>
                            <span
                              className="grid transition-[grid-template-rows,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                              style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}
                            >
                              <span className="overflow-hidden">
                                <span className="block max-w-[34ch] pb-1 pt-2 text-[15px] leading-relaxed text-lp-muted">
                                  {f.text}
                                </span>
                              </span>
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </div>

          <div ref={blocksRef} className="mt-14 lg:mt-0">
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                id={f.id}
                data-feature
                className={`scroll-mt-24 py-8 first:pt-0 lg:flex lg:items-center lg:py-0 ${f.wide ? "lg:min-h-[100vh]" : "lg:min-h-[80vh]"}`}
              >
                <Fade className="w-full">
                  {/* Título e frase no celular; no desktop quem fala é a lista */}
                  <div className="mb-6 lg:sr-only">
                    <div className="flex items-baseline gap-4">
                      <span className="lp-num text-[13px] text-lp-muted">{num(i)}</span>
                      <h3 className="lp-h3">{f.title}</h3>
                    </div>
                    <p className="mt-2 max-w-[40ch] pl-[calc(2ch+1rem)] text-[15px] leading-relaxed text-lp-muted">
                      {f.text}
                    </p>
                  </div>
                  <div className="-mx-5 sm:mx-0">
                    <FeatureVisual photo={f.photo} Crop={f.Crop} wide={f.wide} />
                  </div>
                </Fade>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
