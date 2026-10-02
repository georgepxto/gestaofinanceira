import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, ChevronDown, KeyRound, Download, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../hooks/useTheme";
import { PageHeader } from "../components/ui/PageHeader";
import { PAGE_CONTAINER_CLASS } from "../utils/layout";
import { toActionableErrorMessage } from "../utils/feedbackMessages";
import { Surface } from "../components/ui/Surface";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { KpiStrip, Kpi } from "../components/ui/KpiStrip";
import { Valor } from "../components/ui/Valor";
import { campoClasse } from "../components/ui/FormSheet";
import { GerenciarCategorias } from "../components/GerenciarCategorias";
import { recomecarOnboarding } from "../utils/onboarding";
import { ConfirmarComSenha } from "../components/configuracoes/ConfirmarComSenha";

interface Contagens {
  lancamentos: number;
  cartoes: number;
  devedores: number;
  metas: number;
}

export const ConfiguracoesPage = () => {
  const { user, handleLogout, setModalFeedback, isAdmin } = useAppContext();
  const provedores: string[] = user?.app_metadata?.providers || (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const doGoogle = provedores.includes("google");
  const { theme, setTheme } = useTheme();

  const [novoNome, setNovoNome] = useState(user?.user_metadata?.nome || "");
  const [savingNome, setSavingNome] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExcluirConfirm, setShowExcluirConfirm] = useState(false);
  const [, setDeletingAccount] = useState(false);

  // Acordeão de ações irreversíveis — FECHADO por padrão.
  const [showAcoesIrreversiveis, setShowAcoesIrreversiveis] = useState(false);

  // Zerar dados
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [, setResetingAccount] = useState(false);

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
        titulo: "Pronto",
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
  // Zerar: a senha já foi conferida no <ConfirmarComSenha>.
  const handleResetConta = async () => {
    if (!supabase || !user) return;

    setResetingAccount(true);
    try {
      // Em ordem de dependência, uma de cada vez: primeiro o que aponta para
      // outra tabela, por último contas e cartões. Apagando tudo em paralelo,
      // a conta podia falhar por ainda ter gastos ligados a ela — e o Zerar
      // dizia "pronto" deixando a conta e a receita para trás.
      const tables = [
        "receitas_confirmacoes",
        "pagamentos_fatura",
        "transacoes_cartao",
        "pagamentos_parciais",
        "observacoes_mes",
        "saldos_devedores",
        "gastos",
        "meus_gastos",
        "receitas",
        "metas_gasto",
        "categorias_usuario",
        "pessoas",
        "cartoes_credito",
        "contas_bancarias",
      ];

      const falhas: string[] = [];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq("user_id", user.id);
        // Tabela de migração ainda não rodada: não há o que apagar.
        const tabelaNaoExiste = error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|Could not find the table/i.test(error.message));
        if (error && !tabelaNaoExiste) falhas.push(table);
      }
      if (falhas.length > 0) {
        throw new Error(`Não foi possível apagar tudo (${falhas.join(", ")}). Tente de novo.`);
      }

      // Zerar é recomeçar como quem acabou de criar a conta: as boas-vindas e
      // os primeiros passos voltam, e o que o navegador lembrava sai também.
      await recomecarOnboarding();
      try {
        Object.keys(localStorage)
          .filter((k) => /_tutorial_seen_v\d+$/.test(k) || k === "hedge_categorias_recentes_v1" || k === "meusGastos" || k === "saldosDevedores")
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* sem armazenamento: nada a limpar */
      }

      setModalFeedback({
        show: true,
        titulo: "Dados zerados",
        mensagem: "Seus dados foram apagados. Você vai começar de novo, como no primeiro acesso.",
        tipo: "sucesso",
      });

      setShowResetConfirm(false);
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
  // Excluir: a senha já foi conferida no <ConfirmarComSenha>.
  const handleExcluirConta = async () => {
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
        titulo: "Conta excluída",
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

  const desde = user?.created_at ? format(new Date(user.created_at), "MMMM 'de' yyyy", { locale: ptBR }) : null;

  const itensZerar = [
    { label: "lançamentos", quantidade: contagens.lancamentos },
    { label: "cartões", quantidade: contagens.cartoes },
    { label: "pessoas", quantidade: contagens.devedores },
    { label: "limites", quantidade: contagens.metas },
  ];

  const Linha = ({ titulo, detalhe, children }: { titulo: string; detalhe?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 flex-wrap py-4">
      <div className="min-w-0">
        <p className="text-[15px] md:text-sm text-fg">{titulo}</p>
        {detalhe && <p className="text-xs text-fg-2 mt-0.5">{detalhe}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className={`${PAGE_CONTAINER_CLASS} max-w-3xl`}>
      {/* HEADER_PAGINA */}
      <PageHeader title="Configurações" description="Perfil, aparência e a sua conta." />

      {/* Perfil */}
      <section className="space-y-3">
        <h2 className="text-base font-medium text-fg">Perfil</h2>
        <Surface padding="nenhum" className="px-4 md:px-5 divide-y divide-line">
          <div className="flex items-center gap-3 py-4">
            <Avatar nome={user?.user_metadata?.nome || user?.email} tamanho={40} />
            <div className="min-w-0">
              <p className="text-[15px] md:text-sm text-fg break-words">{user?.user_metadata?.nome || "Usuário"}</p>
              <p className="text-xs text-fg-2 break-all">{user?.email}</p>
            </div>
          </div>
          <div className="py-4">
            <label htmlFor="config-nome" className="block text-xs text-fg-2 mb-2">
              Nome de exibição
            </label>
            <div className="flex gap-2 flex-wrap">
              <input
                id="config-nome"
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Seu nome"
                className={`flex-1 min-w-[180px] ${campoClasse}`}
              />
              <Button
                onClick={handleAlterarNome}
                disabled={novoNome === user?.user_metadata?.nome}
                carregando={savingNome}
                className="h-11"
              >
                Salvar
              </Button>
            </div>
          </div>
          {/* Conta do Google também pode ter senha: o link serve para criar ou trocar. */}
          <Linha
            titulo="Senha"
            detalhe={doGoogle ? "Você entra com o Google. Se quiser, crie uma senha por um link no e-mail." : "Enviamos um link por e-mail para trocar."}
          >
            <Button onClick={handleAlterarSenha} carregando={sendingReset} icone={<KeyRound className="w-4 h-4" strokeWidth={1.5} />}>
              {doGoogle ? "Criar ou trocar senha" : "Alterar senha"}
            </Button>
          </Linha>
          {/* No celular não há barra lateral: Admin e sair moram aqui. No
              desktop continuam no rodapé da barra. */}
          {isAdmin && (
            <div className="md:hidden">
              <Linha titulo="Admin" detalhe="Usuários e funções liberadas.">
                <Link
                  to="/admin"
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded bg-surface-2 text-fg text-sm font-medium hover:bg-surface-3 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                  Abrir
                </Link>
              </Linha>
            </div>
          )}
          <div className="md:hidden">
            <Linha titulo="Sair da conta" detalhe="Seus dados continuam salvos.">
              <Button onClick={handleLogout} icone={<LogOut className="w-4 h-4" strokeWidth={1.5} />}>
                Sair
              </Button>
            </Linha>
          </div>
        </Surface>
      </section>

      {/* Aparência */}
      <section className="space-y-3">
        <h2 className="text-base font-medium text-fg">Aparência</h2>
        <Surface padding="nenhum" className="px-4 md:px-5">
          <Linha titulo="Tema" detalhe={theme === "dark" ? "Escuro" : "Claro"}>
            <SegmentedControl
              rotulo="Tema"
              segmentos={[
                {
                  chave: "dark",
                  rotulo: (
                    <span className="inline-flex items-center gap-1.5">
                      <Moon className="w-4 h-4" strokeWidth={1.5} /> Escuro
                    </span>
                  ),
                  ativo: theme === "dark",
                  onClick: () => setTheme("dark"),
                },
                {
                  chave: "light",
                  rotulo: (
                    <span className="inline-flex items-center gap-1.5">
                      <Sun className="w-4 h-4" strokeWidth={1.5} /> Claro
                    </span>
                  ),
                  ativo: theme === "light",
                  onClick: () => setTheme("light"),
                },
              ]}
            />
          </Linha>
        </Surface>
      </section>

      {/* Seus dados */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-base font-medium text-fg">Seus dados</h2>
          {desde && <p className="text-xs text-fg-3">No Hedge desde {desde}</p>}
        </div>
        <KpiStrip>
          <Kpi rotulo="Lançamentos" valor={<Valor porte="medio">{contagens.lancamentos}</Valor>} />
          <Kpi rotulo="Cartões" valor={<Valor porte="medio">{contagens.cartoes}</Valor>} />
          <Kpi rotulo="Pessoas" valor={<Valor porte="medio">{contagens.devedores}</Valor>} />
          <Kpi rotulo="Limites" valor={<Valor porte="medio">{contagens.metas}</Valor>} />
        </KpiStrip>
        <Button onClick={handleExportarDados} carregando={exporting} icone={<Download className="w-4 h-4" strokeWidth={1.5} />}>
          Exportar meus dados
        </Button>
      </section>

      {/* Categorias — fechado por padrão */}
      <GerenciarCategorias />

      {/* Zerar e excluir: fechado por padrão, discreto. Confirmar pede a senha. */}
      <Surface as="section" padding="nenhum">
        <button
          type="button"
          onClick={() => setShowAcoesIrreversiveis(!showAcoesIrreversiveis)}
          aria-expanded={showAcoesIrreversiveis}
          className="w-full flex items-center justify-between gap-3 px-4 md:px-5 min-h-[56px] text-left rounded text-[15px] md:text-sm text-fg-2 hover:text-fg transition-colors"
        >
          Zerar dados ou excluir a conta
          <ChevronDown
            className={`w-4 h-4 text-fg-3 shrink-0 viagem ${showAcoesIrreversiveis ? "rotate-180" : ""}`}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>

        {showAcoesIrreversiveis && (
          <div className="px-4 md:px-5 divide-y divide-line border-t border-line">
            {[
              { titulo: "Zerar meus dados", detalhe: "Apaga tudo o que você lançou. O login continua.", acao: "Zerar", abrir: () => setShowResetConfirm(true) },
              { titulo: "Excluir minha conta", detalhe: "Apaga os dados e o login.", acao: "Excluir", abrir: () => setShowExcluirConfirm(true) },
            ].map((l) => (
              <div key={l.titulo} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-[15px] md:text-sm text-fg">{l.titulo}</p>
                  <p className="text-xs text-fg-2 mt-0.5">{l.detalhe}</p>
                </div>
                <Button variante="fantasma" className="shrink-0 -mr-3 !text-danger-ink" onClick={l.abrir}>
                  {l.acao}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <ConfirmarComSenha
        aberto={showResetConfirm}
        titulo="Zerar meus dados"
        aviso={
          <>
            Apaga{" "}
            {itensZerar.map((item, i) => (
              <span key={item.label}>
                <span className="valor">{item.quantidade}</span> {item.label}
                {i < itensZerar.length - 2 ? ", " : i === itensZerar.length - 2 ? " e " : ""}
              </span>
            ))}
            . O login continua, e você começa do zero.
          </>
        }
        rotuloEnviar="Zerar dados"
        onConfirmar={handleResetConta}
        onFechar={() => setShowResetConfirm(false)}
      />
      <ConfirmarComSenha
        aberto={showExcluirConfirm}
        titulo="Excluir minha conta"
        aviso="Apaga seus dados e o login. Não dá para desfazer."
        rotuloEnviar="Excluir conta"
        onConfirmar={handleExcluirConta}
        onFechar={() => setShowExcluirConfirm(false)}
      />
    </div>
  );
};
