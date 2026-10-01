import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useAppContext } from "../../context";
import { FormSheet, Campo, campoClasse } from "../ui/FormSheet";

interface ConfirmarComSenhaProps {
  aberto: boolean;
  titulo: string;
  /** Uma frase sobre o que vai acontecer. */
  aviso: ReactNode;
  rotuloEnviar: string;
  onConfirmar: () => Promise<void>;
  onFechar: () => void;
}

/**
 * Confirmação de ação sem volta (zerar dados, excluir conta) pedindo a senha
 * da conta — prova que é a dona da conta, e não só alguém com o app aberto.
 * Quem entra com o Google não tem senha: aí confirma digitando o próprio
 * e-mail.
 */
export function ConfirmarComSenha({ aberto, titulo, aviso, rotuloEnviar, onConfirmar, onFechar }: ConfirmarComSenhaProps) {
  const { user } = useAppContext();
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const provedores: string[] = user?.app_metadata?.providers || (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const temSenha = provedores.includes("email");
  const email = user?.email || "";

  useEffect(() => {
    if (!aberto) {
      setValor("");
      setErro(null);
    }
  }, [aberto]);

  const enviar = async () => {
    if (!supabase || !valor) return;
    setEnviando(true);
    setErro(null);
    try {
      if (temSenha) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: valor });
        if (error) {
          setErro("Senha incorreta.");
          return;
        }
      } else if (valor.trim().toLowerCase() !== email.toLowerCase()) {
        setErro("O e-mail não é o desta conta.");
        return;
      }
      await onConfirmar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormSheet
      aberto={aberto}
      titulo={titulo}
      aviso={aviso}
      onFechar={onFechar}
      onEnviar={enviar}
      rotuloEnviar={rotuloEnviar}
      enviando={enviando}
      podeEnviar={!!valor}
      erro={erro}
      perigo
    >
      {temSenha ? (
        <Campo rotulo="Sua senha" htmlFor="confirmar-senha" dica="A mesma que você usa para entrar no Hedge.">
          <input
            id="confirmar-senha"
            data-autofocus
            type="password"
            autoComplete="current-password"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={campoClasse}
          />
        </Campo>
      ) : (
        <Campo rotulo="Seu e-mail" htmlFor="confirmar-email" dica="Você entra com o Google, então confirme com o e-mail da conta.">
          <input
            id="confirmar-email"
            data-autofocus
            type="email"
            autoComplete="email"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={email}
            className={campoClasse}
          />
        </Campo>
      )}
    </FormSheet>
  );
}
