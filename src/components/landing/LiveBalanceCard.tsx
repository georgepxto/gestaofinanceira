import { useCallback, useEffect, useRef, useState } from "react";
import { BalanceView } from "./BalanceView";
import { brl } from "./format";
import {
  BASE_BALANCE,
  BASE_SPENT,
  INITIAL_TXS,
  applySpent,
  round2,
  type Budgeted,
  type Tx,
} from "./ledger";
import { prefersReducedMotion } from "./motion-prefs";

/* ═══════════════════════════════════════════════════════════════════════
   Card de saldo do hero: a BalanceView alimentada por um loop de lançamentos
   fictícios. No app real o gatilho seria um INSERT via Supabase Realtime.
   ═══════════════════════════════════════════════════════════════════════ */

const POOL: Omit<Tx, "id">[] = [
  { name: "Feira da semana", cat: "mercado", who: "Ana", amt: -84.3 },
  { name: "Compra do mês", cat: "mercado", who: "Carla", amt: -212.4 },
  { name: "Pix de Bruno, jantar", cat: "receber", who: "Bruno", amt: 62.5 },
  { name: "Assinatura de streaming", cat: "lazer", who: "você", amt: -39.9 },
  { name: "Conta de gás", cat: "casa", who: "você", amt: -96.2 },
  { name: "Reembolso da farmácia", cat: "receber", who: "Carla", amt: 48 },
  { name: "Cinema", cat: "lazer", who: "Bruno", amt: -72 },
  { name: "Produtos de limpeza", cat: "casa", who: "Ana", amt: -58.7 },
];

const INTERVAL_MS = 4200;

/** "Ana lançou feira da semana" / "Bruno te pagou R$ 62,50". */
export const activityOf = (t: Pick<Tx, "who" | "name" | "amt">) =>
  t.amt > 0
    ? `${t.who} te pagou ${brl(t.amt)}`
    : `${t.who === "você" ? "Você" : t.who} lançou ${t.name.charAt(0).toLowerCase()}${t.name.slice(1)}`;

export function LiveBalanceCard() {
  const [txs, setTxs] = useState<Tx[]>(INITIAL_TXS);
  const [spent, setSpent] = useState(BASE_SPENT);
  const [balance, setBalance] = useState(BASE_BALANCE);
  const [hot, setHot] = useState<Budgeted | null>(null);
  const [delta, setDelta] = useState(145);
  const [seq, setSeq] = useState(0);
  const [activity, setActivity] = useState("Bruno te pagou R$ 145,00");

  const rootRef = useRef<HTMLDivElement>(null);
  const idx = useRef(0);

  const tick = useCallback(() => {
    const i = idx.current++;
    const restart = i > 0 && i % POOL.length === 0;
    const t = POOL[i % POOL.length];

    // Uma volta completa no pool fecha o "mês": saldo e orçamentos voltam à base.
    setBalance((b) => round2((restart ? BASE_BALANCE : b) + t.amt));
    setSpent((s) => applySpent(restart ? BASE_SPENT : s, t));
    setTxs((prev) => [{ ...t, id: i }, ...prev].slice(0, 5));
    setHot(t.cat === "receber" ? null : t.cat);
    setDelta(t.amt);
    setSeq((n) => n + 1);
    setActivity(activityOf(t));
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
        // O primeiro lançamento vem logo; os seguintes, no ritmo normal.
        first = window.setTimeout(tick, 1800);
        timer = window.setInterval(tick, INTERVAL_MS);
      }
      if (!run && timer) { clearTimeout(first); clearInterval(timer); timer = 0; }
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.2 });
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
    <div ref={rootRef} className="relative mx-auto w-full max-w-[420px]">
      <div
        role="img"
        aria-label="Tela do Hedge com o saldo de uma casa dividida se atualizando a cada lançamento. Dados fictícios."
        className="lp-screen bg-lp-surface px-6 pb-16 pt-10 sm:px-8"
      >
        <div aria-hidden="true">
          <BalanceView
            group="Apê 302"
            month="Setembro"
            balance={balance}
            delta={delta}
            txs={txs}
            spent={spent}
            hot={hot}
            seq={seq}
            activity={activity}
          />
        </div>
      </div>

    </div>
  );
}
