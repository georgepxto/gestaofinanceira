import { useLayoutEffect, useRef } from "react";
import { AppHeader, Amount, Budget, Label, Row } from "./app/ui";
import { brl } from "./format";
import { BUDGETED, CATS, LIMITS, type Budgeted, type Spent, type Tx } from "./ledger";
import { prefersReducedMotion } from "./motion-prefs";
import { useCountUp } from "./useCountUp";

/* ═══════════════════════════════════════════════════════════════════════
   A tela de saldo do mês e a sua animação, sem saber de onde vêm os dados.
   Comportamento de animação-extra/hedge-saldo-animado.html: quando `seq`
   muda, um lançamento novo entrou no topo, a lista desliza uma linha e a
   linha nova acende e apaga; quando `balance` muda, o saldo conta até o
   novo valor; a barra da categoria anda. A linha de atividade, abaixo do
   cabeçalho, diz quem acabou de lançar.
   O hero alimenta isto com um loop; a demo, com o que a pessoa lança.
   ═══════════════════════════════════════════════════════════════════════ */

const SHIFT_MS = 1100;
export const ROW_H = 60;
const EASE = "cubic-bezier(.22,.8,.2,1)";

type Props = {
  group: string;
  month: string;
  balance: number;
  delta: number | null;
  txs: Tx[];
  spent: Spent;
  hot: Budgeted | null;
  seq: number;
  rows?: number;
  /** Frase curta do último acontecimento, ex.: "Ana lançou Feira da semana". */
  activity?: string;
};

export function BalanceView({ group, month, balance, delta, txs, spent, hot, seq, rows = 4, activity }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  // Contagem animada do saldo: parte do que está na tela e pousa macio.
  const count = useCountUp<HTMLSpanElement>(balance, brl, 1500);

  // A lista desliza uma linha para baixo; a linha nova aparece e acende.
  const lastSeq = useRef(seq);
  useLayoutEffect(() => {
    if (seq === lastSeq.current) return;
    lastSeq.current = seq;
    const list = listRef.current;
    if (!list || prefersReducedMotion()) return;
    list.animate([{ transform: `translateY(-${ROW_H}px)` }, { transform: "none" }], { duration: SHIFT_MS, easing: EASE });
    const first = list.firstElementChild;
    first?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.15 }, { opacity: 1 }], { duration: 1300, easing: "ease" });
    first?.animate(
      [{ backgroundColor: "var(--lp-track)" }, { backgroundColor: "var(--lp-track)", offset: 0.5 }, { backgroundColor: "transparent" }],
      { duration: 2600, easing: "ease-out" },
    );
  }, [seq]);

  return (
    <div>
      <AppHeader title={group} meta={month} />

      {/* Linha de atividade: a frase nova sobe e empurra a anterior. */}
      <div className="mt-2 h-5 overflow-hidden text-[12px] text-lp-muted" aria-hidden={!activity}>
        {activity && (
          <div key={seq} className="lp-activity truncate">
            {activity}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-[13px] text-lp-muted">
          <span className="lp-live h-1.5 w-1.5 rounded-full bg-lp-acc" />
          Saldo do mês
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span ref={count.ref} className="lp-num text-[36px] leading-none sm:text-[40px]">
            {count.initial}
          </span>
          {delta !== null && <Amount v={delta} sign tone size="xs" />}
        </div>
      </div>

      <Label className="mt-9">Lançamentos recentes</Label>
      <div className="-mx-3 mt-1 overflow-hidden" style={{ height: ROW_H * rows }}>
        <div ref={listRef}>
          {txs.slice(0, rows + 1).map((t) => {
            const { Icon, label } = CATS[t.cat];
            return (
              <div key={t.id} className="rounded-sm px-3" style={{ height: ROW_H }}>
                <Row
                  Icon={Icon}
                  h={ROW_H}
                  title={t.name}
                  sub={`${label}, ${t.amt > 0 ? "de" : "pago por"} ${t.who}`}
                  right={<Amount v={t.amt} sign tone />}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Label className="mt-7">Orçamento por categoria</Label>
      <div className="mt-4 flex flex-col gap-4">
        {BUDGETED.map((k) => (
          <Budget
            key={k}
            label={CATS[k].label}
            spent={spent[k]}
            limit={LIMITS[k]}
            dim={k !== hot}
            animated
            // o alerta não depende só da cor da barra
            note={spent[k] / LIMITS[k] >= 0.8 ? <>Restam <span className="lp-num text-lp-fg">{brl(Math.max(0, LIMITS[k] - spent[k]))}</span></> : undefined}
          />
        ))}
      </div>
    </div>
  );
}
