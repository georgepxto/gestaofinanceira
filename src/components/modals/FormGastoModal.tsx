import React from "react";
import type { GastoForm, CartaoCredito, ContaBancaria } from "../../types";
import { formatCurrency, parseCurrency } from "../../utils/calculations";
import { PARCELAS_OPTIONS, PARCELAS_MAX } from "../../utils/constants";
import { comCategoriaAtual } from "../../utils/categories";
import { useCategorias } from "../../hooks/useCategorias";
import { FormSheet, Campo, Chip, Chips, EscolhaParcelas, MaisOpcoes, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { SegmentedControl } from "../ui/SegmentedControl";

interface FormGastoModalProps {
  show: boolean;
  isEditing: boolean;
  formData: GastoForm;
  pessoas: string[];
  cartoes?: CartaoCredito[];
  contas?: ContaBancaria[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onFormChange: (data: GastoForm) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * O empréstimo do mês (o que alguém passou no seu cartão ou na sua conta e vai
 * te devolver). Mesmos campos e mesmo `onSubmit` de antes, no <FormSheet>.
 */
export const FormGastoModal: React.FC<FormGastoModalProps> = ({
  show,
  isEditing,
  formData,
  pessoas,
  cartoes = [],
  contas = [],
  saving,
  error,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const { categorias } = useCategorias("gasto");
  // Gasto gravado numa categoria excluída depois continua listado — sem isto o
  // próximo salvamento trocaria a categoria dele sem ninguém pedir.
  const categoriasDoForm = comCategoriaAtual(categorias, formData.categoria);
  const set = (parcial: Partial<GastoForm>) => onFormChange({ ...formData, ...parcial });
  const credito = formData.tipo === "credito";

  return (
    <FormSheet
      aberto={show}
      titulo={isEditing ? "Editar empréstimo" : "Novo empréstimo"}
      onFechar={onClose}
      // O handler do hook espera o evento do formulário (chama preventDefault).
      onEnviar={() => onSubmit({ preventDefault() {} } as React.FormEvent)}
      rotuloEnviar={isEditing ? "Salvar alterações" : "Adicionar empréstimo"}
      enviando={saving}
      erro={error}
      valor={
        <MoneyInput
          tamanho="heroi"
          value={formData.valor_total}
          onChange={(valor_total) => set({ valor_total })}
          aria-label="Valor total"
          data-autofocus
        />
      }
    >
      <Campo rotulo="Descrição" htmlFor="emp-descricao">
        <input
          id="emp-descricao"
          type="text"
          value={formData.descricao}
          onChange={(e) => set({ descricao: e.target.value })}
          placeholder="Ex: iPhone 15, supermercado"
          className={campoClasse}
        />
      </Campo>

      <Campo rotulo="Pessoa" dica="Cadastre pessoas em A receber, Por pessoa.">
        {pessoas.length > 0 ? (
          <Chips>
            {pessoas.map((p) => (
              <Chip key={p} ativo={formData.pessoa === p} onClick={() => set({ pessoa: p })}>
                {p}
              </Chip>
            ))}
          </Chips>
        ) : (
          <p className="text-sm text-fg-2">Nenhuma pessoa cadastrada.</p>
        )}
      </Campo>

      <Campo rotulo="Categoria">
        <Chips>
          {categoriasDoForm.map((cat) => (
            <Chip key={cat} ativo={formData.categoria === cat} onClick={() => set({ categoria: cat })}>
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
            { chave: "debito", rotulo: "Débito", ativo: !credito, onClick: () => set({ tipo: "debito" }) },
            { chave: "credito", rotulo: "Crédito", ativo: credito, onClick: () => set({ tipo: "credito" }) },
          ]}
        />
      </Campo>

      {credito && cartoes.length > 0 && (
        <Campo rotulo="Cartão" htmlFor="emp-cartao">
          <select
            id="emp-cartao"
            value={formData.cartao_id}
            onChange={(e) => set({ cartao_id: e.target.value })}
            className={campoClasse}
          >
            <option value="">Selecione um cartão</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} (limite {formatCurrency(c.limite || 0)})
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo rotulo="Repete todo mês">
        <SegmentedControl
          rotulo="Repete todo mês"
          cheio
          segmentos={[
            { chave: "nao", rotulo: "Não", ativo: !formData.recorrente, onClick: () => set({ recorrente: false }) },
            { chave: "sim", rotulo: "Sim, é fixo", ativo: formData.recorrente, onClick: () => set({ recorrente: true }) },
          ]}
        />
      </Campo>

      {formData.recorrente ? (
        <p className="text-sm text-fg-2">Aparece todo mês automaticamente, sem parcelas.</p>
      ) : (
        <EscolhaParcelas
          valor={formData.num_parcelas}
          onChange={(num_parcelas) => set({ num_parcelas })}
          presets={PARCELAS_OPTIONS}
          maximo={PARCELAS_MAX}
          total={parseCurrency(formData.valor_total)}
          formatar={formatCurrency}
        />
      )}

      <Campo rotulo="Data da primeira parcela" htmlFor="emp-data">
        <input
          id="emp-data"
          type="date"
          value={formData.data_inicio}
          onChange={(e) => set({ data_inicio: e.target.value })}
          className={`${campoClasse} valor`}
        />
      </Campo>

      {!credito && contas.length > 0 && (
        <MaisOpcoes abertoInicial={!!formData.conta_id}>
          <Campo rotulo="Conta bancária" htmlFor="emp-conta">
            <select
              id="emp-conta"
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
