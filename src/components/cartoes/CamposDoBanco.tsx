import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseCurrency, formatCurrency } from "../../utils/calculations";
import { proximaFatura, vencimentoDaFatura } from "../../utils/fatura";
import type { CartaoCredito } from "../../types";
import { Campo } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

interface CamposDoBancoProps {
  limite: number;
  diaVencimento: number;
  melhorDia?: number;
  disponivel: string;
  fatura: string;
  onDisponivel: (v: string) => void;
  onFatura: (v: string) => void;
  /** Na conferência, o que o Hedge calcula hoje, para comparar. */
  hedge?: { disponivel: number; fatura: number };
}

/** "Fatura que vence em 10 de outubro" — o nome que a pessoa reconhece no app do banco. */
export function rotuloProximaFatura(diaVencimento: number, melhorDia?: number) {
  if (!diaVencimento) return "Próxima fatura";
  const cartao = { dia_vencimento: diaVencimento, melhor_dia_compra: melhorDia } as CartaoCredito;
  const vence = vencimentoDaFatura(proximaFatura(cartao), cartao);
  return `Fatura que vence em ${format(parseISO(vence), "d 'de' MMMM", { locale: ptBR })}`;
}

/** O que não fecha entre os três números, numa frase. */
export function erroDoBanco(limite: number, disponivel: string, fatura: string) {
  const disp = disponivel ? parseCurrency(disponivel) : null;
  const fat = fatura ? parseCurrency(fatura) : 0;
  // Sem o limite não dá para saber quanto está usado: antes a conta saía
  // "limite usado −R$ 7.000,00".
  if (disp !== null && limite <= 0) return "Preencha o limite do cartão, lá em cima, para o Hedge calcular quanto já está usado.";
  if (disp !== null && disp > limite) return "O disponível não pode passar do limite.";
  const usado = disp === null ? fat : limite - disp;
  if (disp !== null && fat > usado + 0.009)
    return `A fatura é maior que o limite usado (${formatCurrency(usado)}). Confira os dois valores no app do banco.`;
  return null;
}

/**
 * Os dois números que todo app de banco mostra na tela do cartão: o limite
 * disponível e a próxima fatura. Deles sai o limite usado e o quanto dele é
 * parcela das faturas seguintes — o que a antiga "dívida inicial" misturava.
 */
export function CamposDoBanco({ limite, diaVencimento, melhorDia, disponivel, fatura, onDisponivel, onFatura, hedge }: CamposDoBancoProps) {
  const disp = disponivel ? parseCurrency(disponivel) : null;
  const fat = fatura ? parseCurrency(fatura) : 0;
  const usado = disp === null ? fat : Math.max(0, limite - disp);
  const depois = Math.max(0, usado - fat);
  const erro = erroDoBanco(limite, disponivel, fatura);
  const preenchido = disp !== null || fat > 0;

  return (
    <>
      <Campo
        rotulo="Limite disponível"
        htmlFor="banco-disponivel"
        dica={hedge ? `O Hedge calcula ${formatCurrency(hedge.disponivel)}.` : "O que o app do banco diz que você ainda pode gastar."}
      >
        <MoneyInput id="banco-disponivel" value={disponivel} onChange={onDisponivel} />
      </Campo>
      <Campo
        rotulo={rotuloProximaFatura(diaVencimento, melhorDia)}
        htmlFor="banco-fatura"
        dica={hedge ? `O Hedge calcula ${formatCurrency(hedge.fatura)}.` : "O que ainda falta pagar dela."}
      >
        <MoneyInput id="banco-fatura" value={fatura} onChange={onFatura} />
      </Campo>
      {erro ? (
        <p role="alert" className="text-xs text-danger-ink">{erro}</p>
      ) : (
        preenchido && (
          <p className="text-xs text-fg-2 leading-relaxed">
            Limite usado: <span className="valor text-fg">{formatCurrency(usado)}</span>
            {depois > 0.009 && (
              <>
                {" "}— <span className="valor">{formatCurrency(fat)}</span> dessa fatura e{" "}
                <span className="valor">{formatCurrency(depois)}</span> em parcelas que vêm nas próximas. Compras que você lançar com
                data até hoje já estão nesses valores e não contam de novo.
              </>
            )}
          </p>
        )
      )}
    </>
  );
}
