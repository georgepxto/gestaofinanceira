import {
  Clock,
  CheckCircle,
  User,
  History,
  MinusCircle,
  Trash2,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";
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
    <>
      {/* Card Total Dívidas */}
      <div
        className={`bg-gradient-to-br ${
          filtroStatusDivida === "pendentes"
            ? "from-orange-600 to-red-600"
            : "from-green-600 to-emerald-600"
        } rounded-xl p-4 text-white shadow-lg`}
      >
        <p className="text-sm text-white/80 mb-1 flex items-center gap-2">
          {filtroStatusDivida === "pendentes" ? (
            <Clock className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {filtroPessoaDivida
            ? filtroStatusDivida === "pendentes"
              ? `Dívidas de ${filtroPessoaDivida}`
              : `Quitado por ${filtroPessoaDivida}`
            : filtroStatusDivida === "pendentes"
            ? "Total de Dívidas Pendentes"
            : "Total Quitado"}
        </p>
        <p className="text-3xl font-bold">
          {formatCurrency(
            filtroStatusDivida === "pendentes"
              ? totalDividasPendentes
              : totalDividasQuitadas
          )}
        </p>
        <p className="text-xs text-white/70 mt-2">
          {dividasFiltradas.length} dívida(s){" "}
          {filtroStatusDivida === "pendentes" ? "ativa(s)" : "quitada(s)"}
          {filtroPessoaDivida && (
            <button
              onClick={() => setFiltroPessoaDivida("")}
              className="ml-2 underline hover:text-white"
            >
              Ver todos
            </button>
          )}
        </p>
      </div>

      {/* Filtro por Status */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <p className="text-sm text-gray-400 mb-2">Status:</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFiltroStatusDivida("pendentes");
              setFiltroPessoaDivida("");
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              filtroStatusDivida === "pendentes"
                ? "bg-orange-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pendentes
            {totalPendentes > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filtroStatusDivida === "pendentes"
                    ? "bg-orange-700"
                    : "bg-gray-600"
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
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              filtroStatusDivida === "pagos"
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Pagos
            {totalPagos > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filtroStatusDivida === "pagos"
                    ? "bg-green-700"
                    : "bg-gray-600"
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
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Filtrar por pessoa:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroPessoaDivida("")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroPessoaDivida === ""
                  ? filtroStatusDivida === "pendentes"
                    ? "bg-orange-600 text-white"
                    : "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
                      ? filtroStatusDivida === "pendentes"
                        ? "bg-orange-600 text-white"
                        : "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <User className="w-3 h-3" />
                  {pessoa}
                  <span
                    className={`text-xs ${
                      filtroPessoaDivida === pessoa
                        ? filtroStatusDivida === "pendentes"
                          ? "text-orange-200"
                          : "text-green-200"
                        : "text-gray-400"
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
      <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-orange-400" />
            Saldos Devedores
            {filtroPessoaDivida && (
              <span className="text-sm font-normal text-gray-400">
                — {filtroPessoaDivida}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Dívidas antigas que estão sendo pagas aos poucos
          </p>
        </div>

        {dividasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>
              {filtroPessoaDivida
                ? `Nenhuma dívida para ${filtroPessoaDivida}`
                : "Nenhuma dívida pendente"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {filtroPessoaDivida ? (
                <button
                  onClick={() => setFiltroPessoaDivida("")}
                  className="text-orange-400 hover:underline"
                >
                  Ver todas as dívidas
                </button>
              ) : (
                'Clique em "Nova Dívida" para adicionar'
              )}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {dividasFiltradas.map((divida) => (
              <li key={divida.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-900/50 text-orange-300 border border-orange-700">
                        <User className="w-3 h-3" />
                        {divida.pessoa}
                      </span>
                      {divida.valor_atual === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                          ✓ Quitado
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-white">{divida.descricao}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span>
                        Original: {formatCurrency(divida.valor_original)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Criado em:{" "}
                        {format(new Date(divida.data_criacao), "dd/MM/yyyy")}
                      </span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
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
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
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
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                          Ver histórico ({divida.historico.length} pagamento(s))
                        </summary>
                        <ul className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-700">
                          {divida.historico.map((pag) => (
                            <li
                              key={pag.id}
                              className="text-xs text-gray-400 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="text-green-400">
                                  -{formatCurrency(pag.valor)}
                                </span>
                                {" em "}
                                {format(new Date(pag.data), "dd/MM/yyyy")}
                                {pag.observacao && (
                                  <span className="text-gray-500">
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
                                className="p-1 text-gray-500 hover:text-orange-400 hover:bg-gray-700 rounded transition-colors"
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
                      className={`text-xl font-bold ${
                        divida.valor_atual > 0
                          ? "text-orange-400"
                          : "text-green-400"
                      }`}
                    >
                      {formatCurrency(divida.valor_atual)}
                    </p>
                    <p className="text-xs text-gray-500">restante</p>

                    <div className="flex gap-1 mt-2 justify-end">
                      {divida.valor_atual > 0 && (
                        <button
                          onClick={() =>
                            setShowPagamento(
                              showPagamento === divida.id ? null : divida.id
                            )
                          }
                          className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          title="Registrar pagamento"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDivida(divida.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
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
    </>
  );
}
