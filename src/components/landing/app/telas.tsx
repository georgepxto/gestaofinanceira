import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Home,
  Landmark,
  Plus,
  Receipt,
  Repeat,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BalanceHero } from "../../ui/BalanceHero";
import { ExtratoPrevisao } from "../../ui/ExtratoPrevisao";
import { Surface, SurfaceHeader } from "../../ui/Surface";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { ProgressBar } from "../../ui/ProgressBar";
import { Pill } from "../../ui/Pill";
import { PontoCategoria } from "../../ui/PontoCategoria";
import { Avatar } from "../../ui/Avatar";
import { AnimatedNumber } from "../../ui/AnimatedNumber";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Logo } from "../../ui/Logo";
import { ActionRow } from "../../ui/ActionRow";
import { formatCurrency } from "../../../utils/calculations";
import { formatDinheiro, formatPercent } from "../../../utils/dinheiro";
import { CATEGORIAS_GASTO_PADRAO, corDaCategoria } from "../../../utils/categories";
import { corDoCartao } from "../../../utils/cores";
import {
  CARTAO,
  CONTAS,
  FIXOS,
  LANCAMENTOS,
  MES,
  MES_CURTO,
  METAS,
  PESSOAS,
  SALDO_HOJE,
  USUARIA,
  previsaoMock,
  type Lancamento,
  type PessoaMock,
} from "./mock";

/* ═══════════════════════════════════════════════════════════════════════
   As telas do app na landing, montadas com os MESMOS componentes do app
   (saldo, extrato, listas, barras, pílulas, abas) e dados fictícios. Mudou
   o app, a landing muda junto. Sempre no tema escuro do app (.app-escuro).
   ═══════════════════════════════════════════════════════════════════════ */

const cor = (categoria: string) => corDaCategoria(categoria, CATEGORIAS_GASTO_PADRAO);

/** A página do app: fundo, tema escuro e o respiro das telas. */
export function TelaApp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`app-escuro bg-page text-fg ${className}`}>{children}</div>;
}

/** O seletor de mês do app, parado no mês do exemplo. */
export function MesFixo() {
  return (
    <span className="inline-flex items-center justify-between bg-surface-2 rounded-sm" aria-hidden="true">
      <span className="w-9 h-9 flex items-center justify-center text-fg-2">
        <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
      </span>
      <span className="w-[132px] text-center text-sm text-fg">{MES}</span>
      <span className="w-9 h-9 flex items-center justify-center text-fg-2">
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      </span>
    </span>
  );
}

