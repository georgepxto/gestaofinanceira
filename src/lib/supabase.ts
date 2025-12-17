import { createClient } from "@supabase/supabase-js";

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
