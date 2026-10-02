import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseCurrency, formatCurrency } from "../../utils/calculations";
import { faturaDepoisDaProxima, proximaFatura, vencimentoDaFatura } from "../../utils/fatura";
import type { CartaoCredito } from "../../types";
import { Campo } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { Button } from "../ui/Button";

/** Até quantas faturas depois da próxima dá para informar. */
const MAX_SEGUINTES = 12;

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
  /** As faturas depois da próxima, mês a mês, na ordem. Opcional. */
  seguintes?: string[];
  onSeguintes?: (v: string[]) => void;
}

const somaDe = (seguintes: string[] = []) => seguintes.reduce((s, v) => s + (v ? parseCurrency(v) : 0), 0);

/** "Fatura que vence em 10 de outubro" — o nome que a pessoa reconhece no app do banco. */
export function rotuloProximaFatura(diaVencimento: number, melhorDia?: number) {
  if (!diaVencimento) return "Próxima fatura";
  const cartao = { dia_vencimento: diaVencimento, melhor_dia_compra: melhorDia } as CartaoCredito;
  const vence = vencimentoDaFatura(proximaFatura(cartao), cartao);
  return `Fatura que vence em ${format(parseISO(vence), "d 'de' MMMM", { locale: ptBR })}`;
}

/** O que não fecha entre os números, numa frase. */
export function erroDoBanco(limite: number, disponivel: string, fatura: string, seguintes: string[] = []) {
  const disp = disponivel ? parseCurrency(disponivel) : null;
  const fat = fatura ? parseCurrency(fatura) : 0;
  const soma = somaDe(seguintes);
  // Sem o limite não dá para saber quanto está usado: antes a conta saía
  // "limite usado −R$ 7.000,00".
  if (disp !== null && limite <= 0) return "Preencha o limite do cartão, lá em cima, para o Hedge calcular quanto já está usado.";
  if (disp !== null && disp > limite) return "O disponível não pode passar do limite.";
  const usado = disp === null ? fat : limite - disp;
  if (disp !== null && fat > usado + 0.009)
    return `A fatura é maior que o limite usado (${formatCurrency(usado)}). Confira os dois valores no app do banco.`;
  if (disp !== null && soma > 0 && fat + soma > usado + 0.009)
    return `As faturas somam ${formatCurrency(fat + soma)}, mais que o limite usado (${formatCurrency(usado)}). Confira os valores no app do banco.`;
  return null;
}

/**
 * Os dois números que todo app de banco mostra na tela do cartão: o limite
 * disponível e a próxima fatura. Deles sai o limite usado e o quanto dele é
 * parcela das faturas seguintes — o que a antiga "dívida inicial" misturava.
 */
export function CamposDoBanco({
  limite,
  diaVencimento,
  melhorDia,
  disponivel,
  fatura,
  onDisponivel,
  onFatura,
  hedge,
  seguintes = [],
  onSeguintes,
}: CamposDoBancoProps) {
  const disp = disponivel ? parseCurrency(disponivel) : null;
  const fat = fatura ? parseCurrency(fatura) : 0;
  const soma = somaDe(seguintes);
  const usado = disp === null ? fat + soma : Math.max(0, limite - disp);
  const depois = Math.max(0, usado - fat);
  const semMes = soma > 0 ? Math.max(0, depois - soma) : 0;
  const erro = erroDoBanco(limite, disponivel, fatura, seguintes);
  const preenchido = disp !== null || fat > 0 || soma > 0;

  // "Fatura de novembro" — com o ano quando vira o ano.
  const cartao = { dia_vencimento: diaVencimento || 1, melhor_dia_compra: melhorDia };
  const nomeDaSeguinte = (n: number) => {
    const d = parseISO(`${faturaDepoisDaProxima(cartao, n)}-01`);
    return format(d, d.getFullYear() === new Date().getFullYear() ? "MMMM" : "MMMM 'de' yyyy", { locale: ptBR });
  };

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
      {/* As faturas seguintes, mês a mês, como o app do banco lista. */}
      {onSeguintes && (
        <div className="space-y-4">
          {seguintes.map((v, i) => (
            <Campo key={i} rotulo={`Fatura de ${nomeDaSeguinte(i + 1)}`} htmlFor={`banco-seguinte-${i}`}>
              <MoneyInput
                id={`banco-seguinte-${i}`}
                value={v}
                onChange={(novo) => onSeguintes(seguintes.map((x, j) => (j === i ? novo : x)))}
              />
            </Campo>
          ))}
          {seguintes.length === 0 && (
            <p className="text-xs text-fg-3">
              O banco já mostra as próximas faturas? Informe mês a mês e cada uma aparece no Hedge com o valor certo.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {seguintes.length < MAX_SEGUINTES && (
              <Button variante="secundario" tamanho="sm" onClick={() => onSeguintes([...seguintes, ""])}>
                {seguintes.length === 0 ? "Informar as faturas seguintes" : `Mais a de ${nomeDaSeguinte(seguintes.length + 1)}`}
              </Button>
            )}
            {seguintes.length > 0 && (
              <Button variante="fantasma" tamanho="sm" onClick={() => onSeguintes(seguintes.slice(0, -1))}>
                Tirar a de {nomeDaSeguinte(seguintes.length)}
              </Button>
            )}
          </div>
        </div>
      )}
      {erro ? (
        <p role="alert" className="text-xs text-danger-ink">{erro}</p>
      ) : (
        preenchido && (
          <p className="text-xs text-fg-2 leading-relaxed">
            Limite usado: <span className="valor text-fg">{formatCurrency(usado)}</span>
            {depois > 0.009 && (
              <>
                {" "}— <span className="valor">{formatCurrency(fat)}</span> dessa fatura e{" "}
                <span className="valor">{formatCurrency(depois)}</span> em parcelas que vêm nas próximas
                {semMes > 0.009 && (
                  <>
                    {" "}(<span className="valor">{formatCurrency(semMes)}</span> sem mês definido)
                  </>
                )}
                . Compras que você lançar com data até hoje já estão nesses valores e não contam de novo.
              </>
            )}
          </p>
        )
      )}
    </>
  );
}
