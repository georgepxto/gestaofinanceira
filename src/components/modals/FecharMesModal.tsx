import React, { useEffect, useState } from "react";
import { formatCurrency, formatCurrencyValue, parseCurrency, formatMonthYear } from "../../utils/calculations";
import { FormSheet, Chip, Chips, Extrato } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { EscolhaConta } from "../ui/EscolhaConta";
import type { ContaBancaria } from "../../types";

interface FecharMesModalProps {
  show: boolean;
  pessoa: string | null;
  mesVisualizacao: Date;
  totalDevido: number;
  jaPago: number;
  valorPagoFecharMes: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onValorChange: (valor: string) => void;
  /** Contas para escolher onde o pagamento caiu. */
  contas?: ContaBancaria[];
  onSubmit: (pessoa: string, contaId?: string) => void;
}

/**
 * Fechar o mês de uma pessoa: o que ela paga agora, e o que sobra vira cobrança
 * em aberto. O extrato mostra para onde vai cada parte antes de confirmar.
 */
export const FecharMesModal: React.FC<FecharMesModalProps> = ({
  show,
  pessoa,
  mesVisualizacao,
  totalDevido,
  jaPago,
  valorPagoFecharMes,
  saving,
  error,
  onClose,
  onValorChange,
  onSubmit,
  contas = [],
}) => {
  const restanteReal = totalDevido - jaPago;
  const valorPago = parseCurrency(valorPagoFecharMes);
  const valorParaDebito = Math.max(0, restanteReal - valorPago);
  // Conta em que o pagamento caiu (com uma conta só, ela já vem marcada).
  const [contaId, setContaId] = useState("");
  useEffect(() => {
    if (!show) setContaId("");
  }, [show]);


  return (
    <FormSheet
      aberto={show && !!pessoa}
      titulo="Fechar mês"
      aviso={`${pessoa ?? ""} · ${formatMonthYear(mesVisualizacao)}. O que não for pago agora vira cobrança em aberto.`}
      onFechar={onClose}
      onEnviar={() => pessoa && onSubmit(pessoa, valorPago > 0 ? contaId || undefined : undefined)}
      rotuloEnviar="Fechar mês"
      enviando={saving}
      erro={error}
      valor={
        <MoneyInput
          tamanho="heroi"
          value={valorPagoFecharMes}
          onChange={onValorChange}
          aria-label={`Quanto ${pessoa ?? ""} vai pagar agora`}
          data-autofocus
        />
      }
    >
      <Chips>
        <Chip ativo={false} onClick={() => onValorChange(formatCurrencyValue(restanteReal))}>
          Restante · <span className="valor">{formatCurrency(restanteReal)}</span>
        </Chip>
        <Chip ativo={false} onClick={() => onValorChange("")}>
          Nada agora
        </Chip>
      </Chips>
      <Extrato
        linhas={[
          { rotulo: "Total do mês", valor: formatCurrency(totalDevido) },
          ...(jaPago > 0 ? [{ rotulo: "Já pago", valor: formatCurrency(jaPago) }] : []),
          { rotulo: "Restante", valor: formatCurrency(restanteReal) },
          ...(valorPago > 0 ? [{ rotulo: "Paga agora", valor: formatCurrency(valorPago) }] : []),
          valorParaDebito > 0
            ? {
                rotulo: "Vai para cobranças em aberto",
                valor: formatCurrency(valorParaDebito),
                destaque: true,
                tom: "atencao" as const,
              }
            : { rotulo: "Situação", valor: "Quitado", destaque: true },
        ]}
      />
      {valorPago > 0 && <EscolhaConta contas={contas} valor={contaId} onChange={setContaId} aberto={show && !!pessoa} />}
    </FormSheet>
  );
};
