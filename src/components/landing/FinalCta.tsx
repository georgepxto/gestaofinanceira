import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Bus, Home, Popcorn, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { formatCurrencyInput, parseCurrency } from "../../utils/calculations";
import { Fade } from "./Fade";
import { Footer } from "./Footer";
import { MarkBackdrop } from "./MarkGhost";
import { QrCode } from "./QrCode";
import { signed } from "./format";

const CATS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "alimentacao", label: "Alimentação", Icon: UtensilsCrossed },
  { id: "mercado", label: "Mercado", Icon: ShoppingBasket },
  { id: "transporte", label: "Transporte", Icon: Bus },
  { id: "casa", label: "Casa", Icon: Home },
  { id: "lazer", label: "Lazer", Icon: Popcorn },
];

/** Cadastro no site oficial: o QR é lido por outro aparelho, então aponta
    sempre para produção (aberta em localhost ou numa prévia, a página
    mandaria o celular para um endereço que ele não alcança). */
const signupUrl = "https://gethedge.vercel.app/login?mode=signup";

const MES = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

/**
 * Fechamento da página: em vez de pedir o cadastro no vazio, a pessoa já
 * lança o gasto de hoje e vê como ele fica no app. O envio leva ao cadastro.
 * O lançamento é só uma prévia: nada é gravado, por isso o botão não promete
 * guardar.
 */
