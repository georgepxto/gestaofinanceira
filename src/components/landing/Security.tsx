import { useEffect, useRef, type ComponentType } from "react";
import { Fade } from "./Fade";
import { ExportObject, LockObject, PriceTagObject } from "./SecurityObjects";

const POINTS: { t: string; d: string; Obj: ComponentType }[] = [
  {
    t: "Criptografado no caminho e no disco",
    d: "Os dados ficam no Supabase, com conexão cifrada entre o seu aparelho e o servidor e criptografia no armazenamento.",
    Obj: LockObject,
  },
  {
    t: "Seus dados, sua decisão",
    d: "Pela LGPD, você pode exportar tudo o que registrou ou apagar a conta e os dados quando quiser.",
    Obj: ExportObject,
  },
  {
    t: "Nada é vendido",
    d: "O Hedge não mostra anúncios e não vende nem repassa o que você registra.",
    Obj: PriceTagObject,
  },
];

export function Security() {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    // is-in: o gesto de entrada, uma vez. is-visible: o movimento contínuo,
    // que pausa quando o painel sai da tela.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        e.target.classList.toggle("is-visible", e.isIntersecting);
        if (e.isIntersecting && e.intersectionRatio >= 0.55) e.target.classList.add("is-in");
      }),
      { threshold: [0, 0.55] },
    );
    root.querySelectorAll(".lp-obj-panel").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="seguranca" data-lp-theme="dark" className="py-24 lg:py-36">
      <div className="lp-wrap">
        <Fade>
          <h2 className="lp-h2 max-w-[640px]">Seu dinheiro é assunto seu.</h2>
        </Fade>
        {/* Linhas editoriais, não um trio de cards: objeto à esquerda, texto
            à direita, um fio separando. */}
        <ul ref={listRef} className="mt-12 lg:mt-16">
          {POINTS.map(({ t, d, Obj }, i) => (
            <li key={t} style={{ borderTop: "1px solid var(--lp-line)" }}>
              <Fade delay={i * 0.08} className="grid items-center gap-6 py-8 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
                <div className="lp-obj-panel aspect-[3/2] bg-lp-surface px-5 py-3 sm:rounded">
                  <Obj />
                </div>
                <div>
                  <h3 className="lp-h3 lg:text-[24px]">{t}</h3>
                  <p className="mt-2 max-w-[46ch] text-[16px] leading-relaxed text-lp-muted">{d}</p>
                </div>
              </Fade>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
