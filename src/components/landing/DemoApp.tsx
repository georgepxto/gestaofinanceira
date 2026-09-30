import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Check, Home, Plus, Users } from "lucide-react";
import { formatCurrencyInput, parseCurrency } from "../../utils/calculations";
import { BalanceView } from "./BalanceView";
import { activityOf } from "./LiveBalanceCard";
import { brl } from "./format";
import { useCountUp } from "./useCountUp";
import {
  BASE_BALANCE,
  BASE_SPENT,
  CATS,
  INITIAL_TXS,
  applySpent,
  round2,
  type Budgeted,
  type Spent,
  type Tx,
} from "./ledger";

/* ═══════════════════════════════════════════════════════════════════════
   Demo do app na landing. Tudo acontece na memória do navegador: nada é
   enviado, nada é gravado. A aba Início é a mesma BalanceView do hero, então
   um lançamento feito aqui entra com a mesma animação (lista desliza, saldo
   conta, barra anda).
   ═══════════════════════════════════════════════════════════════════════ */

type Person = "você" | "Ana" | "Bruno";
const PEOPLE: Person[] = ["você", "Ana", "Bruno"];
type Shared = { id: number; desc: string; total: number; payer: Person; settled: Person[] };
type Tab = "inicio" | "lancar" | "dividir";

const INITIAL_SHARED: Shared[] = [
  { id: 1, desc: "Aluguel", total: 3150, payer: "você", settled: ["Bruno"] },
  { id: 2, desc: "Compra do mês", total: 412.8, payer: "Ana", settled: ["Bruno"] },
];

const cap = (p: Person) => (p === "você" ? "Você" : p);

function debtsOf(shared: Shared[]) {
  return shared.flatMap((e) =>
    PEOPLE.filter((p) => p !== e.payer).map((p) => ({
      key: `${e.id}-${p}`,
      expId: e.id,
      desc: e.desc,
      from: p,
      to: e.payer,
      v: round2(e.total / PEOPLE.length),
      settled: e.settled.includes(p),
    })),
  );
}

type State = {
  txs: Tx[];
  spent: Spent;
  balance: number;
  hot: Budgeted | null;
  delta: number | null;
  seq: number;
  shared: Shared[];
  nextId: number;
  activity: string;
};

const INITIAL: State = {
  txs: INITIAL_TXS,
  spent: BASE_SPENT,
  balance: BASE_BALANCE,
  hot: null,
  delta: null,
  seq: 0,
  shared: INITIAL_SHARED,
  nextId: 100,
  activity: "Bruno te pagou R$ 145,00",
};

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "inicio", label: "Início", Icon: Home },
  { id: "lancar", label: "Lançar", Icon: Plus },
  { id: "dividir", label: "Dividir", Icon: Users },
];
const tabIndex = (t: Tab) => TABS.findIndex((x) => x.id === t);

/** Tempo para a aba Início terminar de entrar antes de o lançamento chegar. */
const ENTER_MS = 420;

