import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { parseCurrency } from "../../utils/calculations";
import { toActionableErrorMessage } from "../../utils/feedbackMessages";
import { FormSheet, Campo, campoClasse } from "../ui/FormSheet";
import { MoneyInput } from "../ui/MoneyInput";

interface BoasVindasProps {
  aberto: boolean;
  userId: string;
  primeiroNome: string;
  /** Conta criada: o Início recarrega e mostra o saldo dela. */
  onCriada: () => void;
  onPular: () => void;
}

/**
 * A primeira coisa de quem começa do zero: a conta e quanto tem nela hoje.
 * É o único dado sem o qual o saldo não existe — o resto (renda, fixos,
 * cartão) fica nos primeiros passos do Início, no ritmo da pessoa.
 */
export function BoasVindas({ aberto, userId, primeiroNome, onCriada, onPular }: BoasVindasProps) {
  const [saldo, setSaldo] = useState("");
  const [nome, setNome] = useState("Conta principal");
  const [banco, setBanco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const criar = async () => {
    if (!supabase) return;
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.from("contas_bancarias").insert({
      nome: nome.trim() || "Conta principal",
      banco: banco.trim(),
      saldo_inicial: parseCurrency(saldo || "0"),
      saldo_atual: null,
      user_id: userId,
    });
    setEnviando(false);
    if (error) {
      setErro(toActionableErrorMessage(error, "Não foi possível criar a conta."));
      return;
    }
    onCriada();
  };

  return (
    <FormSheet
      aberto={aberto}
      titulo={primeiroNome ? `Boas-vindas, ${primeiroNome}` : "Boas-vindas ao Hedge"}
      aviso="Comece pela sua conta: o saldo do app parte daqui."
      onFechar={onPular}
      onEnviar={criar}
      rotuloEnviar="Criar minha conta"
      rotuloCancelar="Pular por agora"
      enviando={enviando}
      podeEnviar={!!nome.trim()}
      erro={erro}
      valor={
        <div>
          <MoneyInput tamanho="heroi" value={saldo} onChange={setSaldo} aria-label="Quanto tem na conta hoje" data-autofocus />
          <p className="mt-2 text-center text-xs text-fg-3">Quanto tem na conta hoje</p>
        </div>
      }
    >
      <Campo rotulo="Nome da conta" htmlFor="bv-nome">
        <input id="bv-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} className={campoClasse} />
      </Campo>
      <Campo rotulo="Banco (opcional)" htmlFor="bv-banco">
        <input
          id="bv-banco"
          type="text"
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          placeholder="Ex: Nubank, Inter"
          className={campoClasse}
        />
      </Campo>
      <p className="text-xs text-fg-3">
        Olhe o saldo no app do seu banco e digite aqui. Dá para ajustar depois em Contas e receitas.
      </p>
    </FormSheet>
  );
}
