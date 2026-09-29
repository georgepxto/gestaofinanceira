import { Check, Download, FileText, Fuel, Home, Landmark, Pill, ShoppingBasket, UtensilsCrossed, Bus, Popcorn, Laptop, Plane, Footprints } from "lucide-react";
import { brl, brl0, signed } from "../format";
import { AppHeader, AppScreen, Amount, Bar, Budget, Divider, Label, Row, TabBar, TxRow } from "./ui";

/* ═══════════════════════════════════════════════════════════════════════
   Telas do app, completas, com dados fictícios coerentes entre si.
   Só montam as peças de ui.tsx: nenhuma cor ou corpo de texto mora aqui.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Início (dashboard) ──────────────────────────────────────────────── */
/* saldo livre = saldo total − contas do mês + a receber
   3.180,20   = 8.412,60   − 5.844,80        + 612,40 */
export const INICIO = {
  saldoTotal: 8412.6,
  aPagar: 5844.8,
  aReceber: 612.4,
  get saldoLivre() { return this.saldoTotal - this.aPagar + this.aReceber; },
  meses: [
    { mes: "Abr", v: 3912.4 },
    { mes: "Mai", v: 4380.15 },
    { mes: "Jun", v: 3655.9 },
    { mes: "Jul", v: 4102.7 },
    { mes: "Ago", v: 4790.35 },
    { mes: "Set", v: 4216.85 },
  ],
  ultimos: [
    { nome: "Supermercado", quando: "Hoje", Icon: ShoppingBasket, v: -212.4 },
    { nome: "Posto", quando: "Ontem", Icon: Fuel, v: -150 },
    { nome: "Restaurante", quando: "24 set", Icon: UtensilsCrossed, v: -86.5 },
    { nome: "Farmácia", quando: "23 set", Icon: Pill, v: -41.6 },
  ],
};

