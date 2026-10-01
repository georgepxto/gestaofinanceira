import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../../context";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatCurrencyValue, parseCurrency } from "../../utils/calculations";
import { distribuir, pendenciasDaPessoa, type Alvo } from "../../utils/receber";
import { avisarDadosMudaram } from "../../utils/onboarding";
import type { ContaBancaria } from "../../types";
import { toast } from "../ui/Toaster";
import { FormSheet, Campo, Chip, Chips } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { EscolhaConta } from "../ui/EscolhaConta";

interface RegistrarPagamentoProps {
  pessoa: string | null;
  onFechar: () => void;
}

/**
 * Um pagamento só para a pessoa, seja do mês ou de cobrança. Antes eram três
 * botões "Registrar pagamento" com sentidos diferentes, um em cada aba; aqui
 * a pessoa diz quanto recebeu e para onde vai — e, sem escolher, o valor
 * quita primeiro o mês e depois as cobranças mais antigas.
 */
export function RegistrarPagamento({ pessoa, onFechar }: RegistrarPagamentoProps) {
  const ctx = useAppContext();
  const { mesVisualizacao, handleAddPagamentoParcial, handlePagamento } = ctx;
  const aberto = !!pessoa;

  const [valor, setValor] = useState("");
  const [destino, setDestino] = useState<"tudo" | string>("tudo");
  const [contaId, setContaId] = useState("");
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [salvando, setSalvando] = useState(false);

  const p = pessoa ? pendenciasDaPessoa(pessoa, ctx) : null;
  const nomeMes = format(mesVisualizacao, "MMMM", { locale: ptBR });
  const alvos: Alvo[] = p
    ? [
        ...(p.mes.falta > 0 ? [{ chave: "mes", rotulo: `Empréstimos de ${nomeMes}`, falta: p.mes.falta }] : []),
        ...p.cobrancas.map((c) => ({ chave: c.id, rotulo: c.descricao, falta: c.valor_atual })),
      ]
    : [];
  const escolhidos = destino === "tudo" ? alvos : alvos.filter((a) => a.chave === destino);
  const maximo = escolhidos.reduce((s, a) => s + a.falta, 0);
  const valorNum = parseCurrency(valor || "0");
  const partes = distribuir(valorNum, escolhidos);
  const passou = valorNum > maximo + 0.009;

  // Ao abrir: tudo selecionado e o valor cheio, que é o caso mais comum.
  useEffect(() => {
    if (!aberto || !p) return;
    setDestino("tudo");
    setValor(p.total > 0 ? formatCurrencyValue(p.total) : "");
    setContaId("");
    if (supabase) {
      supabase
        .from("contas_bancarias")
        .select("*")
        .order("nome")
        .then(({ data }) => setContas((data as ContaBancaria[]) || []));
    }
    // Só na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const escolher = (chave: "tudo" | string) => {
    setDestino(chave);
    const lista = chave === "tudo" ? alvos : alvos.filter((a) => a.chave === chave);
    setValor(formatCurrencyValue(lista.reduce((s, a) => s + a.falta, 0)));
  };

  const enviar = async () => {
    if (!pessoa || !p || partes.length === 0 || passou) return;
    setSalvando(true);
    try {
      for (const parte of partes) {
        if (parte.alvo.chave === "mes") await handleAddPagamentoParcial(pessoa, contaId || undefined, parte.valor, true);
        else await handlePagamento(parte.alvo.chave, contaId || undefined, parte.valor, true);
      }
      const resta = Math.max(0, p.total - valorNum);
      toast.success(
        resta > 0.009
          ? `${pessoa} pagou ${formatCurrency(valorNum)}. Ainda deve ${formatCurrency(resta)}.`
          : `${pessoa} pagou ${formatCurrency(valorNum)} e não deve mais nada.`
      );
      avisarDadosMudaram("receber");
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormSheet
      aberto={aberto}
      titulo="Registrar pagamento"
      aviso={
        p && (
          <>
            {pessoa} deve <span className="valor">{formatCurrency(p.total)}</span> no total
          </>
        )
      }
      onFechar={onFechar}
      onEnviar={enviar}
      rotuloEnviar="Confirmar pagamento"
      enviando={salvando}
      podeEnviar={partes.length > 0 && !passou}
      erro={passou ? `O máximo aqui é ${formatCurrency(maximo)}.` : null}
      valor={<MoneyInput tamanho="heroi" value={valor} onChange={setValor} aria-label="Valor recebido" data-autofocus />}
    >
      {alvos.length > 1 && (
        <Campo rotulo="Para onde vai" dica={destino === "tudo" ? "Quita primeiro o mês e depois as cobranças mais antigas." : undefined}>
          <Chips>
            <Chip ativo={destino === "tudo"} onClick={() => escolher("tudo")}>
              Tudo · <span className="valor">{formatCurrency(alvos.reduce((s, a) => s + a.falta, 0))}</span>
            </Chip>
            {alvos.map((a) => (
              <Chip key={a.chave} ativo={destino === a.chave} onClick={() => escolher(a.chave)}>
                {a.rotulo} · <span className="valor">{formatCurrency(a.falta)}</span>
              </Chip>
            ))}
          </Chips>
        </Campo>
      )}

      {/* Para onde cada parte do valor vai, antes de confirmar. */}
      {partes.length > 0 && !passou && (
        <dl className="text-sm divide-y divide-line">
          {partes.map((parte) => (
            <div key={parte.alvo.chave} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-fg-2 min-w-0 break-words">
                {parte.alvo.rotulo}
                {parte.valor < parte.alvo.falta - 0.009 && (
                  <span className="text-fg-3"> · falta {formatCurrency(parte.alvo.falta - parte.valor)}</span>
                )}
              </dt>
              <dd className="valor text-fg shrink-0">{formatCurrency(parte.valor)}</dd>
            </div>
          ))}
        </dl>
      )}

      <EscolhaConta contas={contas} valor={contaId} onChange={setContaId} aberto={aberto && contas.length > 0} />
    </FormSheet>
  );
}
