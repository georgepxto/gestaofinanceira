import React, { useEffect, useMemo, useState } from "react";
import type { MeuGasto, MeuGastoForm, CartaoCredito, ContaBancaria } from "../../types";
import { useMinhaParteAutomatica } from "../../hooks";
import { formatCurrency, parseCurrency } from "../../utils/calculations";
import {
  chaveCategoria,
  comCategoriaAtual,
  lerCategoriasRecentes,
  ordenarPorUso,
  registrarCategoriaUsada,
} from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { PARCELAS_OPTIONS, PARCELAS_MAX } from "../../utils/constants";
import {
  FormSheet,
  Campo,
  Chip,
  Chips,
  EscolhaData,
  EscolhaParcelas,
  campoClasse,
} from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Button } from "../ui/Button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { proximaFatura } from "../../utils/fatura";

interface FormGastoProps {
  show: boolean;
  isEditing: boolean;
  formData: MeuGastoForm;
  saving: boolean;
  error: string | null;
  cartoes?: CartaoCredito[];
  contas?: ContaBancaria[];
  pessoas?: string[];
  /** Os fixos que a pessoa já tem: avisar antes de lançar o mesmo de novo. */
  fixos?: MeuGasto[];
  /** Cadastra uma pessoa sem sair do formulário. */
  onAdicionarPessoa?: (nome: string) => Promise<{ nome?: string; erro?: string }>;
  onClose: () => void;
  onFormChange: (data: MeuGastoForm) => void;
  onSubmit: () => void;
}

const NATUREZAS: { valor: MeuGastoForm["categoria"]; rotulo: string }[] = [
  { valor: "pessoal", rotulo: "Pessoal" },
  { valor: "dividido", rotulo: "Dividido" },
  { valor: "fixo", rotulo: "Fixo" },
];

/**
 * O formulário de gasto — pessoal, dividido ou fixo — no celular e no desktop.
 *
 * Eram dois: a folha do celular e o diálogo do desktop, com os mesmos campos em
 * ordens diferentes. Este é um só, na ordem da folha (que era a melhor): o valor
 * primeiro, porque é o que a pessoa sabe de cabeça na fila do mercado. Mesmo
 * `formData`, mesma validação, mesmo `onSubmit` de antes.
 */