export function FinalCta() {
  const navigate = useNavigate();
  const [valor, setValor] = useState("34,90");
  const [desc, setDesc] = useState("Almoço");
  const [cat, setCat] = useState(CATS[0].id);

  const atual = CATS.find((c) => c.id === cat) ?? CATS[0];
  const numero = parseCurrency(valor);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/login?mode=signup");
  };

  return (
    <>
      {/* No desktop, seção + rodapé ocupam exatamente uma tela: a última
          composição se vê inteira. Atrás dela, o monograma gigante. */}
      <section id="comecar" data-lp-theme="dark" className="relative overflow-hidden py-24 lg:flex lg:min-h-[calc(100svh-var(--lp-foot-h))] lg:flex-col lg:justify-center lg:pb-10 lg:pt-[calc(var(--lp-nav-h)+32px)]">
        {/* A ponta de cima fica logo abaixo da barra do topo quando a página
            chega ao fim; a base passa da borda de baixo e sai cortada. A
            largura vai do vão entre título e formulário até a margem (o bojo
            do D fica inteiro). Só no desktop: no celular o formulário ocupa
            a largura e sobrariam linhas soltas. */}
        <MarkBackdrop className="right-[3%] top-[calc(var(--lp-nav-h)+16px)] hidden w-[calc(47%-44px)] lg:block" />
        <div className="lp-wrap relative grid items-center gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <Fade>
            <h2 className="lp-h1 max-w-[12ch]">Comece pelo gasto de hoje.</h2>
            <p className="lp-lede mt-6 max-w-[40ch]">
              Lance aqui o gasto de hoje e veja como ele entra no seu mês. Criar a conta leva menos de um minuto.
            </p>
            <ul className="mt-8 flex flex-col gap-2 text-[15px] text-lp-muted">
              <li>Grátis e sem anúncios</li>
              <li>Não pede cartão</li>
              <li>Sozinho ou dividindo com quem mora com você</li>
            </ul>

          {/* No computador: o caminho até o celular, onde o Hedge é usado. */}
          <div className="mt-12 hidden items-center gap-5 lg:flex">
            <QrCode value={signupUrl} size={112} label="QR code para criar a conta no celular" />
            <div>
              <div className="text-[15px]">Abra no celular</div>
              <p className="mt-1 max-w-[26ch] text-[14px] leading-relaxed text-lp-muted">
                Aponte a câmera para criar a conta por lá. É onde você vai lançar no dia a dia.
              </p>
            </div>
          </div>
          </Fade>

          {/* Celular: o monograma laranja vira a placa (como a foto das
              funcionalidades) e o formulário sobe sobre a base dela. */}
          <div aria-hidden="true" className="relative -mx-5 aspect-[5/4] overflow-hidden sm:-mx-10 lg:hidden">
            <MarkBackdrop ownScroll className="left-[7%] top-[9%] w-[78%]" />
          </div>

          <Fade delay={0.08} className="relative z-10 mx-0 -mt-[136px] sm:mt-0 lg:mt-0">
            <form onSubmit={onSubmit} className="rounded bg-lp-surface px-6 py-7 sm:px-8 sm:py-8 lg:py-7" aria-label="Seu primeiro lançamento">
              <label htmlFor="lp-valor" className="text-[13px] text-lp-muted">
                Quanto você gastou hoje?
              </label>
              <div className="lp-field mt-2 flex items-baseline gap-2">
                <span className="lp-num text-[22px] text-lp-muted">R$</span>
                <input
                  id="lp-valor"
                  inputMode="numeric"
                  autoComplete="off"
                  value={valor}
                  onChange={(e) => setValor(formatCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="lp-num lp-input lp-amount w-full min-w-0 bg-transparent pb-3 leading-none"
                />
              </div>

              <label htmlFor="lp-desc" className="lp-cta-gap mt-6 block text-[13px] text-lp-muted">
                Com o quê?
              </label>
              <input
                id="lp-desc"
                autoComplete="off"
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 40))}
                placeholder="Ex.: almoço"
                className="lp-input lp-field mt-1 w-full bg-transparent pb-3 pt-2 text-[16px]"
              />

              <fieldset className="lp-cta-gap mt-6">
                <legend className="text-[13px] text-lp-muted">Categoria</legend>
                <div className="lp-chip-row mt-3 flex flex-wrap gap-2">
                  {CATS.map((c) => {
                    const on = c.id === cat;
                    return (
                      <label
                        key={c.id}
                        className={`lp-chip ${on ? "is-on" : ""}`}
                      >
                        <input
                          type="radio"
                          name="lp-cat"
                          value={c.id}
                          checked={on}
                          onChange={() => setCat(c.id)}
                          className="sr-only"
                        />
                        <c.Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        {c.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Como o lançamento aparece no app */}
              {/* Sem aria-live: é o eco do que a pessoa acabou de digitar, e
                  anunciaria a prévia inteira a cada tecla. */}
              <div className="mt-8 bg-lp-bg px-4 py-4 sm:rounded-sm lg:mt-6">
                <div className="text-[12px] text-lp-muted">Assim ele entra no seu mês</div>
                <div className="mt-3 flex items-center gap-3.5">
                  <atual.Icon className="h-[18px] w-[18px] shrink-0 text-lp-muted" strokeWidth={1.5} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px]">{desc.trim() || "Sem descrição"}</div>
                    <div className="text-[12px] text-lp-muted">{atual.label}, hoje</div>
                  </div>
                  <span className="lp-num whitespace-nowrap text-[14px] text-lp-muted">
                    {numero > 0 ? signed(-numero) : "R$ 0,00"}
                  </span>
                </div>
                <div className="lp-cta-note mt-3 text-[12px] text-lp-muted">
                  Primeiro gasto de {MES} em {atual.label.toLowerCase()}.
                </div>
              </div>

              <button type="submit" className="lp-btn lp-btn-lg mt-8 w-full lg:mt-6">
                Criar conta grátis
              </button>
              <p className="lp-cta-login mt-4 text-center text-[14px] text-lp-muted lg:mt-2">
                Já tem conta?{" "}
                <Link to="/login" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-lp-fg underline decoration-1 underline-offset-4">
                  Entrar
                </Link>
              </p>
            </form>
          </Fade>

          {/* Base da coluna: o monograma subindo e, ao lado, o QR. No
              celular vem depois do formulário, sem o QR. */}
        </div>
      </section>

      <Footer />
    </>
  );
}
