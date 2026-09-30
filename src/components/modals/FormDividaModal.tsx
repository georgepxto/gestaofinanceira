import React from "react";
import type { SaldoDevedorForm } from "../../types";
import { FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

interface FormDividaModalProps {
  show: boolean;
  formData: SaldoDevedorForm;
  pessoas: string[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onFormChange: (data: SaldoDevedorForm) => void;
  onSubmit: () => void;
}

/** Cobrança em aberto: um valor que alguém te deve fora dos empréstimos do mês. */
export const FormDividaModal: React.FC<FormDividaModalProps> = ({
  show,
  formData,
  pessoas,
  saving,
  error,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const set = (parcial: Partial<SaldoDevedorForm>) => onFormChange({ ...formData, ...parcial });

  return (
    <FormSheet
      aberto={show}
      titulo="Nova cobrança"
      aviso="Para o que alguém te deve fora dos empréstimos do mês e vai pagar aos poucos."
      onFechar={onClose}
      onEnviar={onSubmit}
      rotuloEnviar="Adicionar cobrança"
      enviando={saving}
      erro={error}
      valor={
        <MoneyInput
          tamanho="heroi"
          value={formData.valor}
          onChange={(valor) => set({ valor })}
          aria-label="Valor da dívida"
          data-autofocus
        />
      }
    >
      <Campo rotulo="Quem deve">
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
      <Campo rotulo="Descrição" htmlFor="cobranca-descricao">
        <input
          id="cobranca-descricao"
          type="text"
          value={formData.descricao}
          onChange={(e) => set({ descricao: e.target.value })}
          placeholder="Ex: empréstimo de janeiro, dívida do carro"
          className={campoClasse}
        />
      </Campo>
    </FormSheet>
  );
};
