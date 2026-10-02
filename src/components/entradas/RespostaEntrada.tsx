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

// Os motivos mais comuns, para um toque; o campo aceita qualquer outro.
const MOTIVOS_MENOS = ["Desconto", "Vale", "Adiantamento", "Faltas"];
const MOTIVOS_MAIS = ["Hora extra", "Bônus", "Comissão", "Reajuste"];

const diaCurto = (iso: string) => format(parseISO(iso), "d 'de' MMMM", { locale: ptBR });

/**
 * As respostas que pedem mais que um toque: "caiu outro valor" (quanto e
 * quando) e "ainda não" (quando perguntar de novo: em N dias, num dia ou num
 * intervalo — "deve cair entre o dia 8 e o 12").
 */
export function RespostaEntrada({ pedido, onFechar }: { pedido: PedidoResposta | null; onFechar: () => void }) {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
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
    setMotivo("");
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
  // Quanto caiu a mais ou a menos que o cadastrado: fica registrado com o motivo.
  const diferenca = Math.round((parseCurrency(valor) - receita.valor) * 100) / 100;

  const enviar = async () => {
    setEnviando(true);
    const r =
      modo === "valor"
        ? await confirmarEntrada(receita, mes, dataCaiu, parseCurrency(valor), motivo)
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
        <>
          {diferenca !== 0 && parseCurrency(valor) > 0 && (
            <p className="text-sm text-fg-2">
              <span className="valor text-fg">{formatCurrency(Math.abs(diferenca))}</span>{" "}
              {diferenca < 0 ? "a menos" : "a mais"} que o previsto.
            </p>
          )}
          {diferenca !== 0 && parseCurrency(valor) > 0 && (
            <Campo
              rotulo={diferenca < 0 ? "Por que veio menos?" : "Por que veio mais?"}
              htmlFor="entrada-motivo"
              dica="Opcional. Fica anotado na entrada, para você lembrar quando olhar este mês de novo."
            >
              <Chips>
                {(diferenca < 0 ? MOTIVOS_MENOS : MOTIVOS_MAIS).map((m) => (
                  <Chip key={m} ativo={motivo === m} onClick={() => setMotivo(motivo === m ? "" : m)}>
                    {m}
                  </Chip>
                ))}
              </Chips>
              <input
                id="entrada-motivo"
                type="text"
                value={motivo}
                maxLength={80}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={diferenca < 0 ? "Ex: desconto do plano de saúde" : "Ex: hora extra de setembro"}
                className={`${campoClasse} mt-2`}
              />
            </Campo>
          )}
          <Campo rotulo="Caiu no dia" htmlFor="entrada-dia" dica="Pode ser antes do dia previsto.">
            <input id="entrada-dia" type="date" max={hoje} value={dataCaiu} onChange={(e) => setDataCaiu(e.target.value)} className={campoClasse} />
          </Campo>
        </>
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
