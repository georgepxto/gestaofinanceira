import { useEffect, useState } from "react";
import { meusGastosFunctions } from "../../lib/supabase";
import type { ContaBancaria, MeuGasto } from "../../types";
import { parseCurrency } from "../../utils/calculations";
import { chaveCategoria, CATEGORIA_PADRAO } from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { inicioParaNovoRecorrente } from "../../utils/saldo";
import { avisarDadosMudaram } from "../../utils/onboarding";
import { FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

// Os fixos que quase todo mundo tem, com a categoria em que caem.
const SUGESTOES: { nome: string; categoria: string }[] = [
  { nome: "Aluguel", categoria: "Moradia" },
  { nome: "Condomínio", categoria: "Moradia" },
  { nome: "Luz", categoria: "Moradia" },
  { nome: "Água", categoria: "Moradia" },
  { nome: "Internet", categoria: "Assinaturas" },
  { nome: "Celular", categoria: "Assinaturas" },
  { nome: "Streaming", categoria: "Assinaturas" },
  { nome: "Academia", categoria: "Saúde" },
];

interface Linha {
  nome: string;
  categoria: string;
  valor: string;
  dia: string;
}

interface FixosRapidosProps {
  aberto: boolean;
  contas: ContaBancaria[];
  onFechar: () => void;
}

/**
 * Cadastrar os gastos fixos de uma vez: tocar no que tem, digitar valor e dia.
 * Cada um vira um gasto fixo comum (o mesmo de Lançamentos), na conta escolhida.
 */
export function FixosRapidos({ aberto, contas, onFechar }: FixosRapidosProps) {
  const { categorias } = useCategorias("gasto");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [contaId, setContaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Zera só ao abrir. Antes zerava a cada recarga da lista de contas — e ela
  // recarrega quando a janela volta ao foco: o Alt+Tab apagava o digitado.
  useEffect(() => {
    if (!aberto) return;
    setLinhas([]);
    setErro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  useEffect(() => {
    if (aberto && !contas.some((c) => c.id === contaId)) setContaId(contas[0]?.id || "");
  }, [aberto, contas, contaId]);

  const alternar = (s: (typeof SUGESTOES)[number]) =>
    setLinhas((ls) =>
      ls.some((l) => l.nome === s.nome) ? ls.filter((l) => l.nome !== s.nome) : [...ls, { ...s, valor: "", dia: "10" }]
    );
  const mudar = (nome: string, campo: "valor" | "dia", v: string) =>
    setLinhas((ls) => ls.map((l) => (l.nome === nome ? { ...l, [campo]: v } : l)));

  // A categoria sugerida, se a pessoa ainda tem ela na lista; senão a padrão.
  const categoriaDaLista = (c: string) =>
    categorias.find((x) => chaveCategoria(x) === chaveCategoria(c)) ?? CATEGORIA_PADRAO;

  const prontas = linhas.filter((l) => parseCurrency(l.valor) > 0);

  const salvar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      for (const [i, l] of prontas.entries()) {
        const gasto: MeuGasto = {
          id: `${Date.now()}-${i}`,
          descricao: l.nome,
          valor: parseCurrency(l.valor),
          tipo: "debito",
          categoria: "fixo",
          categoria_gasto: categoriaDaLista(l.categoria),
          data: inicioParaNovoRecorrente(),
          pago: true,
          dia_vencimento: Math.min(Math.max(parseInt(l.dia) || 1, 1), 31),
          ativo: true,
          num_parcelas: 1,
          parcela_atual: 1,
          conta_id: contaId || undefined,
        };
        const criado = await meusGastosFunctions.create(gasto);
        if (!criado) throw new Error(`Não foi possível salvar ${l.nome}.`);
      }
      avisarDadosMudaram("onboarding");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar os fixos.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormSheet
      aberto={aberto}
      titulo="Seus gastos fixos"
      aviso="Toque no que você paga todo mês e preencha valor e dia."
      onFechar={onFechar}
      onEnviar={salvar}
      rotuloEnviar={prontas.length > 1 ? `Salvar ${prontas.length} fixos` : "Salvar"}
      enviando={enviando}
      podeEnviar={prontas.length > 0}
      erro={erro}
    >
      <Campo rotulo="O que você paga todo mês">
        <Chips>
          {SUGESTOES.map((s) => (
            <Chip key={s.nome} ativo={linhas.some((l) => l.nome === s.nome)} onClick={() => alternar(s)}>
              {s.nome}
            </Chip>
          ))}
        </Chips>
      </Campo>

      {linhas.map((l) => (
        <div key={l.nome} className="grid grid-cols-[1fr_88px] gap-3 items-end">
          <Campo rotulo={`${l.nome} · valor`} htmlFor={`fx-${l.nome}`}>
            <MoneyInput id={`fx-${l.nome}`} value={l.valor} onChange={(v) => mudar(l.nome, "valor", v)} />
          </Campo>
          <Campo rotulo="Dia" htmlFor={`fx-dia-${l.nome}`}>
            <input
              id={`fx-dia-${l.nome}`}
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={l.dia}
              onChange={(e) => mudar(l.nome, "dia", e.target.value)}
              className={`${campoClasse} valor`}
            />
          </Campo>
        </div>
      ))}

      {contas.length > 1 && (
        <Campo rotulo="Saem de qual conta">
          <Chips>
            {contas.map((c) => (
              <Chip key={c.id} ativo={contaId === c.id} onClick={() => setContaId(c.id)}>
                {c.nome}
              </Chip>
            ))}
          </Chips>
        </Campo>
      )}

      <p className="text-xs text-fg-3">Outros fixos, ou mudanças, ficam em Lançamentos.</p>
    </FormSheet>
  );
}
