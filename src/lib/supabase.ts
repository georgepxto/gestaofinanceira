import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Gasto, SaldoDevedor, MeuGasto } from "../types/index";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("SUA_URL") &&
  !supabaseAnonKey.includes("SUA_CHAVE");

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========
export const authFunctions = {
  async signUp(
    email: string,
    password: string,
    nome: string
  ): Promise<{ user: User | null; error: string | null }> {
    if (!supabase) return { user: null, error: "Supabase não configurado" };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: nome,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Erro ao criar conta:", error);
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  },

  async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: string | null; blocked?: boolean; remainingAttempts?: number }> {
    if (!supabase) return { user: null, error: "Supabase não configurado" };

    // 1. Verificar se email está bloqueado
    try {
      const { data: blockCheck, error: blockError } = await supabase.rpc("check_login_blocked", {
        p_email: email,
      });
      if (blockError) {
        console.warn("[Auth] check_login_blocked falhou:", blockError.message);
      } else if (blockCheck?.blocked) {
        return {
          user: null,
          error: blockCheck.message || "Conta temporariamente bloqueada por excesso de tentativas.",
          blocked: true,
          remainingAttempts: 0,
        };
      }
    } catch (e) {
      console.warn("[Auth] check_login_blocked não disponível:", e);
    }

    // 2. Tentar login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 3. Registrar tentativa (login bem-sucedido ou falho)
    const success = !error;
    let remainingAttempts = 5;
    try {
      const { data: attemptResult, error: attemptError } = await supabase.rpc("record_login_attempt", {
        p_email: email,
        p_success: success,
      });
      if (attemptError) {
        console.error("[Auth] record_login_attempt falhou:", attemptError.message);
      } else if (attemptResult) {
        remainingAttempts = attemptResult.remaining_attempts ?? 5;
        if (attemptResult.blocked) {
          return {
            user: null,
            error: attemptResult.message || "Conta bloqueada por excesso de tentativas.",
            blocked: true,
            remainingAttempts: 0,
          };
        }
      }
    } catch (e) {
      console.warn("[Auth] record_login_attempt não disponível:", e);
    }

    if (error) {
      console.error("Erro ao fazer login:", error);
      let errorMessage = error.message;
      if (error.message === "Invalid login credentials") {
        errorMessage = remainingAttempts < 5
          ? `Email ou senha incorretos. ${remainingAttempts} tentativa${remainingAttempts !== 1 ? "s" : ""} restante${remainingAttempts !== 1 ? "s" : ""}.`
          : "Email ou senha incorretos";
      }
      return { user: null, error: errorMessage };
    }

    return { user: data.user, error: null };
  },

  async signOut(): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Supabase não configurado" };

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao fazer logout:", error);
      return { error: error.message };
    }

    return { error: null };
  },

  async getUser(): Promise<User | null> {
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };

    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },
};

const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    console.error("Usuário não autenticado - user_id não disponível");
    return null;
  }
  return session.user.id;
};

export const gastosFunctions = {
  async getAll(): Promise<Gasto[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .order("data_inicio", { ascending: false });

    if (error) {
      console.error("Erro ao buscar gastos:", error);
      return [];
    }

    return data || [];
  },

  async create(gasto: Omit<Gasto, "id">): Promise<Gasto | null> {
    if (!supabase) return null;
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from("gastos")
      .insert([{ ...gasto, user_id }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar gasto:", error);
      return null;
    }

    return data;
  },

  async update(id: string, updates: Partial<Gasto>): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("gastos")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar gasto:", error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from("gastos").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar gasto:", error);
      return false;
    }

    return true;
  },
};

export const saldosFunctions = {
  async getAll(): Promise<SaldoDevedor[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("saldos_devedores")
      .select("*")
      .order("data_criacao", { ascending: false });

    if (error) {
      console.error("Erro ao buscar saldos:", error);
      return [];
    }

    return data || [];
  },

  async create(saldo: SaldoDevedor): Promise<SaldoDevedor | null> {
    if (!supabase) return null;
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from("saldos_devedores")
      .insert([{ ...saldo, user_id }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar saldo devedor:", error);
      return null;
    }

    return data;
  },

  async update(id: string, updates: Partial<SaldoDevedor>): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("saldos_devedores")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar saldo devedor:", error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("saldos_devedores")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar saldo devedor:", error);
      return false;
    }

    return true;
  },
};

export const pessoasFunctions = {
  async getAll(): Promise<{ id: string; nome: string }[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("pessoas")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar pessoas:", error);
      return [];
    }

    return data || [];
  },

  async create(pessoa: { id: string; nome: string }): Promise<boolean> {
    if (!supabase) return false;
    const user_id = await getCurrentUserId();
    
    // Incluir o ID gerado se estiver presente, senão o supabase deveria gerar (mas deu erro de not-null)
    const payload = pessoa.id 
      ? { id: pessoa.id, nome: pessoa.nome, user_id } 
      : { nome: pessoa.nome, user_id };
      
    const { error } = await supabase
      .from("pessoas")
      .insert([payload]);

    if (error) {
      console.error("Erro ao criar pessoa:", error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from("pessoas").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar pessoa:", error);
      return false;
    }

    return true;
  },
};

