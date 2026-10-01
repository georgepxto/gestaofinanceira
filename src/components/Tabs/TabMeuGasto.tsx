import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle,
  Repeat,
  Users,
  Pencil,
  Trash2,
  MinusCircle,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Wallet,
  Receipt,
} from "lucide-react";
import { format, addMonths, isSameMonth, isBefore, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SuspensaoModal } from "../modals/SuspensaoModal";
import type { MeuGasto, CartaoCredito } from "../../types";
import { formatCurrency, getMesFaturaCartao } from "../../utils/calculations";
import { formatDinheiro, rotuloDia } from "../../utils/dinheiro";
import { KpiStrip, Kpi } from "../ui/KpiStrip";
import { Valor } from "../ui/Valor";
import { Surface, SurfaceHeader } from "../ui/Surface";
import { ListGroup, ListRow, type Acao } from "../ui/ListRow";
import { FilterChips, ChipDia } from "../ui/FilterChips";
import { EmptyState } from "../ui/EmptyState";
import { Pill, type TomPill } from "../ui/Pill";
import { MenuAcoes } from "../ui/MenuAcoes";

function getPessoasDivididas(gasto: MeuGasto): string[] {
  if (Array.isArray(gasto.dividido_com_pessoas) && gasto.dividido_com_pessoas.length > 0) {
    return gasto.dividido_com_pessoas;
  }

  if (!gasto.dividido_com) {
    return [];
  }

  const valor = gasto.dividido_com.trim();
  if (valor.startsWith("[")) {
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        return parsed.filter((pessoa): pessoa is string => typeof pessoa === "string" && pessoa.trim().length > 0);
      }
    } catch {
      // mantém fallback abaixo
    }
  }

  return [gasto.dividido_com];
}

function formatarDivididoCom(gasto: MeuGasto): string {
  return getPessoasDivididas(gasto).join(", ");
}

const FILTROS = [
  { valor: "", rotulo: "Todos" },
  { valor: "pessoal", rotulo: "Pessoal" },
  { valor: "dividido", rotulo: "Dividido" },
  { valor: "fixo", rotulo: "Fixo" },
];

/** "2026-09-29" como data local — `new Date(string)` leria em UTC e voltaria um dia. */
const dataLocal = (iso: string) => {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
};

/**
 * Estado do fixo no mês que está na tela. Só apresentação: lê o que o registro
 * já guarda (pago, pausa, ativo) e o dia de vencimento.
 */
function estadoDoFixo(gasto: MeuGasto, mes: Date, suspenso: boolean): { tom: TomPill; rotulo: string } {
  if (gasto.ativo === false) return { tom: "neutro", rotulo: "inativo" };
  if (suspenso) return { tom: "neutro", rotulo: "pausado" };

  // O fixo acontece sozinho no dia (é assim que ele entra no saldo e na
  // fatura), então o estado vem da data, não de um "pago" marcado uma vez só.
  const feito = gasto.tipo === "credito" ? "na fatura" : "pago";
  const hoje = new Date();
  if (isBefore(startOfMonth(mes), startOfMonth(hoje))) return { tom: "neutro", rotulo: feito };
  if (!isSameMonth(mes, hoje)) return { tom: "neutro", rotulo: "a vencer" };

  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const falta = Math.min(gasto.dia_vencimento || 1, ultimoDia) - hoje.getDate();
  if (falta < 0) return { tom: "neutro", rotulo: feito };
  if (falta === 0) return { tom: "atencao", rotulo: "vence hoje" };
  if (falta <= 3) return { tom: "atencao", rotulo: `vence em ${falta} ${falta === 1 ? "dia" : "dias"}` };
  return { tom: "neutro", rotulo: "a vencer" };
}

interface TabMeuGastoProps {
  mesVisualizacao: Date;
  totalMeusGastosCredito: number;
  totalMeusGastosDebito: number;
  totalMeusGastosPagos: number;
  totalGastosFixos: number;
  filtroCategoriaMeuGasto: string;
  setFiltroCategoriaMeuGasto: (categoria: string) => void;
  filtroDiaMeuGasto: string;
  setFiltroDiaMeuGasto: (dia: string) => void;
  gastosFixos: MeuGasto[];
  meusGastosDoMes: MeuGasto[];
  handleEditMeuGasto: (gasto: MeuGasto) => void;
  handleToggleGastoFixo: (id: string) => void;
  handleDeleteMeuGasto: (id: string) => void;
  handleTogglePagoMeuGasto: (id: string) => void;
  handleReativarGastoFixo: (id: string, mesRef: Date) => void;
  handleSuspenderMultiplosMeses: (id: string, meses: string[], mesRef: Date) => Promise<void>;
  cartoes: CartaoCredito[];
}

