import { useCallback, useEffect, useRef, useState } from "react";
import { BalanceHero } from "../ui/BalanceHero";
import { ListGroup } from "../ui/ListRow";
import { ProgressBar } from "../ui/ProgressBar";
import { formatCurrency } from "../../utils/calculations";
import { LinhaLancamento, TelaApp } from "./app/telas";
import { LANCAMENTOS, METAS, SALDO_HOJE, USUARIA, type Lancamento } from "./app/mock";
import { prefersReducedMotion } from "./motion-prefs";

/* ═══════════════════════════════════════════════════════════════════════
   O hero: o saldo de hoje, os últimos lançamentos e as metas do mês, com os
   componentes do app, vivos. De tempos em tempos entra um gasto ou o Pix de
   alguém que te devia: a linha desliza para o topo da lista, o saldo conta
   até o novo valor e a meta da categoria anda. As bordas dissolvem no fundo.
   ═══════════════════════════════════════════════════════════════════════ */

type Evento = Omit<Lancamento, "id" | "dia">;

const POOL: Evento[] = [
  { descricao: "Pix de Ana, aluguel", categoria: "Ana", tipo: "debito", valor: 1050, entrada: true },
  { descricao: "Feira da semana", categoria: "Alimentação", tipo: "debito", valor: 54.3 },
  { descricao: "Cinema", categoria: "Lazer", tipo: "credito", valor: 72 },
  { descricao: "Pix de Bruno, jantar", categoria: "Bruno", tipo: "debito", valor: 62, entrada: true },
  { descricao: "Uber", categoria: "Transporte", tipo: "credito", valor: 21.5 },
  { descricao: "Padaria", categoria: "Alimentação", tipo: "debito", valor: 18.9 },
];

const METAS_HERO = METAS.filter((m) => ["Alimentação", "Lazer", "Transporte"].includes(m.categoria));
const INTERVALO_MS = 4200;
const round2 = (v: number) => Math.round(v * 100) / 100;

const atividade = (e: Evento) =>
  e.entrada ? `${e.categoria} te pagou ${formatCurrency(e.valor)}` : `Você lançou ${e.descricao.toLowerCase()}`;

export function LiveBalanceCard() {
  const [saldo, setSaldo] = useState(SALDO_HOJE);
  const [ultimos, setUltimos] = useState<Lancamento[]>(LANCAMENTOS.slice(0, 3));
  const [novos, setNovos] = useState<Set<number>>(new Set());
  const [metas, setMetas] = useState(METAS_HERO);
  const [aviso, setAviso] = useState({ texto: "Bruno te pagou R$ 62,00", n: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const idx = useRef(0);

  const tick = useCallback(() => {
    const i = idx.current++;
    // Uma volta no pool fecha o "mês": saldo e metas voltam ao começo.
    if (i > 0 && i % POOL.length === 0) {
      setSaldo(SALDO_HOJE);
      setMetas(METAS_HERO);
    }
    const e = POOL[i % POOL.length];
    const id = 1000 + i;
    // Débito sai do saldo; crédito vai para a fatura; Pix de quem devia entra.
    if (e.entrada) setSaldo((s) => round2(s + e.valor));
    else if (e.tipo === "debito") setSaldo((s) => round2(s - e.valor));
    if (!e.entrada) setMetas((ms) => ms.map((m) => (m.categoria === e.categoria ? { ...m, gasto: round2(m.gasto + e.valor) } : m)));
    setUltimos((l) => [{ ...e, id, dia: 28 }, ...l].slice(0, 3));
    setNovos(new Set([id]));
    setAviso({ texto: atividade(e), n: i + 1 });
  }, []);

  // O loop só corre com o card na tela e a aba visível.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const root = rootRef.current;
    if (!root) return;
    let timer = 0;
    let first = 0;
    let visible = false;
    const sync = () => {
      const run = visible && document.visibilityState === "visible";
      if (run && !timer) {
        first = window.setTimeout(tick, 1800);
        timer = window.setInterval(tick, INTERVALO_MS);
      }
      if (!run && timer) {
        clearTimeout(first);
        clearInterval(timer);
        timer = 0;
      }
    };
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      sync();
    }, { threshold: 0.2 });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [tick]);

  return (
    // lp-screen: as quatro bordas dissolvem no fundo. Em tela baixa, o cartão
    // é limitado à altura da tela e a base dissolve em vez de invadir a seção
    // seguinte.
    <div ref={rootRef} className="lp-screen relative mx-auto w-full max-w-[440px] overflow-hidden lg:max-h-[calc(100svh-150px)]">
      <div role="img" aria-label="O Hedge com o saldo de hoje, os últimos lançamentos e os limites se atualizando a cada lançamento. Dados fictícios.">
        <div aria-hidden="true">
          <TelaApp className="px-10 pt-12 pb-16">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[15px] text-fg">Olá, {USUARIA}</p>
              <p className="text-sm text-fg-2">Outubro</p>
            </div>
            <p key={aviso.n} className="mt-1 text-xs text-fg-2 animate-[entra-item_400ms_var(--ease-out-expo)]">
              {aviso.texto}
            </p>

            <BalanceHero rotulo="Saldo hoje" valor={saldo} className="mt-7" />

            <ListGroup titulo="Últimos lançamentos" className="mt-7">
              {ultimos.map((g) => (
                <LinhaLancamento key={g.id} g={g} novo={novos.has(g.id)} />
              ))}
            </ListGroup>

            <div className="mt-7">
              <p className="text-xs text-fg-3 mb-1">Limites do mês</p>
              {metas.map((m) => (
                <div key={m.categoria} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-fg">{m.categoria}</span>
                    <span className="text-xs text-fg-2">
                      <span className="valor">{formatCurrency(m.gasto)}</span> de <span className="valor">{formatCurrency(m.limite)}</span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar valor={m.gasto} maximo={m.limite} rotulo={`${m.categoria}: limite do mês`} />
                  </div>
                </div>
              ))}
            </div>
          </TelaApp>
        </div>
      </div>
    </div>
  );
}
