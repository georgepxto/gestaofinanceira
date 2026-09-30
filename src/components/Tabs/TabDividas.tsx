import { Trash2, Undo2, Banknote, Inbox } from "lucide-react";
import { format } from "date-fns";
import type { SaldoDevedor } from "../../types";
import { formatCurrency } from "../../utils/calculations";
import { formatDinheiro, formatPercent } from "../../utils/dinheiro";
import { BalanceHero } from "../ui/BalanceHero";
import { SegmentedControl } from "../ui/SegmentedControl";
import { FilterChips } from "../ui/FilterChips";
import { Surface, SurfaceHeader } from "../ui/Surface";
import { ListGroup, ListRow, type Acao } from "../ui/ListRow";
import { ProgressBar } from "../ui/ProgressBar";
import { Pill } from "../ui/Pill";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

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
  handleDesfazerPagamento: (dividaId: string, pagamentoId: string, valor: number) => void;
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
  const pendentes = filtroStatusDivida === "pendentes";

  const trocarStatus = (status: "pendentes" | "pagos") => {
    setFiltroStatusDivida(status);
    setFiltroPessoaDivida("");
  };

  // Só as pessoas que têm cobrança no status escolhido, com o valor ao lado.
  const filtrosPessoa = pessoasComDividas
    .map((pessoa) => {
      const dividasPessoa = saldosDevedores.filter((d) => d.pessoa === pessoa);
      const temNoStatus = pendentes ? dividasPessoa.some((d) => d.valor_atual > 0) : dividasPessoa.some((d) => d.valor_atual === 0);
      const valor = pendentes
        ? dividasPessoa.filter((d) => d.valor_atual > 0).reduce((acc, d) => acc + d.valor_atual, 0)
        : dividasPessoa.filter((d) => d.valor_atual === 0).reduce((acc, d) => acc + d.valor_original, 0);
      return temNoStatus ? { valor: pessoa, rotulo: <>{pessoa} <span className="valor text-xs text-fg-3">{formatCurrency(valor)}</span></> } : null;
    })
    .filter((f): f is { valor: string; rotulo: JSX.Element } => f !== null);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Total do status escolhido */}
      <div data-tour="dividas-total-card">
        <BalanceHero
          rotulo={
            filtroPessoaDivida
              ? pendentes
                ? `Em aberto de ${filtroPessoaDivida}`
                : `Quitado por ${filtroPessoaDivida}`
              : pendentes
                ? "Total em aberto"
                : "Total quitado"
          }
          aoLado={
            <span data-tour="dividas-filtro-status">
              <SegmentedControl
                rotulo="Situação das cobranças"
                tamanho="sm"
                segmentos={[
                  {
                    chave: "pendentes",
                    rotulo: <>Em aberto<span className="valor text-fg-3 ml-1.5">{totalPendentes}</span></>,
                    ativo: pendentes,
                    onClick: () => trocarStatus("pendentes"),
                  },
                  {
                    chave: "pagos",
                    rotulo: <>Quitadas<span className="valor text-fg-3 ml-1.5">{totalPagos}</span></>,
                    ativo: !pendentes,
                    onClick: () => trocarStatus("pagos"),
                  },
                ]}
              />
            </span>
          }
          valor={pendentes ? totalDividasPendentes : totalDividasQuitadas}
          perigoSeNegativo={false}
          contexto={
            <>
              {dividasFiltradas.length} {dividasFiltradas.length === 1 ? "cobrança" : "cobranças"}{" "}
              {pendentes ? (dividasFiltradas.length === 1 ? "ativa" : "ativas") : dividasFiltradas.length === 1 ? "quitada" : "quitadas"}
            </>
          }
        />
      </div>

      {/* Filtro por devedor */}
      {filtrosPessoa.length > 0 && (
        <div data-tour="dividas-filtro-pessoa">
          <FilterChips
            rotulo="Filtrar por devedor"
            filtros={[{ valor: "", rotulo: "Todos" }, ...filtrosPessoa]}
            ativo={filtroPessoaDivida}
            onChange={setFiltroPessoaDivida}
          />
        </div>
      )}

      {/* Lista de cobranças */}
      <Surface as="section" data-tour="dividas-lista">
        <SurfaceHeader
          titulo={pendentes ? "Cobranças em aberto" : "Cobranças quitadas"}
          descricao={filtroPessoaDivida || undefined}
          className="mb-1"
        />

        {dividasFiltradas.length === 0 ? (
          <EmptyState
            Icone={Inbox}
            frase={
              filtroPessoaDivida
                ? `Nenhuma cobrança para ${filtroPessoaDivida}.`
                : pendentes
                  ? "Nenhuma cobrança em aberto."
                  : "Nenhuma cobrança quitada."
            }
            acao={
              filtroPessoaDivida ? (
                <Button variante="fantasma" onClick={() => setFiltroPessoaDivida("")}>
                  Limpar filtro
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ListGroup>
            {dividasFiltradas.map((divida) => {
              const quitada = divida.valor_atual === 0;
              const pago = divida.valor_original - divida.valor_atual;
              const fracaoPaga = divida.valor_original > 0 ? pago / divida.valor_original : 0;
              const ultimoPagamento = divida.historico.length > 0 ? divida.historico[divida.historico.length - 1] : null;
              const dataQuitacao = quitada && ultimoPagamento ? ultimoPagamento.data : null;

              const acoes: Acao[] = [
                ...(!quitada
                  ? [
                      {
                        rotulo: "Registrar pagamento",
                        icone: <Banknote className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => setShowPagamento(divida.id),
                      },
                    ]
                  : []),
                ...(ultimoPagamento
                  ? [
                      {
                        rotulo: "Desfazer último pagamento",
                        icone: <Undo2 className="w-4 h-4" strokeWidth={1.5} />,
                        onClick: () => handleDesfazerPagamento(divida.id, ultimoPagamento.id, ultimoPagamento.valor),
                      },
                    ]
                  : []),
                {
                  rotulo: "Excluir",
                  icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                  onClick: () => handleDeleteDivida(divida.id),
                  tom: "perigo",
                },
              ];

              return (
                <ListRow
                  key={divida.id}
                  dataTour="dividas-item-acoes"
                  iconeCru={<Avatar nome={divida.pessoa} />}
                  titulo={divida.descricao}
                  meta={
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span>
                        {divida.pessoa} · criada {format(new Date(divida.data_criacao), "dd/MM")}
                        {dataQuitacao ? ` · quitada ${format(new Date(dataQuitacao), "dd/MM")}` : ""}
                      </span>
                      {quitada && <Pill>quitada</Pill>}
                    </span>
                  }
                  valor={formatCurrency(divida.valor_atual)}
                  subvalor={`de ${formatCurrency(divida.valor_original)}`}
                  pago={quitada}
                  acoes={acoes}
                  rodape={
                    <div className="pl-12 space-y-2">
                      <ProgressBar
                        progresso
                        valor={pago}
                        maximo={divida.valor_original}
                        rotulo={`${divida.descricao}: ${formatPercent(fracaoPaga)} pago`}
                      />
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-xs text-fg-2">
                          pago <span className="valor">{formatCurrency(pago)}</span> · {formatPercent(fracaoPaga)}
                        </p>
                        {!quitada && (
                          <Button tamanho="sm" onClick={() => setShowPagamento(showPagamento === divida.id ? null : divida.id)}>
                            Registrar pagamento
                          </Button>
                        )}
                      </div>

                      {/* Histórico de pagamentos */}
                      {divida.historico.length > 0 && (
                        <details className="group">
                          <summary className="text-xs text-fg-3 hover:text-fg-2 cursor-pointer select-none w-fit">
                            Histórico · {divida.historico.length} {divida.historico.length === 1 ? "pagamento" : "pagamentos"}
                          </summary>
                          <ul className="mt-2 divide-y divide-line">
                            {divida.historico.map((pag) => (
                              <li key={pag.id} className="flex items-center justify-between gap-3 py-1.5 text-xs text-fg-2">
                                <span className="min-w-0 break-words">
                                  <span className="valor text-fg">{formatDinheiro(-pag.valor)}</span> · {format(new Date(pag.data), "dd/MM")}
                                  {pag.observacao ? ` · ${pag.observacao}` : ""}
                                </span>
                                <button
                                  onClick={() => handleDesfazerPagamento(divida.id, pag.id, pag.valor)}
                                  className="w-8 h-8 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
                                  title="Desfazer pagamento"
                                  aria-label={`Desfazer pagamento de ${formatCurrency(pag.valor)}`}
                                >
                                  <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {/* Modal de pagamento repassado pela tela, quando houver */}
                      {showPagamento === divida.id && children}
                    </div>
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </Surface>
    </div>
  );
}
