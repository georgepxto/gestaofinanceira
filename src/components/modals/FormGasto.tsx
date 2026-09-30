import React from "react";
import type { MeuGastoForm, CartaoCredito, ContaBancaria } from "../../types";
import { useMinhaParteAutomatica } from "../../hooks";
import { formatCurrency, parseCurrency } from "../../utils/calculations";
import { comCategoriaAtual } from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { PARCELAS_OPTIONS, PARCELAS_MAX } from "../../utils/constants";
import {
  FormSheet,
  Campo,
  Chip,
  Chips,
  EscolhaData,
  EscolhaParcelas,
  MaisOpcoes,
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
  const categoriasDoForm = comCategoriaAtual(categorias, formData.categoria_gasto);
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
      onEnviar={onSubmit}
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
          {categoriasDoForm.map((cat) => (
            <Chip key={cat} ativo={formData.categoria_gasto === cat} onClick={() => set({ categoria_gasto: cat })}>
              {cat}
            </Chip>
          ))}
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

      {!credito && contas.length > 0 && (
        <MaisOpcoes abertoInicial={!!formData.conta_id}>
          <Campo
            rotulo="Conta bancária"
            htmlFor="gasto-conta"
            dica="Se escolher uma conta, o valor sai do saldo dela."
          >
            <select
              id="gasto-conta"
              value={formData.conta_id}
              onChange={(e) => set({ conta_id: e.target.value })}
              className={campoClasse}
            >
              <option value="">Nenhuma</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.banco ? `(${c.banco})` : ""}
                </option>
              ))}
            </select>
          </Campo>
        </MaisOpcoes>
      )}
    </FormSheet>
  );
};