export const FormGasto: React.FC<FormGastoProps> = ({
  show,
  isEditing,
  formData,
  saving,
  error,
  cartoes = [],
  contas = [],
  pessoas = [],
  onAdicionarPessoa,
  fixos = [],
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const { categorias } = useCategorias("gasto");
  // Categoria excluída depois do lançamento continua listada: sem isto o chip
  // sumiria e o próximo salvamento trocaria a categoria do gasto.
  // As usadas por último vêm primeiro; além das cinco da frente, o resto fica
  // atrás de "Mais" (a escolhida aparece sempre).
  const recentes = useMemo(() => (show ? lerCategoriasRecentes() : []), [show]);
  const categoriasDoForm = ordenarPorUso(comCategoriaAtual(categorias, formData.categoria_gasto), recentes);
  const [todasCategorias, setTodasCategorias] = useState(false);
  const VISIVEIS = 5;
  const escondidas = categoriasDoForm.length - VISIVEIS;
  const categoriasVisiveis =
    todasCategorias || escondidas <= 1
      ? categoriasDoForm
      : categoriasDoForm.filter(
          (c, i) => i < VISIVEIS || chaveCategoria(c) === chaveCategoria(formData.categoria_gasto || "")
        );

  // Fixo dividido (a assinatura que você paga e os outros te devolvem): liga
  // com "Divide com alguém?". Abre ligado na edição de um fixo que já divide.
  const [dividirFixo, setDividirFixo] = useState(false);
  useEffect(() => {
    if (show) setDividirFixo((formData.dividido_com_pessoas || []).length > 0 || !!formData.dividido_com);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Pessoa nova direto daqui, sem ir até A receber.
  const [novaPessoa, setNovaPessoa] = useState<string | null>(null);
  const [erroPessoa, setErroPessoa] = useState<string | null>(null);
  const [salvandoPessoa, setSalvandoPessoa] = useState(false);
  useEffect(() => {
    if (!show) { setNovaPessoa(null); setErroPessoa(null); }
  }, [show]);

  // Gasto novo: sugere a última categoria usada e, com uma conta só, ela.
  useEffect(() => {
    if (!show) {
      setTodasCategorias(false);
      return;
    }
    if (isEditing) return;
    const patch: Partial<MeuGastoForm> = {};
    if (!formData.categoria_gasto) {
      const ultima = recentes.find((r) => categorias.some((c) => chaveCategoria(c) === chaveCategoria(r)));
      if (ultima) patch.categoria_gasto = ultima;
    }
    // Com uma conta só, o gasto já sai dela: sem conta ele não entra no saldo.
    if (!formData.conta_id && contas.length === 1) patch.conta_id = contas[0].id;
    if (Object.keys(patch).length) onFormChange({ ...formData, ...patch });
    // Só na abertura: depois disso a escolha é da pessoa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const enviar = () => {
    if (!isEditing && formData.categoria_gasto) registrarCategoriaUsada(formData.categoria_gasto);
    onSubmit();
  };
  // A divisão automática da minha parte é regra do formulário.
  useMinhaParteAutomatica(formData, onFormChange);

  const set = (parcial: Partial<MeuGastoForm>) => onFormChange({ ...formData, ...parcial });
  const dividido = formData.categoria === "dividido";
  const fixo = formData.categoria === "fixo";
  const divide = dividido || (fixo && dividirFixo);

  // "Apple One" já é fixo? Lançar de novo conta duas vezes: avisa.
  const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const fixoIgual =
    !isEditing && !fixo && semAcento(formData.descricao).length >= 3
      ? fixos.find((g) => g.ativo !== false && semAcento(g.descricao) === semAcento(formData.descricao))
      : undefined;
  const credito = formData.tipo === "credito";

  // Compra parcelada antiga (a TV que você já está pagando): o valor é o da
  // parcela, como aparece na fatura do banco, e só entram as que faltam — as
  // já pagas não viram gasto de novo.
  const podeSerAntiga = !isEditing && credito && !fixo;
  const antiga = podeSerAntiga && !!formData.compra_antiga;
  const numParcelas = parseInt(formData.num_parcelas, 10) || 1;
  const parcelaProxima = Math.min(Math.max(parseInt(formData.parcela_proxima || "", 10) || 1, 1), numParcelas);
  const faltam = numParcelas - parcelaProxima + 1;
  const valorParcela = parseCurrency(formData.valor);
  const cartaoEscolhido = cartoes.find((c) => c.id === formData.cartao_id);
  const mesDaProxima = cartaoEscolhido ? proximaFatura(cartaoEscolhido) : format(new Date(), "yyyy-MM");
  const nomeMes = (mes: string, n = 0) => {
    const d = parseISO(`${mes}-01`);
    return format(new Date(d.getFullYear(), d.getMonth() + n, 1), "MMMM 'de' yyyy", { locale: ptBR });
  };
  const alternarAntiga = (ligar: boolean) =>
    set(
      ligar
        ? { compra_antiga: true, num_parcelas: numParcelas > 1 ? formData.num_parcelas : "2", parcela_proxima: formData.parcela_proxima || "2" }
        : { compra_antiga: false }
    );

  const alternarPessoa = (pessoa: string) => {
    const atuais = formData.dividido_com_pessoas || [];
    const nova = atuais.includes(pessoa) ? atuais.filter((p) => p !== pessoa) : [...atuais, pessoa];
    set({ dividido_com_pessoas: nova, dividido_com: nova.length > 0 ? nova[0] : "" });
  };

  const salvarPessoa = async () => {
    if (!onAdicionarPessoa || novaPessoa === null) return;
    setSalvandoPessoa(true);
    const { nome, erro } = await onAdicionarPessoa(novaPessoa);
    setSalvandoPessoa(false);
    if (erro || !nome) { setErroPessoa(erro || "Não foi possível salvar."); return; }
    const atuais = formData.dividido_com_pessoas || [];
    if (!atuais.includes(nome)) {
      const nova = [...atuais, nome];
      set({ dividido_com_pessoas: nova, dividido_com: nova[0] });
    }
    setNovaPessoa(null);
    setErroPessoa(null);
  };

  const alternarDivisaoDoFixo = (ligar: boolean) => {
    setDividirFixo(ligar);
    if (!ligar) set({ dividido_com_pessoas: [], dividido_com: "", minha_parte: "" });
  };

  return (
    <FormSheet
      aberto={show}
      titulo={isEditing ? "Editar gasto" : "Novo gasto"}
      onFechar={onClose}
      onEnviar={enviar}
      rotuloEnviar={isEditing ? "Salvar alterações" : fixo ? "Adicionar gasto fixo" : antiga ? "Adicionar parcelas que faltam" : "Adicionar gasto"}
      enviando={saving}
      podeEnviar={!!formData.valor && (!antiga || numParcelas > 1)}
      erro={error}
      valor={
        <div>
          <MoneyInput
            tamanho="heroi"
            value={formData.valor}
            onChange={(valor) => set({ valor })}
            aria-label={antiga ? "Valor de cada parcela" : "Valor"}
            data-autofocus
          />
          {antiga && <p className="mt-2 text-center text-xs text-fg-3">Valor de cada parcela</p>}
        </div>
      }
    >
      <Campo rotulo="Descrição" htmlFor="gasto-descricao">
        <input
          id="gasto-descricao"
          type="text"
          value={formData.descricao}
          onChange={(e) => set({ descricao: e.target.value })}
          placeholder="Ex: mercado, Netflix, almoço"
          className={campoClasse}
        />
        {fixoIgual && (
          <p className="mt-1.5 text-xs text-accent-ink">
            {fixoIgual.descricao} já está nos seus fixos e entra todo mês sozinho. Lançar aqui de novo conta duas vezes.
          </p>
        )}
      </Campo>

      <Campo rotulo="Tipo de gasto">
        <Chips>
          {NATUREZAS.map((n) => (
            <Chip key={n.valor} ativo={formData.categoria === n.valor} onClick={() => set({ categoria: n.valor })}>
              {n.rotulo}
            </Chip>
          ))}
        </Chips>
      </Campo>

      {fixo && (
        <Campo rotulo="Divide com alguém?">
          <SegmentedControl
            rotulo="Divide com alguém"
            cheio
            segmentos={[
              { chave: "nao", rotulo: "Não", ativo: !dividirFixo, onClick: () => alternarDivisaoDoFixo(false) },
              { chave: "sim", rotulo: "Sim, divido", ativo: dividirFixo, onClick: () => alternarDivisaoDoFixo(true) },
            ]}
          />
        </Campo>
      )}

      {divide && (
        <>
          <Campo rotulo="Dividido com">
            <Chips>
              {pessoas.map((pessoa) => (
                <Chip
                  key={pessoa}
                  ativo={(formData.dividido_com_pessoas || []).includes(pessoa)}
                  onClick={() => alternarPessoa(pessoa)}
                >
                  {pessoa}
                </Chip>
              ))}
              {onAdicionarPessoa && novaPessoa === null && (
                <Chip ativo={false} onClick={() => setNovaPessoa("")}>
                  + Pessoa
                </Chip>
              )}
            </Chips>
            {novaPessoa !== null && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={novaPessoa}
                  onChange={(e) => setNovaPessoa(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); salvarPessoa(); }
                    if (e.key === "Escape") { e.stopPropagation(); setNovaPessoa(null); }
                  }}
                  placeholder="Nome da pessoa"
                  aria-label="Nome da pessoa"
                  autoFocus
                  className={campoClasse}
                />
                <Button tamanho="sm" onClick={salvarPessoa} carregando={salvandoPessoa} disabled={!novaPessoa.trim()}>
                  Adicionar
                </Button>
              </div>
            )}
            {erroPessoa && <p role="alert" className="mt-1.5 text-xs text-danger-ink">{erroPessoa}</p>}
            {pessoas.length === 0 && novaPessoa === null && (
              <p className="mt-1.5 text-xs text-fg-3">Adicione quem divide com você.</p>
            )}
          </Campo>
          <Campo
            rotulo={fixo ? "Sua parte por mês" : "Sua parte"}
            htmlFor="gasto-minha-parte"
            dica={
              fixo
                ? "Todo mês, a parte de cada pessoa entra em A receber, Do mês."
                : "Dividida por igual entre você e as pessoas escolhidas. Dá para ajustar."
            }
          >
            <MoneyInput id="gasto-minha-parte" value={formData.minha_parte} onChange={(minha_parte) => set({ minha_parte })} />
          </Campo>
        </>
      )}

      <Campo rotulo="Categoria" dica="Crie ou renomeie categorias em Configurações.">
        <Chips>
          {categoriasVisiveis.map((cat) => (
            <Chip key={cat} ativo={formData.categoria_gasto === cat} onClick={() => set({ categoria_gasto: cat })}>
              {cat}
            </Chip>
          ))}
          {categoriasVisiveis.length < categoriasDoForm.length && (
            <Chip ativo={false} onClick={() => setTodasCategorias(true)}>
              Mais categorias
            </Chip>
          )}
        </Chips>
      </Campo>

      <Campo rotulo="Forma de pagamento">
        <SegmentedControl
          rotulo="Forma de pagamento"
          cheio
          segmentos={[
            {
              chave: "debito",
              rotulo: "Débito",
              ativo: !credito,
              onClick: () => set({ tipo: "debito", num_parcelas: "1" }),
            },
            { chave: "credito", rotulo: "Crédito", ativo: credito, onClick: () => set({ tipo: "credito" }) },
          ]}
        />
      </Campo>

      {credito && cartoes.length > 0 && (
        <Campo rotulo="Cartão" htmlFor="gasto-cartao">
          <select
            id="gasto-cartao"
            value={formData.cartao_id}
            onChange={(e) => set({ cartao_id: e.target.value })}
            className={campoClasse}
          >
            <option value="">Selecione um cartão</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {podeSerAntiga && (
        <Campo rotulo="Quando comprou?">
          <SegmentedControl
            rotulo="Quando comprou"
            cheio
            segmentos={[
              { chave: "nova", rotulo: "Compra nova", ativo: !antiga, onClick: () => alternarAntiga(false) },
              { chave: "antiga", rotulo: "Já estou pagando", ativo: antiga, onClick: () => alternarAntiga(true) },
            ]}
          />
        </Campo>
      )}

      {credito && !fixo && (
        <EscolhaParcelas
          valor={numParcelas}
          onChange={(n) =>
            set({ num_parcelas: String(n), ...(antiga && parcelaProxima > n ? { parcela_proxima: String(n) } : {}) })
          }
          presets={antiga ? PARCELAS_OPTIONS.filter((n) => n > 1) : PARCELAS_OPTIONS}
          maximo={PARCELAS_MAX}
          total={antiga ? valorParcela * numParcelas : parseCurrency(formData.valor)}
          formatar={formatCurrency}
        />
      )}

      {antiga && numParcelas > 1 && (
        <Campo
          rotulo={`Qual parcela vem na fatura de ${nomeMes(mesDaProxima).split(" de ")[0]}?`}
          htmlFor="gasto-parcela-proxima"
          dica="Está escrito na fatura do banco, ao lado da compra: 3/10 quer dizer parcela 3."
        >
          <input
            id="gasto-parcela-proxima"
            type="number"
            inputMode="numeric"
            min="1"
            max={numParcelas}
            value={formData.parcela_proxima || ""}
            onChange={(e) => set({ parcela_proxima: e.target.value })}
            className={`${campoClasse} valor`}
          />
          {valorParcela > 0 && (
            <p className="mt-2 text-xs text-fg-2 leading-relaxed">
              {faltam === 1 ? "Falta 1 parcela" : `Faltam ${faltam} parcelas`} de{" "}
              <span className="valor">{formatCurrency(valorParcela)}</span>
              {faltam > 1 && (
                <>
                  {" "}(<span className="valor">{formatCurrency(valorParcela * faltam)}</span>)
                </>
              )}
              , {faltam === 1 ? `na fatura de ${nomeMes(mesDaProxima)}` : `de ${nomeMes(mesDaProxima)} a ${nomeMes(mesDaProxima, faltam - 1)}`}.
              {parcelaProxima > 1 &&
                ` ${parcelaProxima - 1 === 1 ? "A parcela já paga fica" : `As ${parcelaProxima - 1} já pagas ficam`} fora do Hedge.`}
            </p>
          )}
        </Campo>
      )}

      {/* Gasto fixo não tem data: tem dia de vencimento. Compra antiga também
          não: cada parcela vai para a fatura certa sozinha. */}
      {antiga ? null : fixo ? (
        <Campo rotulo="Dia do vencimento" htmlFor="gasto-vencimento" dica="De 1 a 31.">
          <input
            id="gasto-vencimento"
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={formData.dia_vencimento}
            onChange={(e) => set({ dia_vencimento: e.target.value })}
            placeholder="Ex: 10"
            className={`${campoClasse} valor`}
          />
        </Campo>
      ) : (
        <EscolhaData valor={formData.data} onChange={(data) => set({ data })} />
      )}

      {/* A conta é o que faz o gasto entrar no saldo: fica à vista, não em
          "Mais opções". Com uma conta só, ela já vem marcada. */}
      {!credito && contas.length > 0 && (
        <Campo rotulo="Sai de qual conta" dica="Sem conta, o gasto não mexe no saldo.">
          <Chips>
            {contas.map((c) => (
              <Chip key={c.id} ativo={formData.conta_id === c.id} onClick={() => set({ conta_id: c.id })}>
                {c.nome}
              </Chip>
            ))}
            <Chip ativo={!formData.conta_id} onClick={() => set({ conta_id: "" })}>
              Nenhuma
            </Chip>
          </Chips>
        </Campo>
      )}
    </FormSheet>
  );
};
