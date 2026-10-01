import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ContaBancaria, Receita } from "../../types";
import type { EstadoEntrada } from "../../utils/saldo";
import { formatCurrency } from "../../utils/calculations";
import { confirmarEntrada } from "../../utils/entradas";
import { Surface, SurfaceHeader } from "../ui/Surface";
import { Button } from "../ui/Button";
import type { PedidoResposta } from "./RespostaEntrada";

interface Item {
  receita: Receita;
  mes: string;
  estado: EstadoEntrada;
}

interface ConfirmarEntradasProps {
  itens: Item[];
  contas: ContaBancaria[];
  onResponder: (pedido: PedidoResposta) => void;
}

const quando = (e: EstadoEntrada) => {
  const dia = format(parseISO(e.dataPrevista), "d 'de' MMMM", { locale: ptBR });
  return e.perguntarEm ? `previsto para ${dia}, adiado até hoje` : `previsto para ${dia}`;
};

/**
 * "O salário caiu?" no Início, no dia previsto. A entrada só vai para o saldo
 * com o "Caiu" — ou com outro valor, ou fica para depois. Responder some com
 * a linha; o resto segue esperando.
 */
export function ConfirmarEntradas({ itens, contas, onResponder }: ConfirmarEntradasProps) {
  const [enviando, setEnviando] = useState<string | null>(null);
  if (itens.length === 0) return null;

  const caiu = async (it: Item) => {
    setEnviando(`${it.receita.id}-${it.mes}`);
    // Sem adiamento, caiu no dia previsto; adiada, caiu hoje.
    const data = it.estado.perguntarEm ? format(new Date(), "yyyy-MM-dd") : it.estado.dataPrevista;
    await confirmarEntrada(it.receita, it.mes, data);
    setEnviando(null);
  };

  return (
    <Surface as="section">
      <SurfaceHeader
        titulo={itens.length === 1 ? "Essa entrada caiu?" : "Essas entradas caíram?"}
        descricao="Só entra no saldo depois que você confirma."
        className="mb-1"
      />
      <ul className="divide-y divide-line">
        {itens.map((it) => {
          const conta = contas.find((c) => c.id === it.receita.conta_id);
          const chave = `${it.receita.id}-${it.mes}`;
          return (
            <li key={chave} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] md:text-sm text-fg break-words">
                  {it.receita.descricao} <span className="valor">{formatCurrency(it.receita.valor)}</span>
                </p>
                <p className="text-xs text-fg-2 mt-0.5">
                  {quando(it.estado)}
                  {conta ? ` · ${conta.nome}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button tamanho="sm" onClick={() => caiu(it)} carregando={enviando === chave}>
                  Caiu
                </Button>
                <Button
                  tamanho="sm"
                  variante="fantasma"
                  onClick={() => onResponder({ receita: it.receita, mes: it.mes, dataPrevista: it.estado.dataPrevista, modo: "valor" })}
                >
                  Outro valor
                </Button>
                <Button
                  tamanho="sm"
                  variante="fantasma"
                  onClick={() => onResponder({ receita: it.receita, mes: it.mes, dataPrevista: it.estado.dataPrevista, modo: "adiar" })}
                >
                  Ainda não
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
