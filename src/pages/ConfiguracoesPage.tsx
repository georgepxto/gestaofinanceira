import { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../hooks/useTheme";
import { Pista } from "../components/ui/PageHeader";
import { PAGE_CONTAINER_CLASS } from "../utils/layout";
import { toActionableErrorMessage } from "../utils/feedbackMessages";

interface Contagens {
  lancamentos: number;
  cartoes: number;
  devedores: number;
  metas: number;
}

export const ConfiguracoesPage = () => {
  const { user, handleLogout, setModalFeedback } = useAppContext();
  const { theme, setTheme } = useTheme();

  const [novoNome, setNovoNome] = useState(user?.user_metadata?.nome || "");
  const [savingNome, setSavingNome] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Acordeão de ações irreversíveis — FECHADO por padrão.
  const [showAcoesIrreversiveis, setShowAcoesIrreversiveis] = useState(false);

  // Zerar dados
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetingAccount, setResetingAccount] = useState(false);

  const [contagens, setContagens] = useState<Contagens>({ lancamentos: 0, cartoes: 0, devedores: 0, metas: 0 });

  // Contagens reais dos dados do usuário (só leitura).
  const fetchContagens = useCallback(async () => {
    if (!supabase || !user) return;
    const contar = async (tabela: string) => {
      const { count } = await supabase!
        .from(tabela)
        .select("id", { count: "exact", head: true });
      return count || 0;
    };
    try {
      const [lancamentos, cartoes, devedores, metas] = await Promise.all([
        contar("meus_gastos"),
        contar("cartoes_credito"),
        contar("pessoas"),
        contar("metas_gasto"),
      ]);
      setContagens({ lancamentos, cartoes, devedores, metas });
    } catch (err) {
      console.error("Erro ao contar dados:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchContagens();
  }, [fetchContagens]);

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

  // Alterar senha — envia link por e-mail
  const handleAlterarSenha = async () => {
    if (!supabase || !user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setModalFeedback({
        show: true,
        titulo: "Link enviado",
        mensagem: `Enviamos um link de alteração de senha para ${user.email}.`,
        tipo: "sucesso",
      });
    } catch (err) {
      console.error("Erro ao enviar link de senha:", err);
      setModalFeedback({
        show: true,
        titulo: "Erro ao enviar link",
        mensagem: toActionableErrorMessage(err, "Não foi possível enviar o link de alteração de senha."),
        tipo: "info",
      });
    } finally {
      setSendingReset(false);
    }
  };

  // Exportar dados — baixa um JSON com tudo que é do usuário.
  const handleExportarDados = async () => {
    if (!supabase || !user) return;
    setExporting(true);
    try {
      const tabelas = [
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
      const dados: Record<string, unknown> = { exportado_em: new Date().toISOString(), email: user.email };
      await Promise.all(
        tabelas.map(async (tabela) => {
          const { data } = await supabase!.from(tabela).select("*");
          dados[tabela] = data || [];
        })
      );
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hedge-dados-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar dados:", err);
      setModalFeedback({
        show: true,
        titulo: "Erro ao exportar",
        mensagem: toActionableErrorMessage(err, "Não foi possível exportar seus dados."),
        tipo: "info",
      });
    } finally {
      setExporting(false);
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

  const inicial = (user?.user_metadata?.nome || user?.email || "U").charAt(0).toUpperCase();
  const desde = user?.created_at
    ? format(new Date(user.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const itensZerar = [
    { label: "lançamentos", quantidade: contagens.lancamentos },
    { label: "cartões", quantidade: contagens.cartoes },
    { label: "devedores", quantidade: contagens.devedores },
    { label: "metas", quantidade: contagens.metas },
  ];

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      {/* HEADER_PAGINA */}
      <div className="mb-6">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">
          Conta
        </p>
        <h1 className="font-display font-bold text-[34px] leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
          Suas <Pista>configurações</Pista>
        </h1>
        <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">
          Perfil, aparência e gerenciamento da conta.
        </p>
      </div>

      {/* Grid principal */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        {/* Card Perfil */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5 min-w-0">
          <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Perfil</h2>

          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-[52px] h-[52px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-xl text-emerald-700 dark:text-emerald-400">{inicial}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {user?.user_metadata?.nome || "Usuário"}
              </p>
              <p className="font-mono text-[12px] text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Nome de exibição</label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Seu nome"
                className="flex-1 min-w-[180px] px-3 py-2.5 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-[10px] text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-white/[0.06]"
              />
              <button
                onClick={handleAlterarNome}
                disabled={savingNome || novoNome === user?.user_metadata?.nome}
                className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 disabled:cursor-not-allowed disabled:shadow-none text-white rounded-xl text-sm font-semibold shadow-[0_4px_12px_-3px_rgba(5,150,105,0.5)] transition-colors"
              >
                {savingNome ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 mt-5 pt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Senha</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">enviamos um link por e-mail</p>
            </div>
            <button
              onClick={handleAlterarSenha}
              disabled={sendingReset}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingReset ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Alterar senha
            </button>
          </div>
        </section>

        {/* Coluna: Aparência + Seus dados */}
        <div className="space-y-5 min-w-0">
          {/* Card Aparência */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">Aparência</h2>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Tema</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {theme === "dark" ? "Modo escuro ativado" : "Modo claro ativado"}
                </p>
              </div>
              {/* SEGMENTADO claro/escuro */}
              <div className="flex gap-1 bg-zinc-100 dark:bg-white/[0.04] p-1 rounded-[11px]" role="radiogroup" aria-label="Tema">
                <button
                  onClick={() => setTheme("light")}
                  role="radio"
                  aria-checked={theme === "light"}
                  className={`px-3.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                    theme === "light"
                      ? "bg-white text-zinc-900 shadow-sm font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Claro
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  role="radio"
                  aria-checked={theme === "dark"}
                  className={`px-3.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                    theme === "dark"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Escuro
                </button>
              </div>
            </div>
          </section>

          {/* Card Seus dados */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Seus dados</h2>
            {desde && (
              <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">no Hedge desde {desde}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 mb-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Lançamentos</p>
                <p className="font-mono tabular-nums text-[19px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{contagens.lancamentos}</p>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Cartões</p>
                <p className="font-mono tabular-nums text-[19px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{contagens.cartoes}</p>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Devedores</p>
                <p className="font-mono tabular-nums text-[19px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{contagens.devedores}</p>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Metas</p>
                <p className="font-mono tabular-nums text-[19px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{contagens.metas}</p>
              </div>
            </div>
            <button
              onClick={handleExportarDados}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar meus dados
            </button>
          </section>
        </div>
      </div>

      {/* Ações irreversíveis — acordeão fechado por padrão */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm mt-5">
        <button
          type="button"
          onClick={() => setShowAcoesIrreversiveis(!showAcoesIrreversiveis)}
          aria-expanded={showAcoesIrreversiveis}
          className="w-full flex items-center gap-3 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
        >
          <AlertTriangle className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Ações irreversíveis</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">zerar seus dados ou excluir a conta</p>
          </div>
          {showAcoesIrreversiveis ? (
            <ChevronUp className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          )}
        </button>

        {showAcoesIrreversiveis && (
          <div className="px-5 pb-5 grid gap-4 md:grid-cols-2">
            {/* Zerar dados */}
            <div className="bg-[#FFFBF4] dark:bg-amber-950/20 border border-[#FDE8C8] dark:border-amber-900/40 rounded-2xl p-5 min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400 mb-1">Zerar dados</p>
              <h3 className="font-display font-bold text-zinc-900 dark:text-zinc-100 mb-2">Começar do zero</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Apaga permanentemente tudo isto, mantendo só o seu login:
              </p>
              <ul className="space-y-1.5 mb-4">
                {itensZerar.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 font-mono text-[12px] text-zinc-600 dark:text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    {item.quantidade} {item.label}
                  </li>
                ))}
              </ul>

              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-transparent border border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Zerar meus dados
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Digite <strong className="font-mono text-amber-700 dark:text-amber-400">RESETAR</strong> para confirmar:
                  </p>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                    placeholder="RESETAR"
                    className="w-full px-3 py-2.5 font-mono text-sm bg-white dark:bg-white/[0.04] border border-amber-300 dark:border-amber-800 rounded-[10px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleResetConta}
                      disabled={resetingAccount || resetConfirmText !== "RESETAR"}
                      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-sm font-semibold transition-colors ${
                        resetConfirmText === "RESETAR" && !resetingAccount
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      {resetingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setShowResetConfirm(false); setResetConfirmText(""); }}
                      className="inline-flex items-center px-3.5 py-2 bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Excluir conta */}
            <div className="bg-[#FFF7F7] dark:bg-red-950/20 border border-[#FBD5D5] dark:border-red-900/40 rounded-2xl p-5 min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-red-600 dark:text-red-400 mb-1">Excluir conta</p>
              <h3 className="font-display font-bold text-zinc-900 dark:text-zinc-100 mb-2">Apagar tudo, inclusive o login</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Ação permanente e irreversível. Digite <strong className="font-mono text-red-600 dark:text-red-400">EXCLUIR</strong> para liberar o botão:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="EXCLUIR"
                className="w-full px-3 py-2.5 font-mono text-sm bg-white dark:bg-white/[0.04] border border-red-200 dark:border-red-800 rounded-[10px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 mb-3"
              />
              <button
                onClick={handleExcluirConta}
                disabled={deletingAccount || deleteConfirmText !== "EXCLUIR"}
                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-sm font-semibold transition-colors ${
                  deleteConfirmText === "EXCLUIR" && !deletingAccount
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500 cursor-not-allowed"
                }`}
              >
                {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir minha conta
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
