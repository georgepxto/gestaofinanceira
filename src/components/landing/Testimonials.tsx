import { testimonials } from "../../content/testimonials";
import { Fade } from "./Fade";

/**
 * Grade de fotos. No desktop o depoimento aparece no hover ou no foco;
 * no celular ele fica visível logo abaixo da foto.
 * Sem depoimentos cadastrados, a seção não existe.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section id="depoimentos" data-lp-theme="dark" className="py-24 lg:py-32">
      <div className="lp-wrap">
        <Fade>
          <h2 className="lp-h2">Quem já usa</h2>
        </Fade>
        <ul className="mt-12 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-4">
          {testimonials.map((t) => (
            <li key={t.name}>
              <figure tabIndex={0} className="group relative overflow-hidden rounded focus-visible:outline-offset-4">
                <img
                  src={t.photo}
                  alt={t.name}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/5] w-full bg-lp-surface object-cover"
                />
                <figcaption className="pt-4 lg:absolute lg:inset-0 lg:flex lg:flex-col lg:justify-end lg:p-6 lg:opacity-0 lg:transition-opacity lg:duration-300 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">
                  <span className="pointer-events-none absolute inset-0 hidden bg-lp-bg opacity-90 lg:block" aria-hidden="true" />
                  <blockquote className="relative text-[16px] leading-relaxed">{t.text}</blockquote>
                  <div className="relative mt-3 text-[14px] text-lp-muted">
                    {t.name}
                    {t.role ? `, ${t.role}` : ""}
                  </div>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
