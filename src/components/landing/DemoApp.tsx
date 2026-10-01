import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { formatCurrency, formatCurrencyValue, parseCurrency } from "../../utils/calculations";
import { Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Button } from "../ui/Button";
import {
  AbasDaSecao,
  BarraApp,
  TelaCartao,
  TelaContas,
  TelaInicio,
  TelaLancamentos,
  TelaMetas,
  TelaPessoas,
  TopoApp,
  type AbaApp,
} from "./app/telas";
import { LANCAMENTOS, METAS, PESSOAS, SALDO_HOJE, type Lancamento, type PessoaMock } from "./app/mock";

/* ═══════════════════════════════════════════════════════════════════════
   Demo do app na landing: o app de verdade no celular — barra do topo, as
   quatro abas e o "+", as abas de cada seção, o formulário de gasto e o
   pagamento — montado com os componentes do app e dados fictícios. Tudo
   acontece na memória do navegador: nada é enviado, nada é gravado.
   ═══════════════════════════════════════════════════════════════════════ */

const CATEGORIAS = ["Alimentação", "Transporte", "Lazer", "Moradia"];
const round2 = (v: number) => Math.round(v * 100) / 100;

type Folha = null | { tipo: "gasto" } | { tipo: "pagamento"; pessoa: string };

export function DemoApp() {
  const [aba, setAba] = useState<AbaApp>("inicio");
  const [subCarteira, setSubCarteira] = useState("Contas");
  const [subGastos, setSubGastos] = useState("Lançamentos");
  const [saldo, setSaldo] = useState(SALDO_HOJE);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(LANCAMENTOS);
  const [metas, setMetas] = useState(METAS);
  const [pessoas, setPessoas] = useState<PessoaMock[]>(PESSOAS);
  const [novos, setNovos] = useState<Set<number>>(new Set());
  const [folha, setFolha] = useState<Folha>(null);
  const proximoId = useRef(500);
  const conteudoRef = useRef<HTMLDivElement>(null);
  const pendente = useRef(0);
  useEffect(() => () => clearTimeout(pendente.current), []);

  const irPara = (a: AbaApp) => {
    setAba(a);
    conteudoRef.current?.scrollTo({ top: 0 });
  };

  // A tela volta para o Início e só depois o lançamento entra, para o saldo
  // contar e a linha deslizar diante da pessoa — como no app.
  const depoisDeVoltar = (fn: () => void) => {
    irPara("inicio");
    clearTimeout(pendente.current);
    pendente.current = window.setTimeout(fn, 380);
  };

  const lancarGasto = (g: { descricao: string; categoria: string; valor: number; tipo: "debito" | "credito"; divide: boolean }) => {
    setFolha(null);
    const id = proximoId.current++;
    const parte = g.divide ? round2(g.valor / 3) : g.valor;
    depoisDeVoltar(() => {
      setLancamentos((l) => [
        { id, descricao: g.descricao, categoria: g.categoria, tipo: g.tipo, valor: g.valor, minhaParte: g.divide ? parte : undefined, pessoas: g.divide ? "Ana, Bruno" : undefined, dia: 28 },
        ...l,
      ]);
      setNovos(new Set([id]));
      if (g.tipo === "debito") setSaldo((s) => round2(s - g.valor));
      setMetas((ms) => ms.map((m) => (m.categoria === g.categoria ? { ...m, gasto: round2(m.gasto + parte) } : m)));
      if (g.divide) {
        setPessoas((ps) => ps.map((p) => (p.nome === "Ana" || p.nome === "Bruno" ? { ...p, doMes: round2(p.doMes + parte) } : p)));
      }
    });
  };

  const registrarPagamento = (nome: string, valor: number) => {
    setFolha(null);
    const id = proximoId.current++;
    depoisDeVoltar(() => {
      setSaldo((s) => round2(s + valor));
      setPessoas((ps) =>
        ps.map((p) => {
          if (p.nome !== nome) return p;
          // Quita primeiro o mês, depois as cobranças — como no app.
          const doMes = Math.max(0, round2(p.doMes - valor));
          const sobra = Math.max(0, round2(valor - p.doMes));
          const emCobrancas = Math.max(0, round2(p.emCobrancas - sobra));
          return { ...p, doMes, emCobrancas, cobrancas: emCobrancas > 0 ? p.cobrancas : 0 };
        })
      );
      setLancamentos((l) => [{ id, descricao: `Pix de ${nome}`, categoria: nome, tipo: "debito", valor, dia: 28, entrada: true }, ...l]);
      setNovos(new Set([id]));
    });
  };

  const devolver = Object.fromEntries(pessoas.map((p) => [p.nome, p.doMes]));
  const pessoaDaFolha = folha?.tipo === "pagamento" ? pessoas.find((p) => p.nome === folha.pessoa) : undefined;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      {/* O celular: a tela do app inteira, no tema escuro dele. */}
      <div className="app-escuro relative flex h-[clamp(620px,calc(100svh-64px),740px)] flex-col overflow-hidden bg-page sm:h-[720px] sm:rounded sm:ring-1 sm:ring-inset sm:ring-line">
        <TopoApp />

        {(aba === "carteira" || aba === "gastos") && (
          <div className="shrink-0 px-4 pt-1 pb-3">
            {aba === "carteira" ? (
              <AbasDaSecao abas={["Contas", "Cartões"]} ativa={subCarteira} onTrocar={setSubCarteira} />
            ) : (
              <AbasDaSecao abas={["Lançamentos", "Metas"]} ativa={subGastos} onTrocar={setSubGastos} />
            )}
          </div>
        )}

        <div ref={conteudoRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {/* `key`: cada tela entra com a mesma chegada do app. */}
          <div key={`${aba}-${subCarteira}-${subGastos}`} className="tela" data-direcao="nenhuma">
            <div className={aba === "inicio" ? "pt-2" : ""}>
              {aba === "inicio" && <TelaInicio saldo={saldo} devolver={devolver} ultimos={lancamentos.slice(0, 3)} novos={novos} />}
              {aba === "carteira" && (subCarteira === "Contas" ? <TelaContas saldo={saldo} /> : <TelaCartao />)}
              {aba === "gastos" && (subGastos === "Lançamentos" ? <TelaLancamentos lancamentos={lancamentos} novos={novos} /> : <TelaMetas metas={metas} />)}
              {aba === "receber" && <TelaPessoas pessoas={pessoas} onPagar={(nome) => setFolha({ tipo: "pagamento", pessoa: nome })} />}
            </div>
          </div>
        </div>

        <BarraApp ativa={aba} onAba={irPara} onLancar={() => setFolha({ tipo: "gasto" })} />

        {folha?.tipo === "gasto" && (
          <FolhaDaDemo titulo="Novo gasto" onFechar={() => setFolha(null)}>
            <FormularioGasto onSalvar={lancarGasto} onCancelar={() => setFolha(null)} />
          </FolhaDaDemo>
        )}
        {folha?.tipo === "pagamento" && pessoaDaFolha && (
          <FolhaDaDemo titulo="Registrar pagamento" onFechar={() => setFolha(null)}>
            <FormularioPagamento pessoa={pessoaDaFolha} onSalvar={registrarPagamento} onCancelar={() => setFolha(null)} />
          </FolhaDaDemo>
        )}
      </div>
    </div>
  );
}