export function InicioScreen() {
  const d = INICIO;
  const max = Math.max(...d.meses.map((m) => m.v));
  const atual = d.meses[d.meses.length - 1];
  return (
    <AppScreen>
      <AppHeader title="Início" meta="Setembro" />

      <Label className="mt-7">Saldo total</Label>
      <Amount v={d.saldoTotal} size="lg" className="mt-1.5 block" />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <Label>A receber</Label>
          <Amount v={d.aReceber} size="md" className="mt-1 block" />
        </div>
        <div>
          <Label>Saldo livre</Label>
          <Amount v={d.saldoLivre} size="md" className="mt-1 block" />
        </div>
      </div>

      <Label className="mt-8">Gastos, últimos 6 meses</Label>
      <div className="mt-4 grid h-[120px] grid-cols-6 items-end gap-2.5">
        {d.meses.map((m, i) => (
          <div key={m.mes} className="flex h-full flex-col justify-end">
            <div
              className={i === d.meses.length - 1 ? "bg-lp-fg" : "bg-lp-muted opacity-40"}
              style={{ height: `${(m.v / max) * 100}%`, borderRadius: "2px 2px 0 0" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2.5 text-center text-[11px] text-lp-muted">
        {d.meses.map((m) => <span key={m.mes}>{m.mes}</span>)}
      </div>
      <div className="mt-3 flex items-baseline justify-between text-[12px] text-lp-muted">
        <span>Setembro até agora</span>
        <Amount v={-atual.v} sign size="xs" />
      </div>

      <Label className="mt-8">Últimos gastos</Label>
      <div className="mt-2">
        {d.ultimos.map(({ nome, quando, Icon, v }) => (
          <Row
            key={nome}
            Icon={Icon}
            title={nome}
            h={48}
            right={
              <>
                <span className="text-[12px] text-lp-muted">{quando}</span>
                <Amount v={v} sign tone className="w-[92px] text-right" />
              </>
            }
          />
        ))}
      </div>
    </AppScreen>
  );
}

/* ── Gastos pessoais ─────────────────────────────────────────────────── */
const DIAS = [
  { dia: "Hoje", itens: [
    { n: "Almoço", c: "Alimentação", Icon: UtensilsCrossed, v: -32.9 },
    { n: "Metrô", c: "Transporte", Icon: Bus, v: -5.3 },
  ] },
  { dia: "Ontem", itens: [{ n: "Feira", c: "Mercado", Icon: ShoppingBasket, v: -64.2 }] },
  { dia: "24 set", itens: [
    { n: "Show", c: "Lazer", Icon: Popcorn, v: -120 },
    { n: "Farmácia", c: "Saúde", Icon: Pill, v: -41.6 },
  ] },
];

export function GastosScreen() {
  const cats = [
    { c: "Alimentação", v: 486.2 },
    { c: "Mercado", v: 402.5 },
    { c: "Lazer", v: 225.0 },
    { c: "Outros", v: 170.6 },
  ];
  const total = cats.reduce((a, c) => a + c.v, 0);
  return (
    <AppScreen>
      <AppHeader title="Gastos" meta="Setembro" />
      <Label className="mt-7">Seus gastos no mês</Label>
      <Amount v={total} size="lg" className="mt-1.5 block" />

      <div className="mt-5 flex h-[3px] gap-[2px] overflow-hidden">
        {cats.map((c, i) => (
          <div key={c.c} className="bg-lp-fg" style={{ flex: c.v, opacity: 1 - i * 0.22 }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        {cats.map((c) => (
          <div key={c.c} className="flex justify-between gap-2">
            <span className="text-lp-muted">{c.c}</span>
            <span className="lp-num">{brl0(c.v)}</span>
          </div>
        ))}
      </div>

      {DIAS.map((d) => (
        <div key={d.dia} className="mt-6">
          <Label>{d.dia}</Label>
          <div className="mt-1">
            {d.itens.map((it) => (
              <TxRow key={it.n} Icon={it.Icon} title={it.n} sub={it.c} v={it.v} h={52} />
            ))}
          </div>
        </div>
      ))}
    </AppScreen>
  );
}

/* ── Grupo (gastos compartilhados) ───────────────────────────────────── */
export const GRUPO = {
  gastos: [
    { n: "Aluguel", pagou: "você", v: 3150 },
    { n: "Compra do mês", pagou: "Ana", v: 412.8 },
  ],
  // Divisão em três partes iguais entre Você, Ana e Bruno.
  acertos: [
    { de: "Ana", para: "você", v: 1050, quitado: false },
    { de: "Bruno", para: "você", v: 1050, quitado: true },
    { de: "Você", para: "Ana", v: 137.6, quitado: false },
    { de: "Bruno", para: "Ana", v: 137.6, quitado: true },
  ],
  get aReceber() { return 1050 - 137.6; },
};

export function GrupoScreen({ wide = false }: { wide?: boolean }) {
  const g = GRUPO;
  return (
    <AppScreen className={wide ? "sm:px-8 sm:py-8" : ""}>
      <AppHeader title="Apê 302" meta="Você, Ana e Bruno" />

      <div className={`mt-7 grid gap-8 ${wide ? "md:grid-cols-2 md:gap-12" : ""}`}>
        <div>
          <Label>Quem pagou</Label>
          <div className="mt-2">
            {g.gastos.map((x) => (
              <Row key={x.n} title={x.n} sub={`pago por ${x.pagou}`} h={52} right={<Amount v={x.v} />} />
            ))}
          </div>
          <Divider className="mt-4" />
          <div className="flex items-baseline justify-between pt-4">
            <span className="text-[13px] text-lp-muted">Você tem a receber</span>
            <span className="lp-num text-[15px]">+{brl(g.aReceber)}</span>
          </div>
        </div>

        <div>
          <Label>Quem deve a quem</Label>
          <div className="mt-2">
            {g.acertos.map((a) => (
              <Row
                key={`${a.de}-${a.para}`}
                h={52}
                muted={a.quitado}
                title={a.para === "você" ? `${a.de} te deve` : `${a.de} deve a ${a.para}`}
                sub={
                  a.quitado ? (
                    <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" strokeWidth={1.75} />Quitado</span>
                  ) : "Em aberto"
                }
                right={<Amount v={a.v} className={a.quitado ? "text-lp-muted" : ""} />}
              />
            ))}
          </div>
        </div>
      </div>
    </AppScreen>
  );
}

/* ── Cartões ─────────────────────────────────────────────────────────── */
export function CartoesScreen() {
  const limite = 5000;
  const parcelas = [
    { n: "Notebook", p: "4 de 10", Icon: Laptop, v: -389.9 },
    { n: "Passagem", p: "1 de 6", Icon: Plane, v: -312 },
    { n: "Tênis", p: "2 de 3", Icon: Footprints, v: -149.9 },
  ];
  const outros = 990.37;
  const fatura = parcelas.reduce((a, p) => a - p.v, 0) + outros;
  return (
    <AppScreen>
      <AppHeader title="Cartão final 4021" meta="Fatura aberta" />
      <Amount v={fatura} size="lg" className="mt-6 block" />
      <div className="mt-5"><Bar pct={fatura / limite} /></div>
      <div className="mt-2 flex justify-between text-[12px] text-lp-muted">
        <span>Limite usado</span>
        <span><span className="lp-num">{brl0(fatura)}</span> de <span className="lp-num">{brl0(limite)}</span></span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
        <div><Label>Fecha em</Label><div className="lp-num mt-1">03/10</div></div>
        <div><Label>Vence em</Label><div className="lp-num mt-1">10/10</div></div>
      </div>

      <Label className="mt-8">Parcelas nesta fatura</Label>
      <div className="mt-1">
        {parcelas.map((p) => (
          <TxRow key={p.n} Icon={p.Icon} title={p.n} sub={<>Parcela <span className="lp-num">{p.p}</span></>} v={p.v} h={52} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-lp-muted">
        <span>Outras compras</span>
        <span className="lp-num">{signed(-outros)}</span>
      </div>
    </AppScreen>
  );
}

/* ── Metas ───────────────────────────────────────────────────────────── */
export function MetasScreen() {
  const metas = [
    { n: "Alimentação", gasto: 812.4, meta: 900 },
    { n: "Transporte", gasto: 238.6, meta: 400 },
    { n: "Lazer", gasto: 150, meta: 350 },
    { n: "Mercado", gasto: 402.5, meta: 700 },
  ];
  return (
    <AppScreen>
      <AppHeader title="Metas" meta="Setembro" />
      <Label className="mt-7">12 dias para o fim do mês</Label>
      <div className="mt-5 flex flex-col gap-6">
        {metas.map((m) => {
          const alert = m.gasto / m.meta >= 0.8;
          return (
            <Budget
              key={m.n}
              label={m.n}
              spent={m.gasto}
              limit={m.meta}
              note={alert ? <>Restam <span className="lp-num text-lp-fg">{brl(m.meta - m.gasto)}</span> para 12 dias</> : undefined}
            />
          );
        })}
      </div>
    </AppScreen>
  );
}

/* ── Contas bancárias ────────────────────────────────────────────────── */
export function ContasScreen() {
  const contas = [
    { n: "Conta corrente", v: 4230.55 },
    { n: "Poupança", v: 3600 },
    { n: "Carteira digital", v: 582.05 },
  ];
  const total = contas.reduce((s, c) => s + c.v, 0);
  return (
    <AppScreen>
      <AppHeader title="Contas" meta="3 contas" />
      <Label className="mt-7">Saldo em contas</Label>
      <Amount v={total} size="lg" className="mt-1.5 block" />
      <div className="mt-5">
        {contas.map((c) => (
          <Row key={c.n} Icon={Landmark} title={c.n} h={52} right={<Amount v={c.v} />} />
        ))}
      </div>
      <Label className="mt-7">Movimentações recentes</Label>
      <div className="mt-1">
        <TxRow Icon={Home} title="Aluguel" sub="Conta corrente" v={-3150} h={52} />
        <TxRow Icon={Landmark} title="Salário" sub="Conta corrente" v={6200} h={52} />
      </div>
    </AppScreen>
  );
}

/* ── Relatório em PDF ────────────────────────────────────────────────── */
export function RelatorioScreen() {
  const linhas = [
    { c: "Casa", Icon: Home, v: 1920.4 },
    { c: "Mercado", Icon: ShoppingBasket, v: 1164.7 },
    { c: "Alimentação", Icon: UtensilsCrossed, v: 812.4 },
    { c: "Transporte", Icon: Bus, v: 238.6 },
  ];
  const total = linhas.reduce((a, l) => a + l.v, 0);
  return (
    <AppScreen>
      <div className="flex items-center gap-3">
        <FileText className="h-[18px] w-[18px] text-lp-muted" strokeWidth={1.5} />
        <span className="flex-1 text-[15px] font-medium">Relatório de setembro</span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-lp-muted">
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          PDF
        </span>
      </div>
      <div className="mt-6 rounded-sm bg-lp-bg p-5">
        <div className="flex justify-between text-[12px] text-lp-muted">
          <span>Categoria</span><span>Total</span>
        </div>
        {linhas.map(({ c, Icon, v }) => (
          <div key={c} className="mt-3 flex items-center gap-3 text-[13px]">
            <Icon className="h-4 w-4 text-lp-muted" strokeWidth={1.5} />
            <span className="flex-1">{c}</span>
            <span className="lp-num">{brl(v)}</span>
          </div>
        ))}
        <Divider className="mt-4" />
        <div className="flex justify-between pt-3 text-[13px]">
          <span>Total do mês</span>
          <span className="lp-num">{brl(total)}</span>
        </div>
      </div>
    </AppScreen>
  );
}

/* ── Dividir (a aba da demo, estática) ──────────────────────────────── */
export function DividirScreen() {
  const g = GRUPO;
  return (
    <div className="flex h-full flex-col bg-lp-surface">
      <div className="flex-1 px-6 pt-5">
        <AppHeader title="Apê 302" meta="Você, Ana e Bruno" />
        <Label className="mt-6">Seu saldo no grupo</Label>
        <div className="lp-num mt-1 text-[32px] leading-none">+{brl(g.aReceber)}</div>
        <Label className="mt-7">Quem deve a quem</Label>
        <div className="mt-1">
          {g.acertos.map((a) => (
            <Row
              key={`${a.de}-${a.para}`}
              h={54}
              muted={a.quitado}
              title={a.para === "você" ? `${a.de} te deve` : `${a.de} deve a ${a.para}`}
              sub={a.quitado ? "Quitado" : "Em aberto"}
              right={
                <span className="flex items-center gap-2.5">
                  <Amount v={a.v} className={a.quitado ? "text-lp-muted" : ""} />
                  {a.quitado ? (
                    <Check className="h-4 w-4 text-lp-muted" strokeWidth={1.75} />
                  ) : (
                    <span className="rounded-[3px] px-2 py-1 text-[11px]" style={{ border: "1px solid var(--lp-line)" }}>Quitar</span>
                  )}
                </span>
              }
            />
          ))}
        </div>
      </div>
      <TabBar active={2} />
    </div>
  );
}
