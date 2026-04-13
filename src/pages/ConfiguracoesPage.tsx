import { useState } from "react";
import { Settings, User, Trash2, Loader2, AlertTriangle, Check, Sun, Moon } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../hooks/useTheme";
import { PAGE_CONTAINER_CLASS } from "../utils/layout";

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
        titulo: "Erro",
        mensagem: "Não foi possível atualizar o nome. Tente novamente.",
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
        titulo: "Erro",
        mensagem: "Digite 'RESETAR' para confirmar.",
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
        titulo: "Erro",
        mensagem: "Não foi possível resetar a conta. Tente novamente.",
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
        titulo: "Erro",
        mensagem: "Digite 'EXCLUIR' para confirmar.",
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
          titulo: "Erro",
          mensagem: "Não foi possível excluir a conta. Tente novamente.",
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
        titulo: "Erro",
        mensagem: "Não foi possível excluir a conta. Tente novamente.",
        tipo: "info",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-gray-600 dark:text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configurações</h1>
      </div>

      {/* Seção Aparência */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-blue-500" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Aparência</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Tema</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {theme === "dark" ? "Modo escuro ativado" : "Modo claro ativado"}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            style={{ backgroundColor: theme === "dark" ? "#3B82F6" : "#D1D5DB" }}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                theme === "dark" ? "translate-x-9" : "translate-x-1"
              }`}
            >
              {theme === "dark" ? (
                <Moon className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
          </button>
        </div>
      </section>

      {/* Seção Perfil */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Perfil</h2>
        </div>

        {/* Email (somente leitura) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado.</p>
        </div>

        {/* Nome */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Nome de exibição
          </label>
          <div className="space-y-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleAlterarNome}
              disabled={savingNome || novoNome === user?.user_metadata?.nome}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-red-200 dark:border-red-900 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Zona de Perigo</h2>
        </div>

        <div className="space-y-6">
          
          {/* Resetar Conta */}
          <div className="border-b border-red-100 dark:border-red-900/40 pb-6">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-1">Resetar Conta (Zerar tudo)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Apagar permanentemente todos os seus dados (gastos, cartões, receitas), mantendo apenas o seu login.
            </p>

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2.5 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 border border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Zerar meus dados
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Para limpar todos os dados, digite <strong className="text-orange-600 dark:text-orange-400">RESETAR</strong>:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                    placeholder="RESETAR"
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-orange-300 dark:border-orange-800 rounded-lg text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetConta}
                      disabled={resetingAccount || resetConfirmText !== "RESETAR"}
                      className="flex-1 sm:flex-none px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {resetingAccount ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setShowResetConfirm(false); setResetConfirmText(""); }}
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center"
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
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-1">Excluir Conta Permanentemente</h3>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4 mt-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
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
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Digite <strong className="text-red-600 dark:text-red-400">EXCLUIR</strong> para confirmar:
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder="EXCLUIR"
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                  <button
                    onClick={handleExcluirConta}
                    disabled={deletingAccount || deleteConfirmText !== "EXCLUIR"}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
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
                    className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
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
