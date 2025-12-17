import { createClient } from "@supabase/supabase-js";
import type { Gasto, SaldoDevedor } from "../types/index";

// Configure suas credenciais do Supabase aqui
// Você pode encontrá-las em: Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Verifica se as credenciais foram configuradas
export const isSupabaseConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("SUA_URL") &&
  !supabaseAnonKey.includes("SUA_CHAVE");

// Cria o cliente apenas se configurado, senão usa um placeholder
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ========== FUNÇÕES DE GASTOS ==========
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
    const { data, error } = await supabase
      .from("gastos")
      .insert([gasto])
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
    const { error } = await supabase
      .from("gastos")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Erro ao deletar gasto:", error);
      return false;
    }
    
    return true;
  }
};

// ========== FUNÇÕES DE SALDOS DEVEDORES ==========
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
    const { data, error } = await supabase
      .from("saldos_devedores")
      .insert([saldo])
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
  }
};

// ========== FUNÇÕES DE PESSOAS ==========
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
    const { error } = await supabase
      .from("pessoas")
      .insert([pessoa]);
    
    if (error) {
      console.error("Erro ao criar pessoa:", error);
      return false;
    }
    
    return true;
  },

  async delete(id: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
      .from("pessoas")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Erro ao deletar pessoa:", error);
      return false;
    }
    
    return true;
  }
};