/* A folha do app (o <FormSheet>), mas presa dentro do celular da demo. */
function FolhaDaDemo({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onFechar]);
  return (
    <div className="absolute inset-0 z-20">
      <div
        className="absolute inset-0 bg-scrim animate-[fundo-entra_240ms_ease-out]"
        aria-hidden="true"
        /* ds-ok: fundo de dispensa da folha da demo; Esc e o X fecham pelo teclado */
        onClick={onFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="absolute inset-x-0 bottom-0 max-h-[92%] flex flex-col bg-surface-1 rounded-t animate-[sheet-sobe_380ms_var(--ease-out-expo)]"
      >
        <div className="shrink-0 h-6 flex items-center justify-center" aria-hidden="true">
          <span className="w-9 h-1 rounded-sm bg-surface-3" />
        </div>
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-1">
          <h3 className="text-lg font-medium text-fg">{titulo}</h3>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="w-11 h-11 -mr-3 -mt-2 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Rodape({ rotulo, pode, onCancelar }: { rotulo: string; pode: boolean; onCancelar: () => void }) {
  return (
    <div className="shrink-0 px-5 pt-3 pb-4 border-t border-line grid gap-2">
      <Button type="submit" variante="principal" cheio disabled={!pode}>
        {rotulo}
      </Button>
      <Button variante="fantasma" cheio onClick={onCancelar}>
        Cancelar
      </Button>
    </div>
  );
}

function FormularioGasto({
  onSalvar,
  onCancelar,
}: {
  onSalvar: (g: { descricao: string; categoria: string; valor: number; tipo: "debito" | "credito"; divide: boolean }) => void;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("Alimentação");
  const [tipo, setTipo] = useState<"debito" | "credito">("debito");
  const [divide, setDivide] = useState(false);
  const v = parseCurrency(valor || "0");

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (v > 0) onSalvar({ descricao: descricao.trim() || categoria, categoria, valor: v, tipo, divide });
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <div className="pt-6 pb-7">
          <MoneyInput tamanho="heroi" value={valor} onChange={setValor} aria-label="Valor" data-autofocus />
        </div>
        <div className="space-y-5">
          <Campo rotulo="Descrição" htmlFor="demo-descricao">
            <input
              id="demo-descricao"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, 40))}
              placeholder="Ex: mercado, Netflix, almoço"
              className={campoClasse}
            />
          </Campo>
          <Campo rotulo="Categoria">
            <Chips>
              {CATEGORIAS.map((c) => (
                <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
                  {c}
                </Chip>
              ))}
            </Chips>
          </Campo>
          <Campo
            rotulo="Divide com alguém?"
            dica={divide && v > 0 ? <>Ana e Bruno · <span className="valor">{formatCurrency(round2(v / 3))}</span> cada, sua parte também</> : undefined}
          >
            <SegmentedControl
              rotulo="Divide com alguém"
              cheio
              segmentos={[
                { chave: "nao", rotulo: "Não", ativo: !divide, onClick: () => setDivide(false) },
                { chave: "sim", rotulo: "Com Ana e Bruno", ativo: divide, onClick: () => setDivide(true) },
              ]}
            />
          </Campo>
          <Campo rotulo="Forma de pagamento">
            <SegmentedControl
              rotulo="Forma de pagamento"
              cheio
              segmentos={[
                { chave: "debito", rotulo: "Débito", ativo: tipo === "debito", onClick: () => setTipo("debito") },
                { chave: "credito", rotulo: "Crédito", ativo: tipo === "credito", onClick: () => setTipo("credito") },
              ]}
            />
          </Campo>
        </div>
      </div>
      <Rodape rotulo="Adicionar gasto" pode={v > 0} onCancelar={onCancelar} />
    </form>
  );
}

