/* Galeria de desenvolvimento dos componentes base (componentes.html).
   Não é rota do app e não entra no build. Dados fictícios. */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowLeftRight,
  CalendarDays,
  CreditCard,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Users,
  Wallet,
  Inbox,
} from "lucide-react";
import "../index.css";
import { BalanceHero } from "../components/ui/BalanceHero";
import { ActionRow } from "../components/ui/ActionRow";
import { KpiStrip, Kpi } from "../components/ui/KpiStrip";
import { Surface, SurfaceHeader } from "../components/ui/Surface";
import { ListGroup, ListRow } from "../components/ui/ListRow";
import { Pill } from "../components/ui/Pill";
import { ProgressBar } from "../components/ui/ProgressBar";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Toaster, toast } from "../components/ui/Toaster";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { FilterChips, chipClasse } from "../components/ui/FilterChips";
import { FormSheet, Campo, Chip, Chips, EscolhaData, MaisOpcoes, campoClasse } from "../components/ui/FormSheet";
import { MoneyInput } from "../components/ui/MoneyInput";
import { Button } from "../components/ui/Button";
import { Valor } from "../components/ui/Valor";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { PontoCategoria } from "../components/ui/PontoCategoria";
import { PageHeader } from "../components/ui/PageHeader";
import { useChartTheme, eixoDinheiro } from "../components/ui/chart";
import { formatDinheiro, rotuloDia } from "../utils/dinheiro";
import { CATEGORIAS_GASTO_PADRAO, corDaCategoria } from "../utils/categories";

const MESES = [
  { mes: "Abr", valor: 1180 },
  { mes: "Mai", valor: 1520 },
  { mes: "Jun", valor: 1340 },
  { mes: "Jul", valor: 1760 },
  { mes: "Ago", valor: 1610 },
  { mes: "Set", valor: 2182.3 },
];

