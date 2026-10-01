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
 * A senha vem primeiro para todo mundo: conta do Google pode ter senha (criada
 * em "Alterar senha") e o Supabase não avisa isso. Quem entra só com o Google
 * troca para confirmar digitando o próprio e-mail.
 */
export function ConfirmarComSenha({ aberto, titulo, aviso, rotuloEnviar, onConfirmar, onFechar }: ConfirmarComSenhaProps) {
  const { user } = useAppContext();
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const provedores: string[] = user?.app_metadata?.providers || (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const doGoogle = provedores.includes("google");
  const [modo, setModo] = useState<"senha" | "email">("senha");
  const temSenha = modo === "senha";
  const email = user?.email || "";

  useEffect(() => {
    if (!aberto) {
      setValor("");
      setErro(null);
      setModo("senha");
    }
  }, [aberto]);

  const trocarModo = () => {
    setModo((m) => (m === "senha" ? "email" : "senha"));
    setValor("");
    setErro(null);
  };

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
        <Campo
          rotulo="Sua senha"
          htmlFor="confirmar-senha"
          dica={
            doGoogle ? (
              <button type="button" onClick={trocarModo} className="underline underline-offset-2 hover:text-fg transition-colors">
                Entro só com o Google, sem senha
              </button>
            ) : (
              "A mesma que você usa para entrar no Hedge."
            )
          }
        >
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
        <Campo
          rotulo="Seu e-mail"
          htmlFor="confirmar-email"
          dica={
            <>
              Sem senha, confirme com o e-mail da conta.{" "}
              <button type="button" onClick={trocarModo} className="underline underline-offset-2 hover:text-fg transition-colors">
                Tenho senha
              </button>
            </>
          }
        >
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