export function DemoApp() {
  const [s, setS] = useState<State>(INITIAL);
  // Abre em Lançar: o Início é o mesmo card que o hero acabou de mostrar.
  const [tab, setTab] = useState<Tab>("lancar");
  // De que lado a aba nova entra: da direita se ela fica à direita da anterior.
  const [dir, setDir] = useState<1 | -1>(1);
  const uid = useId();
  const pending = useRef(0);
  useEffect(() => () => clearTimeout(pending.current), []);

  const go = (next: Tab) => {
    if (next === tab) return;
    setDir(tabIndex(next) > tabIndex(tab) ? 1 : -1);
    setTab(next);
  };

  /** Entra um lançamento: mesma rota do hero (topo da lista, saldo, orçamento). */
  const push = (st: State, t: Omit<Tx, "id">, countsInBudget = true): State => ({
    ...st,
    txs: [{ ...t, id: st.nextId }, ...st.txs].slice(0, 6),
    spent: countsInBudget ? applySpent(st.spent, t) : st.spent,
    balance: round2(st.balance + t.amt),
    hot: countsInBudget && t.cat !== "receber" ? t.cat : null,
    delta: t.amt,
    seq: st.seq + 1,
    nextId: st.nextId + 1,
    activity: activityOf(t),
  });

  const lancar = (t: { name: string; cat: Budgeted; amt: number; dividir: boolean }) => {
    // Primeiro a tela volta para o Início; o lançamento só entra quando ela já
    // está à vista, para a lista deslizar e o saldo contar diante da pessoa.
    go("inicio");
    clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      setS((st) => {
        let next = push(st, { name: t.name, cat: t.cat, who: "você", amt: -t.amt });
        if (t.dividir) {
          next = { ...next, shared: [{ id: next.nextId, desc: t.name, total: t.amt, payer: "você", settled: [] }, ...next.shared], nextId: next.nextId + 1 };
        }
        return next;
      });
    }, ENTER_MS);
  };

  const quitar = (expId: number, from: Person, to: Person, v: number, desc: string) => {
    setS((st) => {
      let next: State = {
        ...st,
        shared: st.shared.map((e) => (e.id === expId ? { ...e, settled: [...e.settled, from] } : e)),
      };
      // Acerto que envolve você mexe no saldo; entre os outros, só no grupo.
      if (to === "você") next = push(next, { name: `Pix de ${from}, ${desc.toLowerCase()}`, cat: "receber", who: from, amt: v });
      if (from === "você") next = push(next, { name: `Pix para ${to}, ${desc.toLowerCase()}`, cat: "casa", who: "você", amt: -v }, false);
      return next;
    });
  };

  const panel = (id: Tab, children: ReactNode) => {
    const on = tab === id;
    // A que sai vai para o lado oposto ao que a nova entra.
    const off = tabIndex(id) < tabIndex(tab) ? -1 : 1;
    return (
      <div
        id={`${uid}-${id}`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${id}`}
        aria-hidden={!on}
        data-on={on}
        className="lp-panel overflow-y-auto px-6 pt-8 sm:px-8"
        style={{ "--lp-panel-x": `${(on ? dir : off) * 18}px` } as CSSProperties}
        data-lenis-prevent
      >
        {children}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[420px]">
      {/* Celular: ocupa a tela abaixo da barra do topo, como o app aberto. */}
      <div className="flex h-[clamp(600px,calc(100svh-64px),720px)] flex-col overflow-hidden bg-lp-surface sm:h-[680px] sm:rounded">
        <div className="relative min-h-0 flex-1">
          {panel(
            "inicio",
            <BalanceView
              group="Apê 302"
              month="Setembro"
              balance={s.balance}
              delta={s.delta}
              rows={3}
              activity={s.activity}
              txs={s.txs}
              spent={s.spent}
              hot={s.hot}
              seq={s.seq}
            />,
          )}
          {panel("lancar", <LancarForm onSave={lancar} />)}
          {panel("dividir", <Dividir shared={s.shared} onQuitar={quitar} />)}
        </div>

        {/* Barra inferior, como no app. O traço corre até a aba ativa. */}
        <div role="tablist" aria-label="Telas da demo" className="relative grid grid-cols-3" style={{ borderTop: "1px solid var(--lp-line)" }}>
          <span
            aria-hidden="true"
            className="lp-tab-ink absolute left-0 top-[-1px] h-px w-1/3 bg-lp-fg"
            style={{ transform: `translateX(${tabIndex(tab) * 100}%)` }}
          />
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                id={`${uid}-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${uid}-${id}`}
                onClick={() => go(id)}
                className={`lp-tab flex h-16 flex-col items-center justify-center gap-1 text-[12px] ${on ? "text-lp-fg" : "text-lp-muted hover:text-lp-fg"}`}
              >
                <Icon className="h-5 w-5" strokeWidth={on ? 1.75 : 1.5} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Lançar ──────────────────────────────────────────────────────────── */
function LancarForm({ onSave }: { onSave: (t: { name: string; cat: Budgeted; amt: number; dividir: boolean }) => void }) {
  const [valor, setValor] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<Budgeted>("mercado");
  const [dividir, setDividir] = useState(false);
  const [erro, setErro] = useState("");
  const id = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = parseCurrency(valor);
    if (v <= 0) {
      setErro("Digite quanto foi o gasto.");
      return;
    }
    onSave({ name: desc.trim() || CATS[cat].label, cat, amt: v, dividir });
    setValor("");
    setDesc("");
    setDividir(false);
    setErro("");
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="text-[15px] font-medium">Novo gasto</div>

      <label htmlFor={`${id}-v`} className="mt-7 block text-[13px] text-lp-muted">Valor</label>
      <div className="lp-field mt-2 flex items-baseline gap-2">
        <span className="lp-num text-[22px] text-lp-muted">R$</span>
        <input
          id={`${id}-v`}
          inputMode="numeric"
          autoComplete="off"
          value={valor}
          onChange={(e) => { setValor(formatCurrencyInput(e.target.value)); setErro(""); }}
          placeholder="0,00"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-err` : undefined}
          className="lp-num lp-input lp-amount w-full min-w-0 bg-transparent pb-3 leading-none"
        />
      </div>
      {erro && <p id={`${id}-err`} className="lp-swap mt-2 text-[13px] text-lp-fg">{erro}</p>}

      <label htmlFor={`${id}-d`} className="mt-6 block text-[13px] text-lp-muted">Descrição</label>
      <input
        id={`${id}-d`}
        autoComplete="off"
        value={desc}
        onChange={(e) => setDesc(e.target.value.slice(0, 40))}
        placeholder="Ex.: feira da semana"
        className="lp-input lp-field mt-1 w-full bg-transparent pb-3 pt-2 text-[16px]"
      />

      <fieldset className="mt-6">
        <legend className="text-[13px] text-lp-muted">Categoria</legend>
        <div className="lp-chip-row mt-3 flex flex-wrap gap-2">
          {(["mercado", "casa", "lazer"] as Budgeted[]).map((c) => {
            const { Icon, label } = CATS[c];
            return (
              <label key={c} className={`lp-chip ${cat === c ? "is-on" : ""}`}>
                <input type="radio" name={`${id}-cat`} checked={cat === c} onChange={() => setCat(c)} className="sr-only" />
                <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className={`lp-chip mt-6 w-full justify-between ${dividir ? "is-on" : ""}`}>
        <span>Dividir com Ana e Bruno</span>
        <input type="checkbox" checked={dividir} onChange={(e) => setDividir(e.target.checked)} className="sr-only" />
        <span className="flex items-center gap-3">
          <span key={String(dividir)} className="lp-swap text-[12px] text-lp-muted">
            {dividir && parseCurrency(valor) > 0 ? (
              <><span className="lp-num">{brl(parseCurrency(valor) / 3)}</span> cada</>
            ) : dividir ? "3 partes" : "Só meu"}
          </span>
          {/* O estado do interruptor à vista, não só no texto */}
          <span aria-hidden="true" className={`lp-switch ${dividir ? "is-on" : ""}`} />
        </span>
      </label>

      <button type="submit" className="lp-btn mt-7 w-full">Lançar</button>
    </form>
  );
}

/* ── Dividir ─────────────────────────────────────────────────────────── */
function Dividir({ shared, onQuitar }: { shared: Shared[]; onQuitar: (expId: number, from: Person, to: Person, v: number, desc: string) => void }) {
  const debts = debtsOf(shared);
  const aReceber = round2(
    debts.filter((d) => !d.settled && d.to === "você").reduce((a, d) => a + d.v, 0) -
      debts.filter((d) => !d.settled && d.from === "você").reduce((a, d) => a + d.v, 0),
  );
  // O número conta até o novo saldo do grupo a cada quitação.
  const net = useCountUp<HTMLDivElement>(aReceber, (v) => `${v >= 0 ? "+" : "−"}${brl(v)}`);

  return (
    <div className="pb-6">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium">Apê 302</span>
        <span className="text-[13px] text-lp-muted">Você, Ana e Bruno</span>
      </div>

      {/* Rótulo fixo: o sinal do número diz se é a receber (+) ou a pagar (−),
          e ele continua certo durante a contagem, mesmo passando pelo zero. */}
      <div className="mt-6 text-[13px] text-lp-muted">Seu saldo no grupo</div>
      <div ref={net.ref} className="lp-num mt-1 text-[32px] leading-none">
        {net.initial}
      </div>
      <span className="sr-only" aria-live="polite">
        {aReceber >= 0 ? "Você tem a receber" : "Você deve no grupo"} {brl(aReceber)}
      </span>

      <div className="mt-8 text-[13px] text-lp-muted">Quem deve a quem</div>
      <ul className="mt-2">
        {debts.map((d) => (
          <li key={d.key} className="flex min-h-[60px] items-center justify-between gap-3 py-1.5">
            <div className="min-w-0">
              <div className={`lp-fade-color truncate text-[14px] ${d.settled ? "text-lp-muted" : "text-lp-fg"}`}>
                {d.to === "você" ? `${cap(d.from)} te deve` : `${cap(d.from)} deve a ${d.to}`}
              </div>
              <div className="truncate text-[12px] text-lp-muted">{d.desc}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`lp-num lp-fade-color text-[14px] ${d.settled ? "text-lp-muted" : "text-lp-fg"}`}>{brl(d.v)}</span>
              <span className="grid w-[84px] justify-items-end">
                {d.settled ? (
                  <span key="q" className="lp-swap flex items-center gap-1 text-[12px] text-lp-muted">
                    <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    Quitado
                  </span>
                ) : (
                  <button
                    key="b"
                    type="button"
                    onClick={() => onQuitar(d.expId, d.from, d.to, d.v, d.desc)}
                    aria-label={`Marcar como quitado: ${cap(d.from)} deve a ${d.to}, ${d.desc}`}
                    className="lp-chip w-[84px] justify-center px-2 text-[12px]"
                  >
                    Quitar
                  </button>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
