import {
  Clock,
  CheckCircle,
  Check,
  MinusCircle,
  Trash2,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";
import { PageEmptyState } from "../ui/AsyncState";
import { Valor } from "../ui/Valor";
import type { SaldoDevedor } from "../../types";
import { formatCurrency } from "../../utils/calculations";
import { Rotulo } from "../ui/Rotulo";
import { Card } from "../ui/Card";

interface TabDividasProps {
  saldosDevedores: SaldoDevedor[];
  filtroStatusDivida: "pendentes" | "pagos";
  setFiltroStatusDivida: (status: "pendentes" | "pagos") => void;
  filtroPessoaDivida: string;
  setFiltroPessoaDivida: (pessoa: string) => void;
  dividasFiltradas: SaldoDevedor[];
  totalDividasPendentes: number;
  totalDividasQuitadas: number;
  totalPendentes: number;
  totalPagos: number;
  pessoasComDividas: string[];
  showPagamento: string | null;
  setShowPagamento: (id: string | null) => void;
  handleDeleteDivida: (id: string) => void;
  handleDesfazerPagamento: (
    dividaId: string,
    pagamentoId: string,
    valor: number
  ) => void;
  children?: React.ReactNode;
}

/** CHIP do filtro por devedor. */
const chipClasse = (ativo: boolean) =>
  `px-3.5 py-2 rounded-xl text-[13px] transition-colors inline-flex items-center gap-2 ${
    ativo
      ? "bg-emerald-600 text-white font-semibold"
      : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
  }`;

export function TabDividas({
  saldosDevedores,
  filtroStatusDivida,
  setFiltroStatusDivida,
  filtroPessoaDivida,
  setFiltroPessoaDivida,
  dividasFiltradas,
  totalDividasPendentes,
  totalDividasQuitadas,
  totalPendentes,
  totalPagos,
  pessoasComDividas,
  showPagamento,
  setShowPagamento,
  handleDeleteDivida,
  handleDesfazerPagamento,
  children,
}: TabDividasProps) {
  const pendentes = filtroStatusDivida === "pendentes";

  return (
    <div className="space-y-5">
      {/* Card status: total à esquerda, SEGMENTADO à direita */}
      <Card padding="resumo" className="flex items-end justify-between gap-6 flex-wrap" data-tour="dividas-total-card">
        <div className="min-w-0">
          <Rotulo tom={pendentes ? "alerta" : "acento"}>
            {filtroPessoaDivida
              ? pendentes
                ? `Em aberto de ${filtroPessoaDivida}`
                : `Quitado por ${filtroPessoaDivida}`
              : pendentes
              ? "Total em aberto"
              : "Total quitado"}
          </Rotulo>
          <Valor porte="heroi" className={`block mt-2 ${
            pendentes ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
          }`}>
            {formatCurrency(pendentes ? totalDividasPendentes : totalDividasQuitadas)}
          </Valor>
          <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
            {dividasFiltradas.length} {dividasFiltradas.length === 1 ? "cobrança" : "cobranças"}{" "}
            {pendentes ? (dividasFiltradas.length === 1 ? "ativa" : "ativas") : (dividasFiltradas.length === 1 ? "quitada" : "quitadas")}
            {filtroPessoaDivida && (
              <button
                onClick={() => setFiltroPessoaDivida("")}
                className="ml-2 underline text-emerald-600 hover:text-emerald-700"
              >
                Ver todos
              </button>
            )}
          </p>
        </div>

        {/* SEGMENTADO Pendentes/Pagos */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-xl" data-tour="dividas-filtro-status">
          <button
            onClick={() => {
              setFiltroStatusDivida("pendentes");
              setFiltroPessoaDivida("");
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              pendentes
                ? "bg-emerald-600 text-white font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
            }`}
          >
            <Clock className="w-[15px] h-[15px]" />
            Pendentes
            {totalPendentes > 0 && (
              <span className={`font-mono valor text-xs px-1.5 py-0.5 rounded-full ${
                pendentes ? "bg-white/25 text-white" : "bg-zinc-200 dark:bg-white/[0.07] text-zinc-600 dark:text-zinc-300"
              }`}>
                {totalPendentes}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setFiltroStatusDivida("pagos");
              setFiltroPessoaDivida("");
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              !pendentes
                ? "bg-emerald-600 text-white font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
            }`}
          >
            <CheckCircle className="w-[15px] h-[15px]" />
            Pagos
            {totalPagos > 0 && (
              <span className={`font-mono valor text-xs px-1.5 py-0.5 rounded-full ${
                !pendentes ? "bg-white/25 text-white" : "bg-zinc-200 dark:bg-white/[0.07] text-zinc-600 dark:text-zinc-300"
              }`}>
                {totalPagos}
              </span>
            )}
          </button>
        </div>
      </Card>

      {/* Filtro por devedor */}
      {pessoasComDividas.length > 0 && (
        <div data-tour="dividas-filtro-pessoa">
          <Rotulo className="mb-2">Devedor</Rotulo>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltroPessoaDivida("")} className={chipClasse(filtroPessoaDivida === "")}>
              Todos
            </button>
            {pessoasComDividas.map((pessoa) => {
              const dividasPessoa = saldosDevedores.filter((d) => d.pessoa === pessoa);
              const valorExibir = pendentes
                ? dividasPessoa.filter((d) => d.valor_atual > 0).reduce((acc, d) => acc + d.valor_atual, 0)
                : dividasPessoa.filter((d) => d.valor_atual === 0).reduce((acc, d) => acc + d.valor_original, 0);

              const temDividasNoStatus = pendentes
                ? dividasPessoa.some((d) => d.valor_atual > 0)
                : dividasPessoa.some((d) => d.valor_atual === 0);

              if (!temDividasNoStatus) return null;

              return (
                <button
                  key={pessoa}
                  onClick={() => setFiltroPessoaDivida(pessoa)}
                  className={chipClasse(filtroPessoaDivida === pessoa)}
                >
                  {pessoa}
                  <span className={`font-mono valor text-[11px] ${
                    filtroPessoaDivida === pessoa ? "text-white/70" : "text-zinc-500 dark:text-zinc-400"
                  }`}>
                    {formatCurrency(valorExibir)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Card lista */}
      <Card data-tour="dividas-lista">
        <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          {pendentes ? "Cobranças em aberto" : "Cobranças quitadas"}
          {filtroPessoaDivida && (
            <span className="text-sm font-normal font-sans text-zinc-500 dark:text-zinc-400"> — {filtroPessoaDivida}</span>
          )}
        </h2>

        {dividasFiltradas.length === 0 ? (
          <div>
            <PageEmptyState
              compact
              title={
                filtroPessoaDivida
                  ? `Nenhuma cobrança para ${filtroPessoaDivida}`
                  : "Nenhuma cobrança pendente"
              }
              description={
                filtroPessoaDivida
                  ? "Limpe o filtro por pessoa para ver todas as cobranças do período."
                  : "Adicione uma nova cobrança para começar a acompanhar valores em aberto."
              }
            />
            {filtroPessoaDivida ? (
              <div className="text-center mt-2">
                <button
                  onClick={() => setFiltroPessoaDivida("")}
                  className="text-emerald-600 hover:underline text-sm"
                >
                  Limpar filtro
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {dividasFiltradas.map((divida) => {
              const quitada = divida.valor_atual === 0;
              const pago = divida.valor_original - divida.valor_atual;
              const pctPago = divida.valor_original > 0 ? (pago / divida.valor_original) * 100 : 0;
              const ultimoPagamento = divida.historico.length > 0 ? divida.historico[divida.historico.length - 1] : null;
              const dataQuitacao = quitada && ultimoPagamento ? ultimoPagamento.data : null;

              return (
                <li key={divida.id} className="bg-app-row dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400">
                          {divida.pessoa}
                        </span>
                        {quitada && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-[11px] h-[11px]" />
                            Quitado
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{divida.descricao}</p>
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        original {formatCurrency(divida.valor_original)} · criado {format(new Date(divida.data_criacao), "dd/MM")}
                        {dataQuitacao ? ` · quitado ${format(new Date(dataQuitacao), "dd/MM")}` : ""}
                      </p>

                      {/* Progresso */}
                      <div className="mt-2.5 max-w-[340px]">
                        <div className="h-2 bg-zinc-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(pctPago, 100)}%` }}
                          />
                        </div>
                        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          pago {formatCurrency(pago)} / {Math.round(pctPago)}%
                        </p>
                      </div>

                      {/* Histórico de pagamentos */}
                      {divida.historico.length > 0 && (
                        <details className="mt-2.5">
                          <summary className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                            ver histórico ({divida.historico.length} {divida.historico.length === 1 ? "pagamento" : "pagamentos"})
                          </summary>
                          <ul className="mt-2 space-y-1.5 pl-3 border-l-2 border-zinc-100 dark:border-zinc-800">
                            {divida.historico.map((pag) => (
                              <li
                                key={pag.id}
                                className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between gap-2"
                              >
                                {/* Só a observação trunca — valor e data ficam inteiros. */}
                                <span className="min-w-0 flex items-baseline gap-1">
                                  <span className="valor shrink-0">−{formatCurrency(pag.valor)}</span>
                                  <span className="shrink-0">· {format(new Date(pag.data), "dd/MM")}</span>
                                  {pag.observacao && <span className="truncate">· {pag.observacao}</span>}
                                </span>
                                <button
                                  onClick={() => handleDesfazerPagamento(divida.id, pag.id, pag.valor)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors flex-shrink-0"
                                  title="Desfazer pagamento"
                                  aria-label={`Desfazer pagamento de ${formatCurrency(pag.valor)}`}
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`font-mono valor text-2xl font-semibold whitespace-nowrap ${
                        quitada ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                      }`}>
                        {formatCurrency(divida.valor_atual)}
                      </p>
                      <Rotulo>restante</Rotulo>

                      <div className="flex gap-1 mt-2.5 justify-end items-center" data-tour="dividas-item-acoes">
                        {!quitada && (
                          <button
                            onClick={() => setShowPagamento(showPagamento === divida.id ? null : divida.id)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            title="Registrar pagamento"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                            Pagamento
                          </button>
                        )}
                        {quitada && ultimoPagamento && (
                          <button
                            onClick={() => handleDesfazerPagamento(divida.id, ultimoPagamento.id, ultimoPagamento.valor)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-amber-50 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors"
                            title="Desfazer último pagamento"
                            aria-label="Desfazer último pagamento"
                          >
                            <Undo2 className="w-[15px] h-[15px]" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDivida(divida.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                          title="Excluir dívida"
                          aria-label={`Excluir cobrança ${divida.descricao}`}
                        >
                          <Trash2 className="w-[15px] h-[15px]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modals de pagamento renderizados aqui via children */}
                  {showPagamento === divida.id && children}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
