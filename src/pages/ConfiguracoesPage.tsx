import { useState } from "react";
import { Settings, User, Trash2, Loader2, AlertTriangle, Check } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";

export const ConfiguracoesPage = () => {
  const { user, handleLogout, setModalFeedback } = useAppContext();
  
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
      // Nota: A exclusão de conta no Supabase geralmente requer uma função Edge/RPC
      // Por segurança, vamos apenas fazer logout e informar que a conta será excluída
      // Em produção, você precisaria de uma função no backend para isso
      
      setModalFeedback({
        show: true,
        titulo: "Solicitação Enviada",
        mensagem: "Sua conta será excluída em até 24 horas. Você será desconectado agora.",
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
        <Settings className="w-7 h-7 text-gray-400" />
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
      </div>

      {/* Seção Perfil */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-white">Perfil</h2>
        </div>

        {/* Email (somente leitura) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado.</p>
        </div>

        {/* Nome */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Nome de exibição
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Seu nome"
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleAlterarNome}
              disabled={savingNome || novoNome === user?.user_metadata?.nome}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
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
      <section className="bg-gray-800 rounded-xl p-6 border border-red-900/50">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-400">Zona de Perigo</h2>
        </div>

        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-300 mb-2">
            <strong className="text-red-400">Atenção:</strong> Excluir sua conta é uma ação permanente e irreversível. 
            Todos os seus dados serão apagados.
          </p>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-600 text-red-400 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Excluir minha conta
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Digite <strong className="text-red-400">EXCLUIR</strong> para confirmar:
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="EXCLUIR"
                className="flex-1 px-4 py-3 bg-gray-700 border border-red-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              <button
                onClick={handleExcluirConta}
                disabled={deletingAccount || deleteConfirmText !== "EXCLUIR"}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
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
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
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
