import React, { useEffect, useMemo, useState } from "react";
import type { MeuGastoForm, CartaoCredito, ContaBancaria } from "../../types";
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

interface FormGastoProps {
  show: boolean;
  isEditing: boolean;
  formData: MeuGastoForm;
  saving: boolean;
  error: string | null;
  cartoes?: CartaoCredito[];
  contas?: ContaBancaria[];
  pessoas?: string[];
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
  const credito = formData.tipo === "credito";

  const alternarPessoa = (pessoa: string) => {
    const atuais = formData.dividido_com_pessoas || [];
    const nova = atuais.includes(pessoa) ? atuais.filter((p) => p !== pessoa) : [...atuais, pessoa];
    set({ dividido_com_pessoas: nova, dividido_com: nova.length > 0 ? nova[0] : "" });
  };

  return (
    <FormSheet
      aberto={show}
      titulo={isEditing ? "Editar gasto" : "Novo gasto"}
      onFechar={onClose}
      onEnviar={enviar}
      rotuloEnviar={isEditing ? "Salvar alterações" : fixo ? "Adicionar gasto fixo" : "Adicionar gasto"}
      enviando={saving}
      podeEnviar={!!formData.valor}
      erro={error}
      valor={
        <MoneyInput
          tamanho="heroi"
          value={formData.valor}
          onChange={(valor) => set({ valor })}
          aria-label="Valor"
          data-autofocus
        />
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

      {dividido && (
        <>
          <Campo rotulo="Dividido com">
            {pessoas.length > 0 ? (
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
              </Chips>
            ) : (
              <p className="text-sm text-fg-2">Nenhuma pessoa cadastrada. Cadastre em A receber, Por pessoa.</p>
            )}
          </Campo>
          <Campo
            rotulo="Sua parte"
            htmlFor="gasto-minha-parte"
            dica="Dividida por igual entre você e as pessoas escolhidas. Dá para ajustar."
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

      {credito && !fixo && (
        <EscolhaParcelas
          valor={parseInt(formData.num_parcelas, 10) || 1}
          onChange={(n) => set({ num_parcelas: String(n) })}
          presets={PARCELAS_OPTIONS}
          maximo={PARCELAS_MAX}
          total={parseCurrency(formData.valor)}
          formatar={formatCurrency}
        />
      )}

      {/* Gasto fixo não tem data: tem dia de vencimento. */}
      {fixo ? (
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
