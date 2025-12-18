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
        emailRedirectTo: "https://gestaofinanceira-orcin.vercel.app/",
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
  ): Promise<{ user: User | null; error: string | null }> {
    if (!supabase) return { user: null, error: "Supabase não configurado" };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Erro ao fazer login:", error);
      let errorMessage = error.message;
      if (error.message === "Invalid login credentials") {
        errorMessage = "Email ou senha incorretos";
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
    const { error } = await supabase
      .from("pessoas")
      .insert([{ ...pessoa, user_id }]);

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
