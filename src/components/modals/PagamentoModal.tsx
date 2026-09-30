import React from "react";
import { formatCurrency } from "../../utils/calculations";
import { FormSheet, Campo, Chip, Chips, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

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
  onSubmit: (dividaId: string) => void;
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
}) => (
  <FormSheet
    aberto={show && !!dividaId}
    titulo="Registrar pagamento"
    aviso={
      <>
        Em aberto: <span className="valor">{formatCurrency(valorAtual)}</span>
      </>
    }
    onFechar={onClose}
    onEnviar={() => dividaId && onSubmit(dividaId)}
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
  </FormSheet>
);
