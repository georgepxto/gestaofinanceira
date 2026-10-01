import { useState } from "react";
import { format, lastDayOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import type { LinhaPrevisao, Previsao } from "../../utils/previsao";
import { formatDinheiro } from "../../utils/dinheiro";
import { Surface, SurfaceHeader } from "./Surface";
import { PainelDetalhe } from "./PainelDetalhe";

interface Grupo {
  chave: string;
  rotulo: string;
  /** O que o grupo soma, em uma frase — o topo do painel de detalhe. */
  explica: string;
  valor: number;
  sinal: 1 | -1;
  itens: LinhaPrevisao[];
  /** Como chamar cada item no resumo: "pessoa", "fixo"... */
  unidade: [string, string];
}

const diaPorExtenso = (iso: string) => format(parseISO(iso), "d 'de' MMMM", { locale: ptBR });

/**
 * O fim do mês como um extrato curto: o saldo de hoje e, por linha, só o total
 * do que ainda entra e sai. Tocar num valor abre o detalhe dele. A mesma conta
 * (utils/previsao) no Início e em Contas.
 */
export function ExtratoPrevisao({ previsao, className = "", dataTour }: { previsao: Previsao; className?: string; dataTour?: string }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const nomeFim = diaPorExtenso(format(lastDayOfMonth(parseISO(`${previsao.mes}-01`)), "yyyy-MM-dd"));

  const grupos = (
    [
      {
        chave: "entrar",
        rotulo: "Vai entrar",
        explica: "Salário e receitas fixas deste mês que ainda não caíram na conta.",
        valor: previsao.vaiEntrar,
        sinal: 1,
        itens: previsao.entradas,
        unidade: ["entrada", "entradas"],
      },
      {
        chave: "devolver",
        rotulo: "Vão te devolver",
        explica: "O que cada pessoa ainda te deve deste mês, em A receber.",
        valor: previsao.vaoDevolver,
        sinal: 1,
        itens: previsao.devolucoes,
        unidade: ["pessoa", "pessoas"],
      },
      {
        chave: "sair",
        rotulo: "Vai sair",
        explica: "Fixos e débitos com data que ainda saem da conta neste mês. No fixo dividido, sai o valor cheio: a parte dos outros volta em \"Vão te devolver\".",
        valor: previsao.vaiSair,
        sinal: -1,
        itens: previsao.saidas,
        unidade: ["saída", "saídas"],
      },
      {
        chave: "fatura",
        rotulo: "Fatura do cartão",
        explica: "O que falta pagar da fatura deste mês.",
        valor: previsao.faturas,
        sinal: -1,
        itens: previsao.faturasPorCartao,
        unidade: ["cartão", "cartões"],
      },
    ] as Grupo[]
  ).filter((g) => g.valor > 0);

  const grupoAberto = grupos.find((g) => g.chave === aberto) ?? null;
  const dinheiro = (g: Grupo, v: number) => formatDinheiro(g.sinal * v, { positivo: g.sinal > 0 });

  return (
    <Surface as="section" className={className} data-tour={dataTour}>
      <SurfaceHeader titulo={`Até ${nomeFim}`} descricao="O saldo de hoje e o que ainda entra e sai da conta neste mês." />
      <dl className="text-[15px] md:text-sm">
        <div className="flex items-center justify-between gap-4 min-h-[44px] md:min-h-[36px]">
          <dt className="text-fg-2">Saldo hoje</dt>
          {/* Alinha com os valores tocáveis, que têm o ícone de abrir. */}
          <dd className="valor text-fg pr-6">{formatDinheiro(previsao.saldoHoje)}</dd>
        </div>
        {grupos.map((g) => (
          <div key={g.chave} className="flex items-center justify-between gap-4 min-h-[44px] md:min-h-[36px]">
            <dt className="text-fg-2">{g.rotulo}</dt>
            <dd>
              <button
                type="button"
                onClick={() => setAberto(g.chave)}
                aria-label={`${g.rotulo}: ${dinheiro(g, g.valor)}. Ver detalhes`}
                className="group inline-flex items-center gap-1 -mr-1 pl-2 pr-1 min-h-[44px] md:min-h-[32px] rounded-sm text-fg hover:bg-surface-2 transition-colors"
              >
                <span className="valor">{dinheiro(g, g.valor)}</span>
                <ChevronRight className="w-4 h-4 text-fg-3 group-hover:text-fg transition-colors" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </dd>
          </div>
        ))}
        <div className="mt-2 pt-3 border-t border-line flex items-baseline justify-between gap-4">
          <dt className="text-fg">Previsto para {nomeFim}</dt>
          <dd className={`valor text-[20px] pr-6 ${previsao.fimDoMes < 0 ? "text-danger-ink" : "text-fg"}`}>{formatDinheiro(previsao.fimDoMes)}</dd>
        </div>
      </dl>
      {grupos.length === 0 && (
        <p className="mt-2 text-xs text-fg-3">Nada mais previsto para este mês: o saldo de hoje é o do fim do mês.</p>
      )}

      <PainelDetalhe
        aberto={!!grupoAberto}
        titulo={grupoAberto?.rotulo ?? ""}
        resumo={
          grupoAberto && (
            <>
              <span className="valor text-fg">{dinheiro(grupoAberto, grupoAberto.valor)}</span>
              {" · "}
              {grupoAberto.itens.length} {grupoAberto.itens.length === 1 ? grupoAberto.unidade[0] : grupoAberto.unidade[1]}
            </>
          )
        }
        onFechar={() => setAberto(null)}
      >
        {grupoAberto && (
          <>
            <p className="pt-4 text-xs text-fg-3">{grupoAberto.explica}</p>
            <ul className="mt-2 divide-y divide-line">
              {[...grupoAberto.itens]
                .sort((a, b) => (a.dia ?? "").localeCompare(b.dia ?? "") || b.valor - a.valor)
                .map((i, k) => (
                  <li key={k} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-[15px] md:text-sm text-fg break-words">{i.descricao}</span>
                      {(i.dia || i.detalhe) && (
                        <span className="block text-xs text-fg-2 mt-0.5 break-words">
                          {[i.dia && diaPorExtenso(i.dia), i.detalhe].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="valor shrink-0 text-[15px] md:text-sm text-fg">{dinheiro(grupoAberto, i.valor)}</span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </PainelDetalhe>
    </Surface>
  );
}
