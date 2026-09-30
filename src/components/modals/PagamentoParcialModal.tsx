import React from "react";
import { formatCurrency, formatCurrencyValue, formatMonthYear } from "../../utils/calculations";
import { FormSheet, Chip, Chips, Extrato } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

interface PagamentoParcialModalProps {
  show: boolean;
  pessoa: string | null;
  mesVisualizacao: Date;
  totalDevido: number;
  jaPago: number;
  valorPagamento: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onValorChange: (valor: string) => void;
  onSubmit: (pessoa: string) => void;
}

/** Pagamento parcial do mês de uma pessoa. */
export const PagamentoParcialModal: React.FC<PagamentoParcialModalProps> = ({
  show,
  pessoa,
  mesVisualizacao,
  totalDevido,
  jaPago,
  valorPagamento,
  saving,
  error,
  onClose,
  onValorChange,
  onSubmit,
}) => {
  const restante = totalDevido - jaPago;

  return (
    <FormSheet
      aberto={show && !!pessoa}
      titulo="Registrar pagamento"
      aviso={`${pessoa ?? ""} · ${formatMonthYear(mesVisualizacao)}`}
      onFechar={onClose}
      onEnviar={() => pessoa && onSubmit(pessoa)}
      rotuloEnviar="Registrar"
      enviando={saving}
      podeEnviar={restante > 0}
      erro={error}
      valor={
        <MoneyInput
          tamanho="heroi"
          value={valorPagamento}
          onChange={onValorChange}
          aria-label="Valor do pagamento"
          data-autofocus
        />
      }
    >
      {restante > 0 && (
        <Chips>
          <Chip ativo={false} onClick={() => onValorChange(formatCurrencyValue(restante))}>
            Tudo · <span className="valor">{formatCurrency(restante)}</span>
          </Chip>
          <Chip ativo={false} onClick={() => onValorChange(formatCurrencyValue(restante / 2))}>
            Metade · <span className="valor">{formatCurrency(restante / 2)}</span>
          </Chip>
        </Chips>
      )}
      <Extrato
        linhas={[
          { rotulo: "Total do mês", valor: formatCurrency(totalDevido) },
          ...(jaPago > 0
            ? [
                { rotulo: "Já pago", valor: formatCurrency(jaPago) },
                { rotulo: "Falta", valor: formatCurrency(restante), destaque: true },
              ]
            : []),
        ]}
      />
    </FormSheet>
  );
};
