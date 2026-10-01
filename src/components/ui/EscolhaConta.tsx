import { useEffect } from "react";
import type { ContaBancaria } from "../../types";
import { Campo, Chip, Chips } from "./FormSheet";

interface EscolhaContaProps {
  contas: ContaBancaria[];
  valor: string;
  onChange: (contaId: string) => void;
  rotulo?: string;
  dica?: string;
  /** Formulário aberto: com uma conta só, ela já vem marcada. */
  aberto: boolean;
}

/**
 * De/para qual conta o dinheiro vai — é o que faz um pagamento recebido
 * entrar no saldo. Com uma conta só, ela já vem marcada; "Nenhuma" deixa o
 * valor fora do saldo (dinheiro em espécie, por exemplo).
 */
export function EscolhaConta({ contas, valor, onChange, rotulo = "Entrou em qual conta", dica, aberto }: EscolhaContaProps) {
  useEffect(() => {
    if (aberto && !valor && contas.length > 0) onChange(contas[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, contas.length]);

  if (contas.length === 0) return null;
  return (
    <Campo rotulo={rotulo} dica={dica ?? "É o que faz o valor entrar no saldo da conta."}>
      <Chips>
        {contas.map((c) => (
          <Chip key={c.id} ativo={valor === c.id} onClick={() => onChange(c.id)}>
            {c.nome}
          </Chip>
        ))}
        <Chip ativo={!valor} onClick={() => onChange("")}>
          Nenhuma
        </Chip>
      </Chips>
    </Campo>
  );
}
