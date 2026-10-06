import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { meusGastosFunctions } from "../../lib/supabase";
import type { CartaoCredito, ContaBancaria, MeuGasto } from "../../types";
import { formatCurrencyValue, parseCurrency } from "../../utils/calculations";
import { chaveCategoria, CATEGORIA_PADRAO } from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { useAppContext } from "../../context";
import { inicioParaNovoRecorrente } from "../../utils/saldo";
import { avisarDadosMudaram } from "../../utils/onboarding";
import { criarCobrancasDoFixo, divididoComParaBanco } from "../../utils/fixoDividido";
import { CampoInteiro, FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { Button } from "../ui/Button";

// Os fixos que quase todo mundo tem, com a categoria em que caem.
const SUGESTOES: { nome: string; categoria: string }[] = [
  { nome: "Aluguel", categoria: "Moradia" },
  { nome: "Condomínio", categoria: "Moradia" },
  { nome: "Luz", categoria: "Moradia" },
  { nome: "Água", categoria: "Moradia" },
  { nome: "Internet", categoria: "Assinaturas" },
  { nome: "Celular", categoria: "Assinaturas" },
  { nome: "Streaming", categoria: "Assinaturas" },
  { nome: "Academia", categoria: "Saúde" },
];

interface Linha {
  id: number;
  nome: string;
  /** Nome digitado pela pessoa ("Apple One"), não uma sugestão. */
  livre: boolean;
  categoria: string;
  valor: string;
  dia: string;
  /** "conta:<id>" ou "cartao:<id>" — de onde sai. Vazio = sem conta. */
  pagoCom: string;
  divide: boolean;
  pessoas: string[];
  minhaParte: string;
  /** A parte foi digitada à mão: o cálculo automático não sobrescreve. */
  parteManual: boolean;
}

interface FixosRapidosProps {
  aberto: boolean;
  contas: ContaBancaria[];
  cartoes: CartaoCredito[];
  onFechar: () => void;
}

/**
 * Cadastrar os gastos fixos de uma vez, no começo. Cada um é um gasto fixo
 * comum (o mesmo de Lançamentos): valor cheio, de onde sai e, se for dividido,
 * com quem e qual a sua parte — as pessoas ganham a cobrança mensal em A
 * receber. Cadastrado aqui, não precisa lançar de novo: lançar de novo duplica.
 */
export function FixosRapidos({ aberto, contas, cartoes, onFechar }: FixosRapidosProps) {
  const { categorias } = useCategorias("gasto");
  const { pessoas, adicionarPessoa } = useAppContext();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [proximoId, setProximoId] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Pessoa nova: em qual linha o campo está aberto, e o que foi digitado.
  const [novaPessoa, setNovaPessoa] = useState<{ linha: number; nome: string } | null>(null);
  const [erroPessoa, setErroPessoa] = useState<string | null>(null);

  // Zera só ao abrir. Antes zerava a cada recarga da lista de contas — e ela
  // recarrega quando a janela volta ao foco: o Alt+Tab apagava o digitado.
  useEffect(() => {
    if (!aberto) return;
    setLinhas([]);
    setErro(null);
    setNovaPessoa(null);
  }, [aberto]);

  const pagoComPadrao = contas[0] ? `conta:${contas[0].id}` : cartoes[0] ? `cartao:${cartoes[0].id}` : "";

  const novaLinha = (nome: string, categoria: string, livre: boolean): Linha => {
    const id = proximoId;
    setProximoId((n) => n + 1);
    return { id, nome, livre, categoria, valor: "", dia: "10", pagoCom: pagoComPadrao, divide: false, pessoas: [], minhaParte: "", parteManual: false };
  };

  const alternarSugestao = (s: (typeof SUGESTOES)[number]) =>
    setLinhas((ls) =>
      ls.some((l) => !l.livre && l.nome === s.nome)
        ? ls.filter((l) => l.livre || l.nome !== s.nome)
        : [...ls, novaLinha(s.nome, s.categoria, false)]
    );
  const adicionarOutro = () => setLinhas((ls) => [...ls, novaLinha("", "Assinaturas", true)]);
  const remover = (id: number) => setLinhas((ls) => ls.filter((l) => l.id !== id));

  // Sua parte por igual entre você e as pessoas, até a pessoa digitar a dela.
  const comParteAutomatica = (l: Linha): Linha => {
    if (!l.divide || l.parteManual || l.pessoas.length === 0) return l;
    const total = parseCurrency(l.valor);
    return { ...l, minhaParte: total > 0 ? formatCurrencyValue(total / (l.pessoas.length + 1)) : "" };
  };
  const mudar = (id: number, patch: Partial<Linha>) =>
    setLinhas((ls) => ls.map((l) => (l.id === id ? comParteAutomatica({ ...l, ...patch }) : l)));

  const alternarPessoa = (l: Linha, p: string) =>
    mudar(l.id, { pessoas: l.pessoas.includes(p) ? l.pessoas.filter((x) => x !== p) : [...l.pessoas, p] });

  const salvarPessoa = async (l: Linha) => {
    if (!novaPessoa) return;
    const { nome, erro } = await adicionarPessoa(novaPessoa.nome);
    if (erro || !nome) {
      setErroPessoa(erro || "Não foi possível salvar.");
      return;
    }
    if (!l.pessoas.includes(nome)) mudar(l.id, { pessoas: [...l.pessoas, nome] });
    setNovaPessoa(null);
    setErroPessoa(null);
  };

  const categoriaDaLista = (c: string) =>
    categorias.find((x) => chaveCategoria(x) === chaveCategoria(c)) ?? CATEGORIA_PADRAO;

  const valida = (l: Linha) => !!l.nome.trim() && parseCurrency(l.valor) > 0 && (!l.divide || l.pessoas.length > 0);
  const prontas = linhas.filter(valida);
  const incompletas = linhas.length - prontas.length;

  const salvar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      for (const [i, l] of prontas.entries()) {
        const [origem, origemId] = l.pagoCom.split(":");
        const credito = origem === "cartao";
        const valor = parseCurrency(l.valor);
        const minha = l.divide ? parseCurrency(l.minhaParte) : undefined;
        const dia = Math.min(Math.max(parseInt(l.dia) || 1, 1), 31);
        const gasto: MeuGasto = {
          id: `${Date.now()}-${i}`,
          descricao: l.nome.trim(),
          valor,
          tipo: credito ? "credito" : "debito",
          categoria: "fixo",
          categoria_gasto: categoriaDaLista(l.categoria),
          data: inicioParaNovoRecorrente(),
          pago: !credito,
          dia_vencimento: dia,
          ativo: true,
          num_parcelas: 1,
          parcela_atual: 1,
          conta_id: !credito && origemId ? origemId : undefined,
          cartao_id: credito ? origemId : undefined,
          // Como o banco guarda: o nome, ou a lista em JSON.
          dividido_com: l.divide ? divididoComParaBanco(l.pessoas) : undefined,
          minha_parte: minha,
        };
        const criado = await meusGastosFunctions.create(gasto);
        if (!criado) throw new Error(`Não foi possível salvar ${l.nome.trim()}.`);
        if (l.divide) {
          await criarCobrancasDoFixo({
            descricao: gasto.descricao,
            valor,
            minha_parte: minha,
            dia_vencimento: dia,
            tipo: gasto.tipo,
            categoria_gasto: gasto.categoria_gasto,
            pessoas: l.pessoas,
            origem_id: gasto.id,
          });
        }
      }
      avisarDadosMudaram("onboarding");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar os fixos.");
    } finally {
      setEnviando(false);
    }
  };

  const origens = [
    ...contas.map((c) => ({ chave: `conta:${c.id}`, rotulo: c.nome })),
    ...cartoes.map((c) => ({ chave: `cartao:${c.id}`, rotulo: `Cartão ${c.nome}` })),
  ];

  return (
    <FormSheet
      aberto={aberto}
      titulo="Seus gastos fixos"
      aviso="O que sai todo mês. Cadastrado aqui, entra sozinho: não precisa lançar de novo."
      onFechar={onFechar}
      onEnviar={salvar}
      rotuloEnviar={prontas.length > 1 ? `Salvar ${prontas.length} fixos` : "Salvar"}
      enviando={enviando}
      podeEnviar={prontas.length > 0 && incompletas === 0}
      erro={erro ?? (incompletas > 0 && prontas.length > 0 ? "Preencha nome e valor de todos (e as pessoas, se dividir)." : null)}
    >
      <Campo rotulo="O que você paga todo mês">
        <Chips>
          {SUGESTOES.map((s) => (
            <Chip key={s.nome} ativo={linhas.some((l) => !l.livre && l.nome === s.nome)} onClick={() => alternarSugestao(s)}>
              {s.nome}
            </Chip>
          ))}
          <Chip ativo={false} onClick={adicionarOutro}>
            + Outro
          </Chip>
        </Chips>
      </Campo>

      {linhas.map((l) => (
        <section key={l.id} className="border-t border-line pt-4 space-y-3" aria-label={l.nome || "Novo fixo"}>
          <div className="flex items-center gap-2">
            {l.livre ? (
              <input
                type="text"
                value={l.nome}
                onChange={(e) => mudar(l.id, { nome: e.target.value })}
                placeholder="Nome (ex: Apple One)"
                aria-label="Nome do fixo"
                autoFocus
                className={campoClasse}
              />
            ) : (
              <h3 className="flex-1 text-[15px] md:text-sm text-fg">{l.nome}</h3>
            )}
            <button
              type="button"
              onClick={() => remover(l.id)}
              aria-label={`Tirar ${l.nome || "este fixo"}`}
              className="w-11 h-11 md:w-8 md:h-8 shrink-0 rounded flex items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid grid-cols-[1fr_88px] gap-3 items-end">
            <Campo rotulo={l.divide ? "Valor cheio" : "Valor"} htmlFor={`fx-${l.id}`}>
              <MoneyInput id={`fx-${l.id}`} value={l.valor} onChange={(v) => mudar(l.id, { valor: v })} />
            </Campo>
            <Campo rotulo="Dia" htmlFor={`fx-dia-${l.id}`}>
              <CampoInteiro id={`fx-dia-${l.id}`} max={31} value={l.dia} onChange={(v) => mudar(l.id, { dia: v })} />
            </Campo>
          </div>

          {origens.length > 0 && (
            <Campo rotulo="Pago com">
              <Chips>
                {origens.map((o) => (
                  <Chip key={o.chave} ativo={l.pagoCom === o.chave} onClick={() => mudar(l.id, { pagoCom: o.chave })}>
                    {o.rotulo}
                  </Chip>
                ))}
              </Chips>
            </Campo>
          )}

          <Chips>
            <Chip
              ativo={l.divide}
              onClick={() =>
                mudar(l.id, l.divide ? { divide: false, pessoas: [], minhaParte: "", parteManual: false } : { divide: true })
              }
            >
              {l.divide ? "Dividido" : "Dividir com alguém"}
            </Chip>
          </Chips>

          {l.divide && (
            <div className="space-y-3">
              <Campo rotulo="Com quem">
                <Chips>
                  {pessoas.map((p) => (
                    <Chip key={p} ativo={l.pessoas.includes(p)} onClick={() => alternarPessoa(l, p)}>
                      {p}
                    </Chip>
                  ))}
                  {novaPessoa?.linha !== l.id && (
                    <Chip
                      ativo={false}
                      onClick={() => {
                        setNovaPessoa({ linha: l.id, nome: "" });
                        setErroPessoa(null);
                      }}
                    >
                      + Pessoa
                    </Chip>
                  )}
                </Chips>
                {novaPessoa?.linha === l.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={novaPessoa.nome}
                      onChange={(e) => setNovaPessoa({ linha: l.id, nome: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          salvarPessoa(l);
                        }
                      }}
                      placeholder="Nome da pessoa"
                      aria-label="Nome da pessoa"
                      autoFocus
                      className={campoClasse}
                    />
                    <Button tamanho="sm" onClick={() => salvarPessoa(l)} disabled={!novaPessoa.nome.trim()}>
                      Adicionar
                    </Button>
                  </div>
                )}
                {erroPessoa && novaPessoa?.linha === l.id && (
                  <p role="alert" className="mt-1.5 text-xs text-danger-ink">
                    {erroPessoa}
                  </p>
                )}
              </Campo>
              <Campo
                rotulo="Sua parte por mês"
                htmlFor={`fx-parte-${l.id}`}
                dica={
                  l.pessoas.length > 0
                    ? `Por igual entre você e ${l.pessoas.length === 1 ? "1 pessoa" : `${l.pessoas.length} pessoas`}. Dá para ajustar. A parte de cada um vira cobrança mensal em A receber.`
                    : "Escolha com quem divide."
                }
              >
                <MoneyInput
                  id={`fx-parte-${l.id}`}
                  value={l.minhaParte}
                  onChange={(v) =>
                    setLinhas((ls) => ls.map((x) => (x.id === l.id ? { ...x, minhaParte: v, parteManual: true } : x)))
                  }
                />
              </Campo>
            </div>
          )}
        </section>
      ))}

      <p className="text-xs text-fg-3">Outros fixos, ou mudanças, ficam em Lançamentos.</p>
    </FormSheet>
  );
}
