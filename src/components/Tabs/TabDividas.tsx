import {
  Clock,
  CheckCircle,
  Check,
  User,
  History,
  MinusCircle,
  Trash2,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";
import { PageEmptyState } from "../ui/AsyncState";
import type { SaldoDevedor } from "../../types";
import { formatCurrency } from "../../utils/calculations";

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
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Card Total Dívidas */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800" data-tour="dividas-total-card">
        <p className={`text-sm mb-1 flex items-center gap-2 ${
          filtroStatusDivida === "pendentes" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        }`}>
          {filtroStatusDivida === "pendentes" ? (
            <Clock className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {filtroPessoaDivida
            ? filtroStatusDivida === "pendentes"
              ? `Em aberto de ${filtroPessoaDivida}`
              : `Quitado por ${filtroPessoaDivida}`
            : filtroStatusDivida === "pendentes"
            ? "Total em Aberto"
            : "Total Quitado"}
        </p>
        <p className={`font-display text-3xl font-extrabold tracking-tight tabular-nums ${
          filtroStatusDivida === "pendentes" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        }`}>
          {formatCurrency(
            filtroStatusDivida === "pendentes"
              ? totalDividasPendentes
              : totalDividasQuitadas
          )}
        </p>
        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          {dividasFiltradas.length} dívida(s){" "}
          {filtroStatusDivida === "pendentes" ? "ativa(s)" : "quitada(s)"}
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

      {/* Filtro por Status */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800" data-tour="dividas-filtro-status">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Status:</p>
        <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-xl">
          <button
            onClick={() => {
              setFiltroStatusDivida("pendentes");
              setFiltroPessoaDivida("");
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              filtroStatusDivida === "pendentes"
                ? "bg-emerald-600 text-white"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pendentes
            {totalPendentes > 0 && (
              <span
                className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-full ${
                  filtroStatusDivida === "pendentes"
                    ? "bg-white/25 text-white"
                    : "bg-zinc-200 dark:bg-white/[0.07] text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {totalPendentes}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setFiltroStatusDivida("pagos");
              setFiltroPessoaDivida("");
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              filtroStatusDivida === "pagos"
                ? "bg-emerald-600 text-white"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Pagos
            {totalPagos > 0 && (
              <span
                className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-full ${
                  filtroStatusDivida === "pagos"
                    ? "bg-white/25 text-white"
                    : "bg-zinc-200 dark:bg-white/[0.07] text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {totalPagos}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filtro por Pessoa */}
      {pessoasComDividas.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800" data-tour="dividas-filtro-pessoa">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Filtrar por devedor:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroPessoaDivida("")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroPessoaDivida === ""
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
              }`}
            >
              Todos
            </button>
            {pessoasComDividas.map((pessoa) => {
              // Calcular valor baseado no status atual
              const dividasPessoa = saldosDevedores.filter(
                (d) => d.pessoa === pessoa
              );
              let valorExibir: number;

              if (filtroStatusDivida === "pendentes") {
                // Soma do valor atual (ainda devendo)
                valorExibir = dividasPessoa
                  .filter((d) => d.valor_atual > 0)
                  .reduce((acc, d) => acc + d.valor_atual, 0);
              } else {
                // Soma do valor original das dívidas quitadas (total que pagou)
                valorExibir = dividasPessoa
                  .filter((d) => d.valor_atual === 0)
                  .reduce((acc, d) => acc + d.valor_original, 0);
              }

              // Não mostrar pessoa se não tem dívidas nesse status
              const temDividasNoStatus =
                filtroStatusDivida === "pendentes"
                  ? dividasPessoa.some((d) => d.valor_atual > 0)
                  : dividasPessoa.some((d) => d.valor_atual === 0);

              if (!temDividasNoStatus) return null;

              return (
                <button
                  key={pessoa}
                  onClick={() => setFiltroPessoaDivida(pessoa)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filtroPessoaDivida === pessoa
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                  }`}
                >
                  <User className="w-3 h-3" />
                  {pessoa}
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      filtroPessoaDivida === pessoa
                        ? "text-white/70"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    ({formatCurrency(valorExibir)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Dívidas */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden border border-zinc-200 dark:border-zinc-800" data-tour="dividas-lista">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            {filtroStatusDivida === "pendentes"
              ? "Cobranças em Aberto"
              : "Cobranças Quitadas"}
            {filtroPessoaDivida && (
              <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                — {filtroPessoaDivida}
              </span>
            )}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {filtroStatusDivida === "pendentes"
              ? "Valores pendentes que estão sendo pagos aos poucos"
              : "Valores que já foram totalmente pagos"}
          </p>
        </div>

        {dividasFiltradas.length === 0 ? (
            <div className="p-4">
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
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {dividasFiltradas.map((divida) => (
              <li key={divida.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.09]">
                        <User className="w-3 h-3" />
                        {divida.pessoa}
                      </span>
                      {divida.valor_atual === 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          <Check className="w-3 h-3" />
                          Quitado
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{divida.descricao}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                        Original: {formatCurrency(divida.valor_original)}
                      </span>
                      <span className="font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                        Criado em:{" "}
                        {format(new Date(divida.data_criacao), "dd/MM/yyyy")}
                      </span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mt-2">
                      <div className="flex justify-between font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        <span>
                          Pago:{" "}
                          {formatCurrency(
                            divida.valor_original - divida.valor_atual
                          )}
                        </span>
                        <span>
                          {Math.round(
                            ((divida.valor_original - divida.valor_atual) /
                              divida.valor_original) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${
                              ((divida.valor_original - divida.valor_atual) /
                                divida.valor_original) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Histórico de pagamentos */}
                    {divida.historico.length > 0 && (
                      <details className="mt-3">
                        <summary className="font-mono text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300">
                          Ver histórico ({divida.historico.length} pagamento(s))
                        </summary>
                        <ul className="mt-2 space-y-1.5 pl-2 border-l-2 border-zinc-200 dark:border-zinc-800">
                          {divida.historico.map((pag) => (
                            <li
                              key={pag.id}
                              className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                  -{formatCurrency(pag.valor)}
                                </span>
                                {" em "}
                                {format(new Date(pag.data), "dd/MM/yyyy")}
                                {pag.observacao && (
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {" "}
                                    • {pag.observacao}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  handleDesfazerPagamento(
                                    divida.id,
                                    pag.id,
                                    pag.valor
                                  )
                                }
                                className="p-1 text-zinc-400 hover:text-amber-600 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded transition-colors"
                                title="Desfazer pagamento"
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
                    <p
                      className={`font-mono tabular-nums text-xl font-bold ${
                        divida.valor_atual > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {formatCurrency(divida.valor_atual)}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">restante</p>

                    <div className="flex gap-1 mt-2 justify-end" data-tour="dividas-item-acoes">
                      {divida.valor_atual > 0 && (
                        <button
                          onClick={() =>
                            setShowPagamento(
                              showPagamento === divida.id ? null : divida.id
                            )
                          }
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                          title="Registrar pagamento"
                        >
                          <MinusCircle className="w-4 h-4" />
                          Pagamento
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDivida(divida.id)}
                        className="p-1.5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-colors"
                        title="Excluir dívida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modals de pagamento renderizados aqui via children */}
                {showPagamento === divida.id && children}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