function FormularioPagamento({
  pessoa,
  onSalvar,
  onCancelar,
}: {
  pessoa: PessoaMock;
  onSalvar: (nome: string, valor: number) => void;
  onCancelar: () => void;
}) {
  const total = round2(pessoa.doMes + pessoa.emCobrancas);
  const [valor, setValor] = useState(formatCurrencyValue(total));
  const v = parseCurrency(valor || "0");
  const passou = v > total + 0.009;
  const doMes = Math.min(v, pessoa.doMes);
  const deCobranca = Math.max(0, Math.min(v - pessoa.doMes, pessoa.emCobrancas));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (v > 0 && !passou) onSalvar(pessoa.nome, v);
      }}
    >
      <p className="px-5 mt-1 text-sm text-fg-2">
        {pessoa.nome} deve <span className="valor">{formatCurrency(total)}</span> no total
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <div className="pt-6 pb-7">
          <MoneyInput tamanho="heroi" value={valor} onChange={setValor} aria-label="Valor recebido" />
        </div>
        {!passou && v > 0 && (
          <dl className="text-sm divide-y divide-line">
            {doMes > 0 && (
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-fg-2">Outubro</dt>
                <dd className="valor text-fg">{formatCurrency(doMes)}</dd>
              </div>
            )}
            {deCobranca > 0 && (
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-fg-2">Cobrança de setembro</dt>
                <dd className="valor text-fg">{formatCurrency(deCobranca)}</dd>
              </div>
            )}
          </dl>
        )}
        {passou && <p className="text-sm text-danger-ink">O máximo aqui é {formatCurrency(total)}.</p>}
      </div>
      <Rodape rotulo="Confirmar pagamento" pode={v > 0 && !passou} onCancelar={onCancelar} />
    </form>
  );
}