/** Indicadores em duas colunas, como no celular. */
function Indicadores({ itens }: { itens: { rotulo: string; valor: number; meta?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
      {itens.map((k) => (
        <div key={k.rotulo} className="min-w-0 bg-surface-1 rounded p-4">
          <p className="text-xs text-fg-2">{k.rotulo}</p>
          <div className="mt-1.5 text-fg">
            <AnimatedNumber valor={k.valor} className="text-[20px]" />
          </div>
          {k.meta && <p className="mt-1 text-xs text-fg-3">{k.meta}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Moldura de celular: barra do topo, abas da seção e barra de baixo ── */

export type AbaApp = "inicio" | "carteira" | "gastos" | "receber";
const ABAS: { chave: AbaApp; rotulo: string; Icone: LucideIcon }[] = [
  { chave: "inicio", rotulo: "Início", Icone: Home },
  { chave: "carteira", rotulo: "Carteira", Icone: Wallet },
  { chave: "gastos", rotulo: "Gastos", Icone: Receipt },
  { chave: "receber", rotulo: "A receber", Icone: Users },
];

export function TopoApp() {
  return (
    <div className="h-14 shrink-0 flex items-center justify-between pl-4 pr-2">
      <Logo />
      <div className="flex items-center text-fg-2">
        <span className="w-11 h-11 flex items-center justify-center">
          <Bell className="w-5 h-5" strokeWidth={1.5} />
        </span>
        <span className="w-11 h-11 flex items-center justify-center">
          <Settings className="w-5 h-5" strokeWidth={1.5} />
        </span>
      </div>
    </div>
  );
}

export function BarraApp({ ativa, onAba, onLancar }: { ativa: AbaApp; onAba?: (a: AbaApp) => void; onLancar?: () => void }) {
  const indice = ABAS.findIndex((a) => a.chave === ativa);
  // Posição do traço: as abas dividem a barra com o "+" no meio (5 colunas).
  const coluna = indice < 2 ? indice : indice + 1;
  const celula = (a: (typeof ABAS)[number]) => {
    const on = a.chave === ativa;
    const Tag = onAba ? "button" : "span";
    return (
      <Tag
        key={a.chave}
        {...(onAba ? { type: "button" as const, onClick: () => onAba(a.chave), "aria-pressed": on } : {})}
        className={`flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors duration-300 ${on ? "text-fg" : "text-fg-3"}`}
      >
        <a.Icone className={`w-[22px] h-[22px] viagem ${on ? "-translate-y-px" : ""}`} strokeWidth={on ? 1.75 : 1.5} />
        <span className="text-[11px] leading-none">{a.rotulo}</span>
      </Tag>
    );
  };
  return (
    <div className="relative shrink-0 grid grid-cols-5 h-16 bg-surface-1">
      {/* Uma faixa da largura de uma coluna anda até a aba; o traço vai no meio dela. */}
      <span aria-hidden="true" className="absolute top-0 left-0 w-1/5 flex justify-center viagem" style={{ transform: `translateX(${coluna * 100}%)` }}>
        <span className="h-[2px] w-[28px] bg-accent" />
      </span>
      {ABAS.slice(0, 2).map(celula)}
      <span className="flex items-center justify-center">
        {onLancar ? (
          <button
            type="button"
            onClick={onLancar}
            aria-label="Novo lançamento"
            className="w-12 h-12 rounded bg-accent text-accent-fg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={1.75} />
          </button>
        ) : (
          <span className="w-12 h-12 rounded bg-accent text-accent-fg flex items-center justify-center">
            <Plus className="w-6 h-6" strokeWidth={1.75} />
          </span>
        )}
      </span>
      {ABAS.slice(2).map(celula)}
    </div>
  );
}

/** As abas de uma seção (Lançamentos / Metas...), como no celular. */
export function AbasDaSecao({ abas, ativa, onTrocar }: { abas: string[]; ativa: string; onTrocar?: (a: string) => void }) {
  return (
    <SegmentedControl
      rotulo="Seções"
      cheio
      segmentos={abas.map((a) => ({ chave: a, rotulo: a, ativo: a === ativa, onClick: onTrocar ? () => onTrocar(a) : undefined }))}
    />
  );
}

/* ── Início ──────────────────────────────────────────────────────────── */

export function TelaInicio({
  saldo = SALDO_HOJE,
  devolver,
  destaque,
  ultimos = LANCAMENTOS.slice(0, 3),
  novos = new Set<number>(),
  semExtrato = false,
  atalhos = false,
}: {
  saldo?: number;
  devolver?: Record<string, number>;
  /** Realça um bloco e apaga o resto: 0 saldo, 1 a receber, 2 previsto. */
  destaque?: 0 | 1 | 2;
  ultimos?: Lancamento[];
  novos?: Set<number>;
  semExtrato?: boolean;
  /** Os atalhos logo abaixo do saldo, como no Início. */
  atalhos?: boolean;
}) {
  const previsao = previsaoMock(saldo, devolver);
  const apaga = (i: number) => `transition-opacity duration-500 ${destaque !== undefined && destaque !== i ? "opacity-25" : ""}`;
  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between gap-4 ${apaga(-1)}`}>
        <p className="text-[15px] text-fg-2">Olá, {USUARIA}</p>
        <MesFixo />
      </div>
      <div className={apaga(0)}>
        <BalanceHero rotulo="Saldo hoje" valor={saldo} contexto="O que está nas suas 2 contas agora.">
          {atalhos && (
            <div className="mt-6" aria-hidden="true">
              <ActionRow
                acoes={[
                  { rotulo: "Lançar gasto", Icone: Plus, onClick: () => {} },
                  { rotulo: "Dividir", Icone: Users, onClick: () => {} },
                  { rotulo: "Nova receita", Icone: Wallet, onClick: () => {} },
                  { rotulo: "Pagar fatura", Icone: CreditCard, onClick: () => {} },
                ]}
              />
            </div>
          )}
        </BalanceHero>
      </div>
      {!semExtrato && (
        <div className={destaque === undefined ? "" : destaque === 0 ? "opacity-25 transition-opacity duration-500" : "transition-opacity duration-500"}>
          <ExtratoPrevisao previsao={previsao} />
        </div>
      )}
      {ultimos.length > 0 && (
        <Surface as="section" className={apaga(-1)}>
          <SurfaceHeader titulo="Últimos lançamentos" className="mb-1" />
          <ListGroup>
            {ultimos.map((g) => (
              <LinhaLancamento key={g.id} g={g} novo={novos.has(g.id)} />
            ))}
          </ListGroup>
        </Surface>
      )}
    </div>
  );
}

export function LinhaLancamento({ g, novo = false }: { g: Lancamento; novo?: boolean }) {
  if (g.entrada) {
    return (
      <ListRow
        novo={novo}
        icone={<ArrowDownLeft className="w-4 h-4" strokeWidth={1.5} />}
        titulo={g.descricao}
        meta={`Entrou na conta · ${g.categoria}`}
        valor={formatDinheiro(g.valor, { positivo: true })}
        recebido
      />
    );
  }
  const Icone = g.pessoas ? Users : g.fixo ? Repeat : g.tipo === "credito" ? CreditCard : Wallet;
  const meu = g.minhaParte ?? g.valor;
  return (
    <ListRow
      novo={novo}
      icone={<Icone className="w-4 h-4" strokeWidth={1.5} />}
      titulo={g.descricao}
      meta={`${g.tipo === "credito" ? "Crédito" : "Débito"} · ${g.categoria}${g.pessoas ? ` · ${g.pessoas}` : ""}`}
      valor={formatDinheiro(-meu)}
      subvalor={g.minhaParte ? `de ${formatCurrency(g.valor)}` : undefined}
    />
  );
}

/* ── Gastos: Lançamentos e Metas ─────────────────────────────────────── */

export function TelaLancamentos({ lancamentos = LANCAMENTOS, novos = new Set<number>() }: { lancamentos?: Lancamento[]; novos?: Set<number> }) {
  const meu = (g: Lancamento) => g.minhaParte ?? g.valor;
  const credito = lancamentos.filter((g) => g.tipo === "credito").reduce((s, g) => s + meu(g), 0);
  const debito = lancamentos.filter((g) => g.tipo === "debito").reduce((s, g) => s + meu(g), 0);
  const fixos = FIXOS.reduce((s, f) => s + (f.minhaParte ?? f.valor), 0);
  const dias = [...new Set(lancamentos.map((g) => g.dia))].sort((a, b) => b - a);
  const rotuloDia = (d: number) => (d === 28 ? "Hoje" : d === 27 ? "Ontem" : `${d} de ${MES_CURTO}`);
  return (
    <div className="space-y-6">
      <Indicadores
        itens={[
          { rotulo: "Crédito", valor: credito },
          { rotulo: "Débito", valor: debito },
          { rotulo: "Já pago", valor: debito, meta: "débito e crédito quitado" },
          { rotulo: "Fixos", valor: fixos },
        ]}
      />
      <Surface as="section">
        <SurfaceHeader
          titulo="Lançamentos do mês"
          className="mb-0"
          acao={<span className="tabular-nums text-xs text-fg-3">{lancamentos.length} itens</span>}
        />
        {dias.map((d) => (
          <ListGroup key={d} titulo={rotuloDia(d)}>
            {lancamentos
              .filter((g) => g.dia === d)
              .map((g) => (
                <LinhaLancamento key={g.id} g={g} novo={novos.has(g.id)} />
              ))}
          </ListGroup>
        ))}
      </Surface>
    </div>
  );
}

export function TelaMetas({ metas = METAS }: { metas?: typeof METAS }) {
  const total = metas.reduce((s, m) => s + m.gasto, 0);
  const limite = metas.reduce((s, m) => s + m.limite, 0);
  const ordenadas = [...metas].sort((a, b) => b.gasto / b.limite - a.gasto / a.limite);
  const estado = (m: (typeof METAS)[number]) => (m.gasto > m.limite ? "estourou" : m.gasto / m.limite >= 0.8 ? "quase" : "ok");
  return (
    <div className="space-y-6">
      <BalanceHero
        rotulo={<>Usado dos limites · {MES}</>}
        valor={total}
        complemento={`de ${formatCurrency(limite)}`}
        perigoSeNegativo={false}
        perigo={total > limite}
        contexto={
          <>
            Restam <span className="valor">{formatCurrency(Math.max(0, limite - total))}</span> · {formatPercent(total / limite)} usado
          </>
        }
      >
        <div className="mt-6">
          <ProgressBar
            valor={total}
            maximo={limite}
            rotulo="Total dos limites"
            legenda={[
              { rotulo: "Estouradas", valor: metas.filter((m) => estado(m) === "estourou").length },
              { rotulo: "Quase no limite", valor: metas.filter((m) => estado(m) === "quase").length },
              { rotulo: "No controle", valor: metas.filter((m) => estado(m) === "ok").length },
            ]}
          />
        </div>
      </BalanceHero>
      <Surface as="section">
        <SurfaceHeader titulo="Seus limites" descricao="Da mais perto de estourar para a mais tranquila." className="mb-1" />
        <ListGroup>
          {ordenadas.map((m) => {
            const e = estado(m);
            const pct = m.gasto / m.limite;
            return (
              <ListRow
                key={m.categoria}
                icone={<PontoCategoria cor={cor(m.categoria)} />}
                titulo={m.categoria}
                meta={
                  e === "estourou" ? (
                    <Pill tom="perigo">estourou {formatCurrency(m.gasto - m.limite)}</Pill>
                  ) : e === "quase" ? (
                    <Pill tom="atencao">quase no limite</Pill>
                  ) : (
                    <Pill>no controle</Pill>
                  )
                }
                valor={formatCurrency(m.gasto)}
                subvalor={`de ${formatCurrency(m.limite)}`}
                rodape={
                  <div className="pl-12">
                    <ProgressBar valor={m.gasto} maximo={m.limite} rotulo={`${m.categoria}: ${formatPercent(pct)} do limite`} />
                    <p className="mt-1.5 text-xs text-fg-2">
                      <span className="valor">{formatPercent(pct)}</span>
                      {e !== "estourou" && (
                        <>
                          {" "}· restam <span className="valor">{formatCurrency(m.limite - m.gasto)}</span>
                        </>
                      )}
                    </p>
                  </div>
                }
              />
            );
          })}
        </ListGroup>
      </Surface>
    </div>
  );
}

/* ── A receber: Pessoas ──────────────────────────────────────────────── */

export function TelaPessoas({
  pessoas = PESSOAS,
  onPagar,
}: {
  pessoas?: PessoaMock[];
  /** Na demo: registrar o pagamento de alguém. */
  onPagar?: (nome: string) => void;
}) {
  const total = (p: PessoaMock) => p.doMes + p.emCobrancas;
  const linhas = [...pessoas].sort((a, b) => total(b) - total(a));
  const geral = linhas.reduce((s, p) => s + total(p), 0);
  const devendo = linhas.filter((p) => total(p) > 0);
  return (
    <div className="space-y-6">
      <Indicadores
        itens={[
          { rotulo: "Te devem no total", valor: geral, meta: `${devendo.length} ${devendo.length === 1 ? "pessoa" : "pessoas"}` },
          ...(devendo[0] ? [{ rotulo: "Quem deve mais", valor: total(devendo[0]), meta: devendo[0].nome }] : []),
        ]}
      />
      <Surface as="section">
        <SurfaceHeader titulo="Quem te deve" descricao="Abra uma pessoa para ver o que ela pegou, as cobranças e os pagamentos." className="mb-1" />
        <ListGroup>
          {linhas.map((p) => {
            const partes = [
              p.doMes > 0 && `${formatCurrency(p.doMes)} de ${MES_CURTO}`,
              p.emCobrancas > 0 && `${formatCurrency(p.emCobrancas)} em ${p.cobrancas === 1 ? "cobrança" : "cobranças"}`,
            ].filter(Boolean);
            return (
              <ListRow
                key={p.nome}
                iconeCru={<Avatar nome={p.nome} />}
                titulo={p.nome}
                meta={partes.length > 0 ? partes.join(" · ") : "não deve nada"}
                valor={formatCurrency(total(p))}
                subvalor={total(p) > 0 ? "deve no total" : undefined}
                pago={total(p) === 0}
                onAbrir={onPagar && total(p) > 0 ? () => onPagar(p.nome) : undefined}
              />
            );
          })}
        </ListGroup>
      </Surface>
    </div>
  );
}

/* ── Carteira: Cartões e Contas ──────────────────────────────────────── */

export function TelaCartao() {
  const disponivel = CARTAO.limite - CARTAO.usado;
  return (
    <div className="space-y-6">
      <BalanceHero
        rotulo={
          <span className="inline-flex items-center gap-2">
            <PontoCategoria cor={corDoCartao(undefined)} />
            {CARTAO.nome} · fatura de {MES_CURTO}
          </span>
        }
        aoLado={<Pill tom="atencao">vence em 5 dias</Pill>}
        valor={CARTAO.fatura}
        perigoSeNegativo={false}
        contexto={`Vence dia ${CARTAO.vence} · melhor dia para comprar: ${CARTAO.melhorDia}`}
      />
      <div>
        <p className="text-sm text-fg-2 mb-3">Limite</p>
        <ProgressBar
          valor={CARTAO.usado}
          maximo={CARTAO.limite}
          rotulo="Limite usado"
          legenda={[
            { rotulo: "Usado", valor: formatCurrency(CARTAO.usado) },
            { rotulo: "Disponível", valor: formatDinheiro(disponivel) },
            { rotulo: "Limite", valor: formatCurrency(CARTAO.limite) },
          ]}
        />
      </div>
      <Surface as="section">
        <SurfaceHeader titulo="Transações da fatura" className="mb-0" acao={<span className="tabular-nums text-xs text-fg-3">{CARTAO.itens.length} itens</span>} />
        <ListGroup>
          {CARTAO.itens.map((t) => (
            <ListRow
              key={t.descricao}
              icone={t.fixo ? <Repeat className="w-4 h-4" strokeWidth={1.5} /> : <CreditCard className="w-4 h-4" strokeWidth={1.5} />}
              titulo={t.descricao}
              meta={
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span>{t.categoria}</span>
                  {t.fixo && <Pill>fixo</Pill>}
                </span>
              }
              valor={formatDinheiro(-t.valor)}
            />
          ))}
        </ListGroup>
      </Surface>
    </div>
  );
}

export function TelaContas({ saldo = SALDO_HOJE }: { saldo?: number }) {
  const recebido = 0;
  // Na demo o saldo muda: a diferença vai para a conta principal.
  const contas = CONTAS.map((c, i) => (i === 0 ? { ...c, saldo: c.saldo + (saldo - SALDO_HOJE) } : c));
  return (
    <div className="space-y-6">
      <Indicadores
        itens={[
          { rotulo: "Saldo total", valor: saldo, meta: `em ${contas.length} contas` },
          { rotulo: "Recebido no mês", valor: recebido, meta: "0 entradas" },
          { rotulo: "Ainda a receber", valor: 5200, meta: "1 prevista" },
        ]}
      />
      <Surface as="section">
        <SurfaceHeader titulo="Minhas contas" descricao="A barra é a parte de cada conta no saldo total." className="mb-1" />
        <ListGroup>
          {contas.map((c) => (
            <ListRow
              key={c.nome}
              icone={<Landmark className="w-4 h-4" strokeWidth={1.5} />}
              titulo={c.nome}
              meta={c.banco}
              valor={formatCurrency(c.saldo)}
              subvalor={formatPercent(c.saldo / saldo)}
              rodape={
                <div className="pl-12">
                  <ProgressBar neutra valor={c.saldo} maximo={saldo} rotulo={`${c.nome}: parte do saldo`} />
                </div>
              }
            />
          ))}
        </ListGroup>
      </Surface>
      <Surface as="section">
        <SurfaceHeader titulo={`Entradas de ${MES_CURTO}`} descricao="Recebidas e previstas, na ordem do dia." className="mb-1" />
        <ListGroup>
          <ListRow
            icone={<Wallet className="w-4 h-4" strokeWidth={1.5} />}
            titulo="Salário"
            meta={
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span>dia 30 · Nubank · fixa</span>
                <Pill>prevista</Pill>
              </span>
            }
            valor={formatDinheiro(5200, { positivo: true })}
          />
        </ListGroup>
      </Surface>
    </div>
  );
}

/* ── Relatório em PDF ────────────────────────────────────────────────── */

export function TelaRelatorio() {
  const linhas = [
    { categoria: "Moradia", valor: 1050 },
    { categoria: "Alimentação", valor: 812.4 },
    { categoria: "Transporte", valor: 239.3 },
    { categoria: "Lazer", valor: 150 },
    { categoria: "Saúde", valor: 41.6 },
    { categoria: "Assinaturas", valor: 39.9 },
  ];
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[15px] text-fg">
          <FileText className="w-4 h-4 text-fg-2" strokeWidth={1.5} />
          Relatório de {MES_CURTO}
        </p>
        <span className="inline-flex items-center gap-2 h-9 px-3 rounded bg-surface-2 text-sm font-medium text-fg">
          <Download className="w-4 h-4" strokeWidth={1.5} />
          PDF
        </span>
      </div>
      <Surface as="section">
        <SurfaceHeader titulo="Gastos por categoria" descricao={MES} className="mb-1" />
        <ListGroup>
          {linhas.map((l) => (
            <ListRow
              key={l.categoria}
              icone={<PontoCategoria cor={cor(l.categoria)} />}
              titulo={l.categoria}
              meta={formatPercent(l.valor / total)}
              valor={formatCurrency(l.valor)}
            />
          ))}
        </ListGroup>
        <div className="mt-3 pt-3 border-t border-line flex items-baseline justify-between gap-4">
          <span className="text-sm text-fg">Total do mês</span>
          <span className="valor text-fg">{formatCurrency(total)}</span>
        </div>
      </Surface>
    </div>
  );
}