// ========== CATEGORIAS PERSONALIZADAS ==========
export type TipoCategoria = "gasto" | "receita";

export interface CategoriaUsuario {
  id: string;
  tipo: TipoCategoria;
  nome: string;
  ordem: number;
}

// Onde o nome da categoria aparece gravado em cada tipo. Renomear ou excluir
// uma categoria tem que passar por todas — senão o lançamento antigo fica
// apontando para um nome que não existe mais em lugar nenhum.
const COLUNAS_DE_CATEGORIA: Record<TipoCategoria, { tabela: string; coluna: string }[]> = {
  gasto: [
    { tabela: "gastos", coluna: "categoria" },
    { tabela: "meus_gastos", coluna: "categoria_gasto" },
    { tabela: "transacoes_cartao", coluna: "categoria" },
  ],
  receita: [{ tabela: "receitas", coluna: "categoria" }],
};

export const categoriasFunctions = {
  async getAll(): Promise<CategoriaUsuario[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("categorias_usuario")
      .select("id, tipo, nome, ordem")
      .order("ordem", { ascending: true });

    if (error) {
      console.error("Erro ao buscar categorias:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Grava a lista padrão inteira na primeira personalização. Até aqui a pessoa
   * não tinha linha nenhuma e o app mostrava o padrão do código; a partir daqui
   * a tabela é a verdade, e é sobre estas linhas que criar/renomear/excluir
   * passam a operar.
   */
  async materializar(tipo: TipoCategoria, nomes: string[]): Promise<CategoriaUsuario[]> {
    if (!supabase) return [];
    const user_id = await getCurrentUserId();
    if (!user_id) return [];

    const { data, error } = await supabase
      .from("categorias_usuario")
      .insert(nomes.map((nome, i) => ({ user_id, tipo, nome, ordem: i })))
      .select("id, tipo, nome, ordem");

    if (error) {
      console.error("Erro ao materializar categorias padrão:", error);
      return [];
    }

    return data || [];
  },

  async create(
    tipo: TipoCategoria,
    nome: string,
    ordem: number
  ): Promise<CategoriaUsuario | null> {
    if (!supabase) return null;
    const user_id = await getCurrentUserId();
    if (!user_id) return null;

    const { data, error } = await supabase
      .from("categorias_usuario")
      .insert([{ user_id, tipo, nome, ordem }])
      .select("id, tipo, nome, ordem")
      .single();

    if (error) {
      console.error("Erro ao criar categoria:", error);
      return null;
    }

    return data;
  },

  async rename(id: string, nome: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("categorias_usuario")
      .update({ nome })
      .eq("id", id);

    if (error) {
      console.error("Erro ao renomear categoria:", error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("categorias_usuario")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir categoria:", error);
      return false;
    }

    return true;
  },

  /**
   * Leva o nome novo para os lançamentos já gravados. Sem isto, renomear
   * "Lazer" para "Diversão" deixaria o histórico inteiro numa categoria órfã e
   * o gráfico ganharia duas fatias onde havia uma.
   */
  async aplicarRenomeacao(
    tipo: TipoCategoria,
    antigo: string,
    novo: string
  ): Promise<void> {
    if (!supabase || antigo === novo) return;

    for (const { tabela, coluna } of COLUNAS_DE_CATEGORIA[tipo]) {
      const { error } = await supabase
        .from(tabela)
        .update({ [coluna]: novo })
        .eq(coluna, antigo);
      if (error) console.error(`Erro ao renomear categoria em ${tabela}:`, error);
    }

    if (tipo === "gasto") await renomearMeta(antigo, novo);
  },

  /**
   * Move os lançamentos da categoria excluída para outra. Chamado com o
   * substituto já escolhido pela tela, que é quem sabe o que sobrou na lista.
   */
  async aplicarSubstituicao(
    tipo: TipoCategoria,
    removido: string,
    substituto: string
  ): Promise<void> {
    if (!supabase) return;

    for (const { tabela, coluna } of COLUNAS_DE_CATEGORIA[tipo]) {
      const { error } = await supabase
        .from(tabela)
        .update({ [coluna]: substituto })
        .eq(coluna, removido);
      if (error) console.error(`Erro ao remanejar categoria em ${tabela}:`, error);
    }

    // A meta da categoria excluída é apagada, não remanejada: somar dois
    // limites mensais num só seria inventar um orçamento que ninguém definiu.
    if (tipo === "gasto") {
      const { error } = await supabase
        .from("metas_gasto")
        .delete()
        .eq("categoria", removido);
      if (error) console.error("Erro ao excluir meta da categoria:", error);
    }
  },

  /** Quantos lançamentos usam a categoria — a tela mostra antes de excluir. */
  async contarUsos(tipo: TipoCategoria, nome: string): Promise<number> {
    if (!supabase) return 0;

    const contagens = await Promise.all(
      COLUNAS_DE_CATEGORIA[tipo].map(async ({ tabela, coluna }) => {
        const { count, error } = await supabase!
          .from(tabela)
          .select("id", { count: "exact", head: true })
          .eq(coluna, nome);
        if (error) {
          console.error(`Erro ao contar uso da categoria em ${tabela}:`, error);
          return 0;
        }
        return count || 0;
      })
    );

    return contagens.reduce((soma, n) => soma + n, 0);
  },
};

/**
 * `metas_gasto` tem UNIQUE(user_id, categoria): renomear para uma categoria que
 * já tem meta violaria a restrição. Nesse caso a meta antiga sai de cena e o
 * limite do destino prevalece — o usuário definiu aquele número por último.
 */
async function renomearMeta(antigo: string, novo: string): Promise<void> {
  if (!supabase) return;

  const { data: destino } = await supabase
    .from("metas_gasto")
    .select("id")
    .eq("categoria", novo)
    .limit(1);

  const query = destino && destino.length > 0
    ? supabase.from("metas_gasto").delete().eq("categoria", antigo)
    : supabase.from("metas_gasto").update({ categoria: novo }).eq("categoria", antigo);

  const { error } = await query;
  if (error) console.error("Erro ao ajustar meta da categoria:", error);
}

export const meusGastosFunctions = {
  async getAll(): Promise<MeuGasto[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("meus_gastos")
      .select("*")
      .order("data", { ascending: false });

    if (error) {
      console.error("Erro ao buscar meus gastos:", error);
      return [];
    }

    return data || [];
  },

  async create(gasto: MeuGasto): Promise<MeuGasto | null> {
    if (!supabase) return null;
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from("meus_gastos")
      .insert([{ ...gasto, user_id }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar meu gasto:", error);
      return null;
    }

    return data;
  },

  async update(id: string, updates: Partial<MeuGasto>): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("meus_gastos")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar meu gasto:", error);
      return false;
    }

    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from("meus_gastos").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar meu gasto:", error);
      return false;
    }

    return true;
  },
};

export const observacoesFunctions = {
  async getAll(): Promise<
    { pessoa: string; mes: string; observacao: string }[]
  > {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("observacoes_mes")
      .select("pessoa, mes, observacao");

    if (error) {
      console.error("Erro ao buscar observações:", error);
      return [];
    }

    return data || [];
  },

  async upsert(
    pessoa: string,
    mes: string,
    observacao: string
  ): Promise<boolean> {
    if (!supabase) return false;
    const user_id = await getCurrentUserId();
    if (!user_id) return false;

    const { error } = await supabase.from("observacoes_mes").upsert(
      {
        user_id,
        pessoa,
        mes,
        observacao,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pessoa,mes" }
    );

    if (error) {
      console.error("Erro ao salvar observação:", error);
      return false;
    }

    return true;
  },

  async delete(pessoa: string, mes: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("observacoes_mes")
      .delete()
      .eq("pessoa", pessoa)
      .eq("mes", mes);

    if (error) {
      console.error("Erro ao deletar observação:", error);
      return false;
    }

    return true;
  },
};

// ========== FUNÇÕES DE PAGAMENTOS PARCIAIS ==========
export interface PagamentoParcialDB {
  id?: string;
  pessoa: string;
  mes: string;
  valor: number;
  data_pagamento: string;
}

export const pagamentosParciaisFunctions = {
  async getAll(): Promise<PagamentoParcialDB[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("pagamentos_parciais")
      .select("id, pessoa, mes, valor, data_pagamento")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar pagamentos parciais:", error);
      return [];
    }

    return data || [];
  },

  async create(
    pagamento: PagamentoParcialDB
  ): Promise<PagamentoParcialDB | null> {
    if (!supabase) return null;
    const user_id = await getCurrentUserId();
    if (!user_id) return null;

    const { data, error } = await supabase
      .from("pagamentos_parciais")
      .insert([{ ...pagamento, user_id }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar pagamento parcial:", error);
      return null;
    }

    return data;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("pagamentos_parciais")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar pagamento parcial:", error);
      return false;
    }

    return true;
  },

  async deleteByPessoaMes(pessoa: string, mes: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("pagamentos_parciais")
      .delete()
      .eq("pessoa", pessoa)
      .eq("mes", mes);

    if (error) {
      console.error("Erro ao deletar pagamentos parciais:", error);
      return false;
    }

    return true;
  },
};
