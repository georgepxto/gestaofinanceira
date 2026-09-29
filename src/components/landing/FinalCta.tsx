import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Bus, Home, Popcorn, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { formatCurrencyInput, parseCurrency } from "../../utils/calculations";
import { Fade } from "./Fade";
import { QrCode } from "./QrCode";
import { signed } from "./format";

const CATS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "alimentacao", label: "Alimentação", Icon: UtensilsCrossed },
  { id: "mercado", label: "Mercado", Icon: ShoppingBasket },
  { id: "transporte", label: "Transporte", Icon: Bus },
  { id: "casa", label: "Casa", Icon: Home },
  { id: "lazer", label: "Lazer", Icon: Popcorn },
];

/** Cadastro no endereço onde a página está aberta (produção, prévia ou local). */
const signupUrl = typeof window === "undefined" ? "/login?mode=signup" : `${window.location.origin}/login?mode=signup`;

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
      <section id="comecar" data-lp-theme="dark" className="py-24 lg:py-36">
        <div className="lp-wrap grid items-center gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
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

          <Fade delay={0.08} className="-mx-5 sm:mx-0">
            <form onSubmit={onSubmit} className="bg-lp-surface px-6 py-7 sm:rounded sm:px-8 sm:py-8" aria-label="Seu primeiro lançamento">
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

              <label htmlFor="lp-desc" className="mt-6 block text-[13px] text-lp-muted">
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

              <fieldset className="mt-6">
                <legend className="text-[13px] text-lp-muted">Categoria</legend>
                <div className="mt-3 flex flex-wrap gap-2">
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
              <div className="mt-8 bg-lp-bg px-4 py-4 sm:rounded-sm">
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
                <div className="mt-3 text-[12px] text-lp-muted">
                  Primeiro gasto de {MES} em {atual.label.toLowerCase()}.
                </div>
              </div>

              <button type="submit" className="lp-btn lp-btn-lg mt-8 w-full">
                Criar conta grátis
              </button>
              <p className="mt-4 text-center text-[14px] text-lp-muted">
                Já tem conta?{" "}
                <Link to="/login" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-lp-fg underline decoration-1 underline-offset-4">
                  Entrar
                </Link>
              </p>
            </form>
          </Fade>
        </div>
      </section>

      <footer
        className="pb-[max(32px,env(safe-area-inset-bottom))] pt-8"
        style={{ borderTop: "1px solid var(--lp-line)" }}
      >
        <div className="lp-wrap flex flex-col gap-2 text-[14px] sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex items-baseline gap-4">
            <span className="text-[17px] font-medium">Hedge</span>
            <span className="text-lp-muted">Suas contas na régua.</span>
          </div>
          <span className="text-lp-muted">© <span className="lp-num">2026</span></span>
        </div>
      </footer>
    </>
  );
}
