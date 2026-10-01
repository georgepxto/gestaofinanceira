import React, { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/calculations";
import { FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";
import { EscolhaConta } from "../ui/EscolhaConta";
import type { ContaBancaria } from "../../types";

interface PagamentoModalProps {
  show: boolean;
  dividaId: string | null;
  valorAtual: number;
  valorPagamento: string;
  obsPagamento: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onValorChange: (valor: string) => void;
  onObsChange: (obs: string) => void;
  onTudo: (valor: number) => void;
  /** Contas para escolher onde o pagamento caiu. */
  contas?: ContaBancaria[];
  onSubmit: (dividaId: string, contaId?: string) => void;
}

/** Pagamento de uma cobrança em aberto. */
export const PagamentoModal: React.FC<PagamentoModalProps> = ({
  show,
  dividaId,
  valorAtual,
  valorPagamento,
  obsPagamento,
  saving,
  error,
  onClose,
  onValorChange,
  onObsChange,
  onTudo,
  onSubmit,
  contas = [],
}) => {
  // Conta em que o pagamento caiu (com uma conta só, ela já vem marcada).
  const [contaId, setContaId] = useState("");
  useEffect(() => {
    if (!show) setContaId("");
  }, [show]);

  return (
  <FormSheet
    aberto={show && !!dividaId}
    titulo="Registrar pagamento"
    aviso={
      <>
        Em aberto: <span className="valor">{formatCurrency(valorAtual)}</span>
      </>
    }
    onFechar={onClose}
    onEnviar={() => dividaId && onSubmit(dividaId, contaId || undefined)}
    rotuloEnviar="Confirmar pagamento"
    enviando={saving}
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
    <Chips>
      <Chip ativo={false} onClick={() => onTudo(valorAtual)} disabled={saving}>
        Tudo · <span className="valor">{formatCurrency(valorAtual)}</span>
      </Chip>
    </Chips>
    <Campo rotulo="Observação (opcional)" htmlFor="pag-obs">
      <input
        id="pag-obs"
        type="text"
        value={obsPagamento}
        onChange={(e) => onObsChange(e.target.value)}
        placeholder="Ex: pix do dia 12"
        className={campoClasse}
      />
    </Campo>
    <EscolhaConta contas={contas} valor={contaId} onChange={setContaId} aberto={show && !!dividaId} />
  </FormSheet>
  );
};
