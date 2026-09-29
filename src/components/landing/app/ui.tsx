import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, Plus, Users } from "lucide-react";
import { brl, brl0, signed, toneOf } from "../format";

/* ═══════════════════════════════════════════════════════════════════════
   Peças visuais das telas do app mostradas na landing.

   Este arquivo é o ÚNICO lugar com a aparência das telas (cores, corpos,
   espaçamentos, raios). As telas em screens.tsx e a demo só montam estas
   peças com dados. Quando a identidade nova do app ficar pronta, é aqui que
   se troca — ou, melhor ainda, cada peça passa a reexportar o componente
   equivalente do app, e a landing acompanha o app sozinha.
   ═══════════════════════════════════════════════════════════════════════ */

/** A tela: superfície do app, sem moldura de aparelho. */
export function AppScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-lp-surface px-6 pb-7 pt-7 sm:rounded sm:px-7 ${className}`}>{children}</div>;
}

/** Cabeçalho da tela: título à esquerda, contexto (mês, grupo) à direita. */
export function AppHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[15px] font-medium">{title}</span>
      {meta && <span className="text-[13px] text-lp-muted">{meta}</span>}
    </div>
  );
}

/** Rótulo de bloco, em sentence case. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[13px] text-lp-muted ${className}`}>{children}</div>;
}

type AmountSize = "hero" | "lg" | "md" | "sm" | "xs";
const AMOUNT: Record<AmountSize, string> = {
  hero: "text-[36px] leading-none sm:text-[40px]",
  lg: "text-[30px] leading-none",
  md: "text-[17px]",
  sm: "text-[14px]",
  xs: "text-[12px]",
};

/** Dinheiro. `sign` mostra +/−; `tone` pinta negativo no secundário. */
export function Amount({
  v,
  size = "sm",
  sign = false,
  tone = false,
  className = "",
}: {
  v: number;
  size?: AmountSize;
  sign?: boolean;
  tone?: boolean;
  className?: string;
}) {
  return (
    <span className={`lp-num whitespace-nowrap ${AMOUNT[size]} ${tone ? toneOf(v) : ""} ${className}`}>
      {sign ? signed(v) : brl(v)}
    </span>
  );
}

/** Linha de lista: ícone, título, subtítulo e valor à direita. */
export function Row({
  Icon,
  title,
  sub,
  right,
  muted = false,
  h = 56,
}: {
  Icon?: LucideIcon;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  muted?: boolean;
  h?: number;
}) {
  return (
    <div className="flex items-center gap-3.5" style={{ minHeight: h }}>
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-lp-muted" strokeWidth={1.5} aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[14px] ${muted ? "text-lp-muted" : ""}`}>{title}</div>
        {sub && <div className="mt-0.5 truncate text-[12px] text-lp-muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/** Lançamento: a linha mais comum do app. */
export function TxRow({ Icon, title, sub, v, h }: { Icon?: LucideIcon; title: ReactNode; sub?: ReactNode; v: number; h?: number }) {
  return <Row Icon={Icon} title={title} sub={sub} h={h} right={<Amount v={v} sign tone />} />;
}

/** Barra fina de progresso; `alert` usa o acento. */
export function Bar({ pct, alert = false, dim = false, animated = false }: { pct: number; alert?: boolean; dim?: boolean; animated?: boolean }) {
  return (
    <div className="relative h-[3px] overflow-hidden bg-lp-track">
      <div
        className={`absolute inset-0 origin-left ${animated ? "lp-bar-fill" : ""} ${alert ? "bg-lp-acc" : "bg-lp-fg"}`}
        style={{ transform: `scaleX(${Math.min(1, Math.max(0, pct)).toFixed(3)})`, opacity: alert || !dim ? 1 : 0.7 }}
      />
    </div>
  );
}

/** A partir daqui um orçamento ou meta entra em alerta. */
export const ALERT_AT = 0.8;

/** Orçamento/meta: nome, "gasto de limite" e a barra. */
export function Budget({
  label,
  spent,
  limit,
  dim = false,
  animated = false,
  note,
}: {
  label: string;
  spent: number;
  limit: number;
  dim?: boolean;
  animated?: boolean;
  note?: ReactNode;
}) {
  const pct = spent / limit;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-[13px]">
        <span>{label}</span>
        <span className="text-[12px] text-lp-muted">
          <span className="lp-num">{brl0(spent)}</span> de <span className="lp-num">{brl0(limit)}</span>
        </span>
      </div>
      <Bar pct={pct} alert={pct >= ALERT_AT} dim={dim} animated={animated} />
      {note && <div className="mt-2 text-[12px] text-lp-muted">{note}</div>}
    </div>
  );
}

/** Divisória de 1px, só onde organiza. */
export function Divider({ className = "" }: { className?: string }) {
  return <div className={className} style={{ borderTop: "1px solid var(--lp-line)" }} />;
}

/** Recorte de uma tela para a landing: altura fixa e base dissolvida. */
export function ScreenCrop({ label, height, children }: { label: string; height?: number; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className={`overflow-hidden sm:rounded ${height ? "lp-crop" : ""}`} style={height ? { maxHeight: height } : undefined}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Barra inferior do app (visual). A demo interativa tem a sua, com estado. */
export function TabBar({ active }: { active: 0 | 1 | 2 }) {
  const tabs: [string, LucideIcon][] = [["Início", Home], ["Lançar", Plus], ["Dividir", Users]];
  return (
    <div className="relative grid grid-cols-3" style={{ borderTop: "1px solid var(--lp-line)" }}>
      <span className="absolute left-0 top-[-1px] h-px w-1/3 bg-lp-fg" style={{ transform: `translateX(${active * 100}%)` }} />
      {tabs.map(([label, Icon], i) => (
        <div key={label} className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] ${i === active ? "text-lp-fg" : "text-lp-muted"}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={i === active ? 1.75 : 1.5} />
          {label}
        </div>
      ))}
    </div>
  );
}
