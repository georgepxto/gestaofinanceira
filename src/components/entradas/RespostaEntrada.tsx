import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Receita } from "../../types";
import { formatCurrency, formatCurrencyValue, parseCurrency } from "../../utils/calculations";
import { adiarEntrada, confirmarEntrada, daquiA } from "../../utils/entradas";
import { FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

export type ModoResposta = "valor" | "adiar";

export interface PedidoResposta {
  receita: Receita;
  mes: string;
  dataPrevista: string;
  modo: ModoResposta;
}

const OPCOES_ADIAR = [
  { dias: 1, rotulo: "Amanhã" },
  { dias: 2, rotulo: "Em 2 dias" },
  { dias: 5, rotulo: "Em 5 dias" },
  { dias: 10, rotulo: "Em 10 dias" },
];

const diaCurto = (iso: string) => format(parseISO(iso), "d 'de' MMMM", { locale: ptBR });

/**
 * As respostas que pedem mais que um toque: "caiu outro valor" (quanto e
 * quando) e "ainda não" (quando perguntar de novo: em N dias, num dia ou num
 * intervalo — "deve cair entre o dia 8 e o 12").
 */
export function RespostaEntrada({ pedido, onFechar }: { pedido: PedidoResposta | null; onFechar: () => void }) {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [valor, setValor] = useState("");
  const [dataCaiu, setDataCaiu] = useState(hoje);
  const [escolha, setEscolha] = useState<string>("1");
  const [diaExato, setDiaExato] = useState(daquiA(3));
  const [de, setDe] = useState(daquiA(3));
  const [ate, setAte] = useState(daquiA(7));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!pedido) return;
    setValor(formatCurrencyValue(pedido.receita.valor));
    setDataCaiu(pedido.dataPrevista <= hoje ? pedido.dataPrevista : hoje);
    setEscolha("1");
    setDiaExato(daquiA(3));
    setDe(daquiA(3));
    setAte(daquiA(7));
    setErro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  if (!pedido) return null;
  const { receita, mes, modo } = pedido;

  const intervaloInvalido = escolha === "intervalo" && (!de || !ate || ate < de || de <= hoje);
  const diaInvalido = escolha === "dia" && (!diaExato || diaExato <= hoje);

  const enviar = async () => {
    setEnviando(true);
    const r =
      modo === "valor"
        ? await confirmarEntrada(receita, mes, dataCaiu, parseCurrency(valor))
        : escolha === "dia"
          ? await adiarEntrada(receita, mes, diaExato)
          : escolha === "intervalo"
            ? await adiarEntrada(receita, mes, de, ate)
            : await adiarEntrada(receita, mes, daquiA(Number(escolha)));
    setEnviando(false);
    if (r.erro) setErro(r.erro);
    else onFechar();
  };

  return (
    <FormSheet
      aberto={!!pedido}
      titulo={modo === "valor" ? `Quanto caiu de ${receita.descricao}?` : `${receita.descricao} ainda não caiu`}
      aviso={
        modo === "valor"
          ? `Previsto: ${formatCurrency(receita.valor)} no dia ${diaCurto(pedido.dataPrevista)}. Vale só para este mês.`
          : "Quando pergunto de novo?"
      }
      onFechar={onFechar}
      onEnviar={enviar}
      rotuloEnviar={modo === "valor" ? "Confirmar" : "Perguntar depois"}
      enviando={enviando}
      podeEnviar={modo === "valor" ? parseCurrency(valor) > 0 && !!dataCaiu && dataCaiu <= hoje : !intervaloInvalido && !diaInvalido}
      erro={erro}
      valor={modo === "valor" ? <MoneyInput tamanho="heroi" value={valor} onChange={setValor} aria-label="Quanto caiu" data-autofocus /> : undefined}
    >
      {modo === "valor" ? (
        <Campo rotulo="Caiu no dia" htmlFor="entrada-dia" dica="Pode ser antes do dia previsto.">
          <input id="entrada-dia" type="date" max={hoje} value={dataCaiu} onChange={(e) => setDataCaiu(e.target.value)} className={campoClasse} />
        </Campo>
      ) : (
        <>
          <Campo rotulo="Perguntar de novo">
            <Chips>
              {OPCOES_ADIAR.map((o) => (
                <Chip key={o.dias} ativo={escolha === String(o.dias)} onClick={() => setEscolha(String(o.dias))}>
                  {o.rotulo}
                </Chip>
              ))}
              <Chip ativo={escolha === "dia"} onClick={() => setEscolha("dia")}>
                Num dia
              </Chip>
              <Chip ativo={escolha === "intervalo"} onClick={() => setEscolha("intervalo")}>
                Entre dois dias
              </Chip>
            </Chips>
          </Campo>
          {escolha === "dia" && (
            <Campo rotulo="Dia" htmlFor="entrada-adiar-dia">
              <input id="entrada-adiar-dia" type="date" min={daquiA(1)} value={diaExato} onChange={(e) => setDiaExato(e.target.value)} className={campoClasse} />
            </Campo>
          )}
          {escolha === "intervalo" && (
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="De" htmlFor="entrada-de">
                <input id="entrada-de" type="date" min={daquiA(1)} value={de} onChange={(e) => setDe(e.target.value)} className={campoClasse} />
              </Campo>
              <Campo rotulo="Até" htmlFor="entrada-ate">
                <input id="entrada-ate" type="date" min={de} value={ate} onChange={(e) => setAte(e.target.value)} className={campoClasse} />
              </Campo>
            </div>
          )}
          <p className="text-xs text-fg-3">
            {escolha === "intervalo"
              ? "Pergunto no primeiro dia do intervalo. Até lá, a entrada fica fora do saldo."
              : "Até lá, a entrada fica fora do saldo. Se cair antes, é só marcar em Contas e receitas."}
          </p>
        </>
      )}
    </FormSheet>
  );
}