function Grafico() {
  const t = useChartTheme();
  const { ticks, domain } = eixoDinheiro(MESES.map((m) => m.valor));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={MESES} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid {...t.grid} />
        <XAxis dataKey="mes" {...t.eixoX} />
        <YAxis {...t.eixoY} ticks={ticks} domain={domain} />
        <Tooltip {...t.tooltip} />
        <Bar dataKey="valor" radius={[2, 2, 0, 0]} maxBarSize={40}>
          {MESES.map((m, i) => (
            <Cell key={m.mes} fill={i === MESES.length - 1 ? t.cores.fg : t.cores.fg3} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Galeria() {
  const [saldo, setSaldo] = useState(4507.6);
  const [filtro, setFiltro] = useState("todos");
  const [tipo, setTipo] = useState<"debito" | "credito">("debito");
  const [form, setForm] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [valor, setValor] = useState("");
  const [limite, setLimite] = useState("250,00");
  const [categoria, setCategoria] = useState("Alimentação");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [novos, setNovos] = useState<{ id: number; nome: string; valor: number }[]>([]);

  const ontem = new Date(Date.now() - 86400000);

  return (
    <div className="min-h-screen bg-page text-fg">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 space-y-8">
        <PageHeader
          title="Componentes"
          description="Os blocos do redesign, com dados fictícios."
          action={
            <>
              <Button variante="secundario" onClick={() => setConfirmar(true)}>
                Excluir algo
              </Button>
              <Button variante="principal" icone={<Plus className="w-4 h-4" />} onClick={() => setForm(true)}>
                Novo gasto
              </Button>
            </>
          }
          nota="Empréstimos do mês é fluxo; dívida em aberto é saldo."
        />

        <p className="text-[15px] text-fg-2">Olá, Samuel</p>
        <BalanceHero
          rotulo="Saldo livre"
          valor={saldo}
          contexto="o que sobra depois dos fixos do mês · setembro"
        >
          <div className="mt-6">
            <ActionRow
              acoes={[
                { rotulo: "Lançar gasto", Icone: Plus, onClick: () => setForm(true) },
                { rotulo: "Dividir", Icone: Users, onClick: () => setSaldo((s) => s - 212.4) },
                { rotulo: "Nova receita", Icone: Wallet, onClick: () => setSaldo((s) => s + 850) },
                { rotulo: "Pagar fatura", Icone: CreditCard, onClick: () => setSaldo(-692.4) },
              ]}
            />
          </div>
        </BalanceHero>

        <KpiStrip>
          <Kpi rotulo="Saldo total" valor={<AnimatedNumber valor={saldo} className="text-[20px]" />} />
          <Kpi rotulo="A receber" valor={<Valor porte="medio">R$ 270,00</Valor>} meta="0 de 2 acertaram" />
          <Kpi rotulo="Meus gastos" valor={<Valor porte="medio">R$ 2.182,30</Valor>} />
          <Kpi rotulo="Sobra mensal" valor={<Valor porte="medio">+R$ 3.800,00</Valor>} />
        </KpiStrip>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Surface>
            <SurfaceHeader
              titulo="Últimos lançamentos"
              acao={
                <button
                  className="hover:text-fg transition-colors"
                  onClick={() => setNovos((n) => [{ id: Date.now(), nome: "Padaria", valor: -18.5 }, ...n])}
                >
                  Simular novo
                </button>
              }
            />
            <ListGroup titulo={rotuloDia(new Date())} aoLado={formatDinheiro(-230.9)}>
              {novos.map((n) => (
                <ListRow
                  key={n.id}
                  novo
                  icone={<ShoppingCart className="w-4 h-4" strokeWidth={1.5} />}
                  titulo={n.nome}
                  meta="Débito · Alimentação"
                  valor={formatDinheiro(n.valor)}
                />
              ))}
              <ListRow
                icone={<ShoppingCart className="w-4 h-4" strokeWidth={1.5} />}
                titulo="Mercado da semana com um nome longo o bastante para quebrar em duas linhas"
                meta="Débito · Ana, Bruno"
                valor={formatDinheiro(-212.4)}
                acoes={[
                  { rotulo: "Editar", icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />, onClick: () => setForm(true) },
                  { rotulo: "Excluir", icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />, onClick: () => setConfirmar(true), tom: "perigo" },
                ]}
              />
              <ListRow
                icone={<CalendarDays className="w-4 h-4" strokeWidth={1.5} />}
                titulo="Aluguel"
                meta="Fixo · vence dia 10"
                valor={formatDinheiro(-1400)}
                pago
              />
            </ListGroup>
            <ListGroup titulo={rotuloDia(ontem)}>
              <ListRow
                icone={<ArrowLeftRight className="w-4 h-4" strokeWidth={1.5} />}
                titulo="Salário"
                meta={<>Conta corrente · <Pill>prevista</Pill></>}
                valor={formatDinheiro(5200, { positivo: true })}
              />
            </ListGroup>
          </Surface>

          <Surface>
            <SurfaceHeader titulo="Metas do mês" acao="setembro" />
            <div className="space-y-5">
              {[
                { nome: "Transporte", usado: 120, limite: 300 },
                { nome: "Alimentação", usado: 212.4, limite: 250 },
                { nome: "Lazer", usado: 380, limite: 300 },
              ].map((m) => (
                <div key={m.nome}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="flex items-center gap-2 text-sm text-fg">
                      <PontoCategoria cor={corDaCategoria(m.nome, CATEGORIAS_GASTO_PADRAO)} />
                      {m.nome}
                    </span>
                    <span className="flex items-center gap-2">
                      {m.usado > m.limite ? (
                        <Pill tom="perigo">estourou</Pill>
                      ) : m.usado / m.limite >= 0.8 ? (
                        <Pill tom="atencao">quase no limite</Pill>
                      ) : (
                        <Pill>no controle</Pill>
                      )}
                    </span>
                  </div>
                  <ProgressBar valor={m.usado} maximo={m.limite} rotulo={`${m.nome}: uso da meta`} />
                  <p className="mt-1.5 valor text-xs text-fg-2">
                    {formatDinheiro(m.usado)} de {formatDinheiro(m.limite)}
                  </p>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-fg-2 mb-2">Limite do cartão</p>
                <ProgressBar
                  valor={2849}
                  maximo={2500}
                  rotulo="Uso do limite"
                  legenda={[
                    { rotulo: "Usado", valor: formatDinheiro(2849) },
                    { rotulo: "Disponível", valor: formatDinheiro(-349), tom: "perigo" },
                    { rotulo: "Limite", valor: formatDinheiro(2500) },
                  ]}
                />
              </div>
            </div>
          </Surface>
        </div>

        <Surface>
          <SurfaceHeader titulo="Gastos dos últimos 6 meses" acao={<span className="text-fg-3">setembro em destaque</span>} />
          <Grafico />
        </Surface>

        <div className="grid gap-4 md:grid-cols-2">
          <Surface className="space-y-5">
            <SurfaceHeader titulo="Controles" />
            <SegmentedControl
              rotulo="Tipo"
              segmentos={[
                { chave: "d", rotulo: "Débito", ativo: tipo === "debito", onClick: () => setTipo("debito") },
                { chave: "c", rotulo: "Crédito", ativo: tipo === "credito", onClick: () => setTipo("credito") },
              ]}
            />
            <FilterChips
              rotulo="Filtrar por tipo"
              ativo={filtro}
              onChange={setFiltro}
              filtros={[
                { valor: "todos", rotulo: "Todos" },
                { valor: "pessoal", rotulo: "Pessoal" },
                { valor: "dividido", rotulo: "Dividido" },
                { valor: "divida", rotulo: "Dívida" },
                { valor: "fixo", rotulo: "Fixo" },
              ]}
              extra={
                <button className={chipClasse(false)}>
                  <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Dia
                </button>
              }
            />
            <div className="flex flex-wrap gap-2">
              <Pill>pago</Pill>
              <Pill tom="atencao">parcial</Pill>
              <Pill tom="perigo">vencido</Pill>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variante="secundario" onClick={() => toast.success("Gasto salvo.")}>
                Toast de sucesso
              </Button>
              <Button variante="fantasma" onClick={() => toast.error("Não deu para salvar. Tente de novo.")}>
                Toast de erro
              </Button>
            </div>
          </Surface>

          <Surface>
            <SurfaceHeader titulo="Vazio e carregando" />
            <EmptyState
              Icone={Inbox}
              frase="Nenhum lançamento neste mês."
              acao={<Button variante="secundario" onClick={() => setForm(true)}>Lançar gasto</Button>}
              compacto
            />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </Surface>
        </div>
      </div>

      <FormSheet
        aberto={form}
        titulo="Novo gasto"
        onFechar={() => setForm(false)}
        onEnviar={() => {
          setForm(false);
          toast.success("Gasto salvo.");
        }}
        rotuloEnviar="Adicionar"
        podeEnviar={!!valor}
        aviso="Este mês já tem uma cobrança em aberto para Ana."
        valor={<MoneyInput tamanho="heroi" value={valor} onChange={setValor} aria-label="Valor" data-autofocus />}
      >
        <Campo rotulo="Descrição" htmlFor="g-desc">
          <input id="g-desc" className={campoClasse} placeholder="Ex: mercado" />
        </Campo>
        <Campo rotulo="Categoria">
          <Chips>
            {CATEGORIAS_GASTO_PADRAO.map((c) => (
              <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
                {c}
              </Chip>
            ))}
          </Chips>
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <SegmentedControl
            rotulo="Forma de pagamento"
            cheio
            segmentos={[
              { chave: "d", rotulo: "Débito", ativo: tipo === "debito", onClick: () => setTipo("debito") },
              { chave: "c", rotulo: "Crédito", ativo: tipo === "credito", onClick: () => setTipo("credito") },
            ]}
          />
        </Campo>
        <EscolhaData valor={data} onChange={setData} />
        <MaisOpcoes>
          <Campo rotulo="Limite da meta" htmlFor="g-lim" dica="Digite só os números: 25000 vira 250,00.">
            <MoneyInput id="g-lim" value={limite} onChange={setLimite} />
          </Campo>
        </MaisOpcoes>
      </FormSheet>

      <ConfirmDialog
        aberto={confirmar}
        titulo="Excluir lançamento?"
        mensagem="Mercado da semana, R$ 212,40. Isso não pode ser desfeito."
        onConfirmar={() => {
          setConfirmar(false);
          toast.success("Excluído.");
        }}
        onCancelar={() => setConfirmar(false)}
      />
      <Toaster />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Galeria />
    </BrowserRouter>
  </StrictMode>,
);