export function TabMeuGasto({
  mesVisualizacao,
  totalMeusGastosCredito,
  totalMeusGastosDebito,
  totalMeusGastosPagos,
  totalGastosFixos,
  filtroCategoriaMeuGasto,
  setFiltroCategoriaMeuGasto,
  filtroDiaMeuGasto,
  setFiltroDiaMeuGasto,
  gastosFixos,
  meusGastosDoMes,
  handleEditMeuGasto,
  handleToggleGastoFixo,
  handleDeleteMeuGasto,
  handleTogglePagoMeuGasto,
  handleReativarGastoFixo,
  handleSuspenderMultiplosMeses,
  cartoes,
}: TabMeuGastoProps) {
  const [modalSuspensao, setModalSuspensao] = useState<{ show: boolean; id: string; nome: string } | null>(null);
  const mesChave = format(mesVisualizacao, "yyyy-MM");

  const handleClickSuspender = (gasto: MeuGasto, isSuspenso: boolean) => {
    if (isSuspenso) {
      handleReativarGastoFixo(gasto.id, mesVisualizacao);
    } else {
      setModalSuspensao({ show: true, id: gasto.id, nome: gasto.descricao });
    }
  };

  const getMesReativacao = (gasto: MeuGasto) => {
    if (!gasto.meses_suspensos || gasto.meses_suspensos.length === 0) return null;
    if (!gasto.meses_suspensos.includes(mesChave)) return null;

    let checkDate = mesVisualizacao;
    while (gasto.meses_suspensos.includes(format(checkDate, "yyyy-MM"))) {
      checkDate = addMonths(checkDate, 1);
    }
    return format(checkDate, "MM/yyyy");
  };

  const gastosFixosAtivos = gastosFixos.filter((g) => g.ativo !== false).length;

  const gastosFiltrados = meusGastosDoMes.filter(
    (g) =>
      (filtroCategoriaMeuGasto === "" || g.categoria === filtroCategoriaMeuGasto) &&
      (filtroDiaMeuGasto === "" || g.data === filtroDiaMeuGasto)
  );

  // Agrupados por dia, do mais recente para o mais antigo.
  const porDia = useMemo(() => {
    const grupos: Record<string, MeuGasto[]> = {};
    gastosFiltrados.forEach((g) => {
      (grupos[g.data] ||= []).push(g);
    });
    return Object.keys(grupos)
      .sort((a, b) => b.localeCompare(a))
      .map((data) => ({ data, gastos: grupos[data] }));
  }, [gastosFiltrados]);

  // Item que apareceu depois da primeira pintura entra com animação.
  const idsVistos = useRef<Set<string> | null>(null);
  const idsAtuais = meusGastosDoMes.map((g) => g.id);
  const novos = idsVistos.current ? new Set(idsAtuais.filter((id) => !idsVistos.current!.has(id))) : new Set<string>();
  useEffect(() => {
    idsVistos.current = new Set(idsAtuais);
  });

  // Troca de mês não é "item novo": zera a memória.
  useEffect(() => {
    idsVistos.current = null;
  }, [mesChave]);

  const valorDaMinhaParte = (g: MeuGasto) => (!!g.dividido_com && g.minha_parte ? g.minha_parte : g.valor);

  const nomeDaFatura = (gasto: MeuGasto) => {
    if (gasto.tipo !== "credito" || !gasto.cartao_id) return "";
    const cartao = cartoes?.find((c) => c.id === gasto.cartao_id);
    const dataFatura =
      cartao && cartao.melhor_dia_compra
        ? getMesFaturaCartao(gasto.data, cartao.melhor_dia_compra, cartao.dia_vencimento)
        : dataLocal(gasto.data);
    return format(dataFatura, "MMMM", { locale: ptBR });
  };

  const diaSelecionado = filtroDiaMeuGasto ? parseInt(filtroDiaMeuGasto.substring(8, 10), 10) : null;

  const acoesDoFixo = (gasto: MeuGasto, isSuspenso: boolean): Acao[] => [
    {
      rotulo: isSuspenso ? "Reativar neste mês" : "Pausar",
      icone: isSuspenso ? <PlayCircle className="w-5 h-5" strokeWidth={1.5} /> : <PauseCircle className="w-5 h-5" strokeWidth={1.5} />,
      onClick: () => handleClickSuspender(gasto, isSuspenso),
    },
    {
      rotulo: "Editar",
      icone: <Pencil className="w-5 h-5" strokeWidth={1.5} />,
      onClick: () => handleEditMeuGasto(gasto),
    },
    {
      rotulo: gasto.ativo !== false ? "Desativar" : "Ativar",
      icone:
        gasto.ativo !== false ? <MinusCircle className="w-5 h-5" strokeWidth={1.5} /> : <CheckCircle className="w-5 h-5" strokeWidth={1.5} />,
      onClick: () => handleToggleGastoFixo(gasto.id),
    },
    {
      rotulo: "Excluir",
      icone: <Trash2 className="w-5 h-5" strokeWidth={1.5} />,
      onClick: () => handleDeleteMeuGasto(gasto.id),
      tom: "perigo",
    },
  ];

  return (
    <>
      <KpiStrip data-tour="eu-resumo-cards">
        <Kpi rotulo="Crédito" data-tour="eu-card-credito" valor={<Valor porte="medio">{formatCurrency(totalMeusGastosCredito)}</Valor>} />
        <Kpi rotulo="Débito" data-tour="eu-card-debito" valor={<Valor porte="medio">{formatCurrency(totalMeusGastosDebito)}</Valor>} />
        <Kpi rotulo="Já pago" meta="débito e crédito quitado" data-tour="eu-card-pagos" valor={<Valor porte="medio">{formatCurrency(totalMeusGastosPagos)}</Valor>} />
        <Kpi rotulo="Fixos" data-tour="eu-card-fixos" valor={<Valor porte="medio">{formatCurrency(totalGastosFixos)}</Valor>} />
      </KpiStrip>

      <div data-tour="eu-filtro-categoria">
        <FilterChips
          rotulo="Filtrar por tipo"
          filtros={FILTROS}
          ativo={filtroCategoriaMeuGasto}
          onChange={setFiltroCategoriaMeuGasto}
          extra={
            <ChipDia
              valor={filtroDiaMeuGasto}
              onChange={setFiltroDiaMeuGasto}
              min={`${mesChave}-01`}
              max={`${mesChave}-31`}
              data-tour="eu-filtro-dia"
            />
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_340px] gap-6 items-start">
        {/* Os lançamentos são o conteúdo da tela: coluna larga no desktop,
            primeiro bloco no celular. */}
        <Surface as="section" className="min-w-0" data-tour="eu-lista-gastos">
          <SurfaceHeader
            titulo="Lançamentos do mês"
            className="mb-0"
            acao={
              <span className="tabular-nums text-xs text-fg-3">
                {gastosFiltrados.length} {gastosFiltrados.length === 1 ? "item" : "itens"}
              </span>
            }
          />

          {porDia.length === 0 ? (
            <EmptyState
              Icone={Receipt}
              frase={
                <>
                  Nenhum gasto
                  {filtroCategoriaMeuGasto ? ` do tipo ${FILTROS.find((f) => f.valor === filtroCategoriaMeuGasto)?.rotulo.toLowerCase()}` : ""}
                  {diaSelecionado ? ` no dia ${diaSelecionado}` : ` em ${format(mesVisualizacao, "MMMM", { locale: ptBR })}`}.
                </>
              }
            />
          ) : (
            porDia.map(({ data, gastos }) => (
              <ListGroup
                key={data}
                titulo={rotuloDia(dataLocal(data))}
                aoLado={formatDinheiro(-gastos.reduce((s, g) => s + valorDaMinhaParte(g), 0))}
              >
                {gastos.map((gasto) => {
                  const fatura = nomeDaFatura(gasto);
                  const isSuspenso = gasto.categoria === "fixo" && !!gasto.meses_suspensos?.includes(mesChave);
                  const pessoas = formatarDivididoCom(gasto);
                  const Icone =
                    gasto.categoria === "dividido"
                      ? Users
                      : gasto.categoria === "fixo"
                        ? Repeat
                        : gasto.tipo === "credito"
                          ? CreditCard
                          : Wallet;

                  const acoes: Acao[] = [
                    ...(gasto.categoria === "fixo"
                      ? [
                          {
                            rotulo: isSuspenso ? "Reativar neste mês" : "Pausar",
                            icone: isSuspenso ? <PlayCircle className="w-5 h-5" strokeWidth={1.5} /> : <PauseCircle className="w-5 h-5" strokeWidth={1.5} />,
                            onClick: () => handleClickSuspender(gasto, isSuspenso),
                          } as Acao,
                        ]
                      : []),
                    {
                      rotulo: "Editar",
                      icone: <Pencil className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleEditMeuGasto(gasto),
                    },
                    {
                      rotulo: "Excluir",
                      icone: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
                      onClick: () => handleDeleteMeuGasto(gasto.id),
                      tom: "perigo",
                    },
                  ];

                  return (
                    <ListRow
                      key={gasto.id}
                      dataTour="eu-item-acoes"
                      novo={novos.has(gasto.id)}
                      prefixo={
                        <button
                          type="button"
                          onClick={() => handleTogglePagoMeuGasto(gasto.id)}
                          aria-pressed={!!gasto.pago}
                          aria-label={gasto.pago ? `Desmarcar ${gasto.descricao} como pago` : `Marcar ${gasto.descricao} como pago`}
                          className="w-11 h-11 -ml-3 -mr-2 flex items-center justify-center shrink-0 rounded"
                        >
                          <span
                            className={`w-[18px] h-[18px] rounded-sm flex items-center justify-center transition-colors ${
                              gasto.pago ? "bg-surface-3 text-fg-2" : "border border-fg-3 hover:border-fg"
                            }`}
                          >
                            {gasto.pago && <Check className="w-3 h-3" strokeWidth={2.5} />}
                          </span>
                        </button>
                      }
                      icone={<Icone className="w-4 h-4" strokeWidth={1.5} />}
                      titulo={gasto.descricao}
                      meta={
                        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span>
                            {gasto.tipo === "credito" ? (fatura ? `Crédito · fatura de ${fatura}` : "Crédito") : "Débito"}
                            {gasto.categoria_gasto ? ` · ${gasto.categoria_gasto}` : ""}
                            {pessoas ? ` · ${pessoas}` : ""}
                          </span>
                          {gasto.categoria === "divida" && <Pill>dívida</Pill>}
                          {isSuspenso && <Pill>pausado até {getMesReativacao(gasto)}</Pill>}
                        </span>
                      }
                      valor={formatDinheiro(-valorDaMinhaParte(gasto))}
                      subvalor={!!gasto.dividido_com && gasto.minha_parte ? `de ${formatCurrency(gasto.valor)}` : undefined}
                      pago={!!gasto.pago || isSuspenso}
                      onAbrir={() => handleEditMeuGasto(gasto)}
                      acoes={acoes}
                    />
                  );
                })}
              </ListGroup>
            ))
          )}
        </Surface>

        {/* Fixos do mês: blocos no estilo dos recorrentes do Copilot. */}
        {gastosFixos.length > 0 && (
          <section className="min-w-0" data-tour="eu-gastos-fixos">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="text-base font-medium text-fg">Fixos do mês</h2>
              <span className="tabular-nums text-xs text-fg-3">
                {gastosFixosAtivos} {gastosFixosAtivos === 1 ? "ativo" : "ativos"}
              </span>
            </div>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
              {[...gastosFixos]
                .sort((a, b) => (a.dia_vencimento || 0) - (b.dia_vencimento || 0))
                .map((gasto) => {
                  const isSuspenso = !!gasto.meses_suspensos?.includes(mesChave);
                  const estado = estadoDoFixo(gasto, mesVisualizacao, isSuspenso);
                  const pessoas = formatarDivididoCom(gasto);
                  const apagado = gasto.ativo === false || isSuspenso;
                  return (
                    <article key={gasto.id} className="bg-surface-1 rounded p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-[15px] md:text-sm break-words ${apagado ? "text-fg-2" : "text-fg"}`}>
                          {gasto.descricao}
                        </h3>
                        <MenuAcoes titulo={gasto.descricao} acoes={acoesDoFixo(gasto, isSuspenso)} className="-mt-1.5" />
                      </div>
                      {/* Dividido: a minha parte em destaque e o total embaixo. */}
                      <p className={`valor text-xl mt-1 ${apagado ? "text-fg-2" : "text-fg"}`}>{formatCurrency(valorDaMinhaParte(gasto))}</p>
                      {pessoas && gasto.minha_parte ? (
                        <p className="valor text-xs text-fg-3 mt-0.5">de {formatCurrency(gasto.valor)}</p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-fg-2 break-words">
                          vence dia {gasto.dia_vencimento}
                          {pessoas ? ` · com ${pessoas}` : ""}
                        </span>
                        <Pill tom={estado.tom}>{estado.rotulo}</Pill>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        )}
      </div>

      {modalSuspensao && (
        <SuspensaoModal
          show={modalSuspensao.show}
          onClose={() => setModalSuspensao(null)}
          onConfirm={async (meses) => {
            await handleSuspenderMultiplosMeses(modalSuspensao.id, meses, mesVisualizacao);
          }}
          mesRef={mesVisualizacao}
          nomeGasto={modalSuspensao.nome}
        />
      )}
    </>
  );
}
