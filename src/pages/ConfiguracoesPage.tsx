import { useState } from "react";
import { User, Trash2, Loader2, AlertTriangle, Check, Sun, Moon } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../hooks/useTheme";
import { PageHeader, Pista } from "../components/ui/PageHeader";
import { PAGE_CONTAINER_CLASS } from "../utils/layout";
import { toActionableErrorMessage } from "../utils/feedbackMessages";

export const ConfiguracoesPage = () => {
  const { user, handleLogout, setModalFeedback } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  
  const [novoNome, setNovoNome] = useState(user?.user_metadata?.nome || "");
  const [savingNome, setSavingNome] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // States for resetting account
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetingAccount, setResetingAccount] = useState(false);

  // Alterar nome de usuário
  const handleAlterarNome = async () => {
    if (!novoNome.trim()) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        mensagem: "O nome não pode estar vazio.",
        tipo: "info",
      });
      return;
    }

    if (!supabase) return;

    setSavingNome(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nome: novoNome.trim() },
      });

      if (error) throw error;

      setModalFeedback({
        show: true,
        titulo: "Sucesso!",
        mensagem: "Seu nome foi atualizado.",
        tipo: "sucesso",
      });
    } catch (err) {
      console.error("Erro ao atualizar nome:", err);
      setModalFeedback({
        show: true,
        titulo: "Erro ao atualizar nome",
        mensagem: toActionableErrorMessage(err, "Não foi possível atualizar seu nome. Tente novamente em instantes."),
        tipo: "info",
      });
    } finally {
      setSavingNome(false);
    }
  };

  // Resetar conta
  const handleResetConta = async () => {
    if (resetConfirmText !== "RESETAR") {
      setModalFeedback({
        show: true,
        titulo: "Confirmação inválida",
        mensagem: "Digite exatamente 'RESETAR' no campo para confirmar a limpeza de dados.",
        tipo: "info",
      });
      return;
    }

    if (!supabase || !user) return;

    setResetingAccount(true);
    try {
      const tables = [
        "gastos",
        "pessoas",
        "saldos_devedores",
        "meus_gastos",
        "observacoes_mes",
        "pagamentos_parciais",
        "contas_bancarias",
        "receitas",
        "cartoes_credito",
        "transacoes_cartao",
        "pagamentos_fatura",
        "metas_gasto",
      ];

      await Promise.all(
        tables.map((table) =>
          supabase!.from(table).delete().eq("user_id", user.id)
        )
      );

      setModalFeedback({
        show: true,
        titulo: "Conta Resetada",
        mensagem: "Todos os seus dados foram apagados e a conta foi zerada.",
        tipo: "sucesso",
      });

      setShowResetConfirm(false);
      setResetConfirmText("");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Erro ao resetar conta:", err);
      setModalFeedback({
        show: true,
        titulo: "Erro ao resetar dados",
        mensagem: toActionableErrorMessage(err, "Não conseguimos limpar seus dados. Aguarde um momento e tente novamente."),
        tipo: "info",
      });
    } finally {
      setResetingAccount(false);
    }
  };

  // Excluir conta
  const handleExcluirConta = async () => {
    if (deleteConfirmText !== "EXCLUIR") {
      setModalFeedback({
        show: true,
        titulo: "Confirmação inválida",
        mensagem: "Digite exatamente 'EXCLUIR' no campo para confirmar a exclusão permanente.",
        tipo: "info",
      });
      return;
    }

    if (!supabase) return;

    setDeletingAccount(true);
    try {
      // Chamar função do banco que deleta todos os dados + conta auth
      const { error } = await supabase.rpc("delete_user_account");

      if (error) {
        console.error("Erro ao excluir conta:", error);
        setModalFeedback({
          show: true,
          titulo: "Erro ao excluir conta",
          mensagem: toActionableErrorMessage(error, "Não conseguimos excluir sua conta. Tente novamente ou entre em contato com o suporte."),
          tipo: "info",
        });
        return;
      }

      setModalFeedback({
        show: true,
        titulo: "Conta Excluída",
        mensagem: "Sua conta e todos os dados foram excluídos permanentemente.",
        tipo: "info",
      });

      setTimeout(() => {
        handleLogout();
      }, 2000);
    } catch (err) {
      console.error("Erro ao excluir conta:", err);
      setModalFeedback({
        show: true,
        titulo: "Erro ao excluir conta",
        mensagem: toActionableErrorMessage(err, "Não conseguimos excluir sua conta. Tente novamente ou entre em contato com o suporte."),
        tipo: "info",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      {/* Page Header */}
      <PageHeader
        eyebrow="Conta"
        title={
          <>
            Suas <Pista>configurações</Pista>
          </>
        }
        description="Aparência, perfil e gerenciamento da conta"
      />

      {/* Seção Aparência */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          ) : (
            <Sun className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          )}
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Aparência</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Tema</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {theme === "dark" ? "Modo escuro ativado" : "Modo claro ativado"}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Alternar tema"
            className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
              theme === "dark" ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                theme === "dark" ? "translate-x-9" : "translate-x-1"
              }`}
            >
              {theme === "dark" ? (
                <Moon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
          </button>
        </div>
      </section>

      {/* Seção Perfil */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Perfil</h2>
        </div>

        {/* Email (somente leitura) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-lg text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">O email não pode ser alterado.</p>
        </div>

        {/* Nome */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            Nome de exibição
          </label>
          <div className="space-y-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              onClick={handleAlterarNome}
              disabled={savingNome || novoNome === user?.user_metadata?.nome}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {savingNome ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Salvar
            </button>
          </div>
        </div>
      </section>

      {/* Seção Zona de Perigo */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-red-200 dark:border-red-900/50 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="font-display text-lg font-bold tracking-tight text-red-600 dark:text-red-400">Zona de Perigo</h2>
        </div>

        <div className="space-y-6">
          
          {/* Resetar Conta */}
          <div className="border-b border-red-100 dark:border-red-900/40 pb-6">
            <h3 className="font-display text-md font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">Resetar Conta (Zerar tudo)</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Apagar permanentemente todos os seus dados (gastos, cartões, receitas), mantendo apenas o seu login.
            </p>

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Zerar meus dados
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Para limpar todos os dados, digite <strong className="font-mono text-amber-700 dark:text-amber-400">RESETAR</strong>:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                    placeholder="RESETAR"
                    className="flex-1 px-4 py-3 font-mono bg-zinc-50 dark:bg-white/[0.04] border border-amber-300 dark:border-amber-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetConta}
                      disabled={resetingAccount || resetConfirmText !== "RESETAR"}
                      className="flex-1 sm:flex-none px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {resetingAccount ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setShowResetConfirm(false); setResetConfirmText(""); }}
                      className="px-4 py-3 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors flex items-center justify-center"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Excluir Conta */}
          <div>
            <h3 className="font-display text-md font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">Excluir Conta Permanentemente</h3>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4 mt-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <strong className="text-red-600 dark:text-red-400">Atenção:</strong> Excluir sua conta é uma ação permanente e irreversível. Todos os seus dados e o seu login serão apagados.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Excluir minha conta
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Digite <strong className="font-mono text-red-600 dark:text-red-400">EXCLUIR</strong> para confirmar:
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder="EXCLUIR"
                    className="flex-1 px-4 py-3 font-mono bg-zinc-50 dark:bg-white/[0.04] border border-red-300 dark:border-red-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <button
                    onClick={handleExcluirConta}
                    disabled={deletingAccount || deleteConfirmText !== "EXCLUIR"}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {deletingAccount ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="px-4 py-3 bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
