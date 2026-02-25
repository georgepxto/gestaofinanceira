import { useState } from "react";
import { Settings, User, Trash2, Loader2, AlertTriangle, Check, Sun, Moon } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../hooks/useTheme";

export const ConfiguracoesPage = () => {
  const { user, handleLogout, setModalFeedback } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  
  const [novoNome, setNovoNome] = useState(user?.user_metadata?.nome || "");
  const [savingNome, setSavingNome] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-gray-600 dark:text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
      </div>

      {/* Seção Aparência */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-blue-500" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aparência</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Tema</p>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Perfil</h2>
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
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong className="text-red-600 dark:text-red-400">Atenção:</strong> Excluir sua conta é uma ação permanente e irreversível. 
            Todos os seus dados serão apagados.
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
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
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
      </section>
    </div>
  );
};
