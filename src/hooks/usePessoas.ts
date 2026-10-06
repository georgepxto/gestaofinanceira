import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  isSupabaseConfigured,
  pessoasFunctions,
} from "../lib/supabase";
import { toast } from "../components/ui/Toaster";

interface UsePessoasProps {
  user: { id: string } | null;
}

export function usePessoas({ user }: UsePessoasProps) {
  const [pessoas, setPessoas] = useState<string[]>([]);
  const [pessoasLoaded, setPessoasLoaded] = useState<boolean>(false);
  const [novaPessoa, setNovaPessoa] = useState<string>("");
  const [showAddPessoa, setShowAddPessoa] = useState<boolean>(false);

  // Carregar pessoas do Supabase (ou localStorage como fallback)
  const fetchPessoas = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback para localStorage em modo demo
      const saved = localStorage.getItem("pessoas");
      const data = saved ? JSON.parse(saved) : [];
      setPessoas(data);
      setPessoasLoaded(true);
      return;
    }

    try {
      const data = await pessoasFunctions.getAll();
      setPessoas(data.map((p) => p.nome));
    } catch (err) {
      console.error("Erro ao carregar pessoas:", err);
      setPessoas([]);
    }
    setPessoasLoaded(true);
  }, []);

  // Carregar pessoas quando usuário logar
  useEffect(() => {
    if (user) {
      fetchPessoas();
    }
  }, [user, fetchPessoas]);

  // Modo demonstração (sem banco): a lista mora no navegador.
  useEffect(() => {
    // Vazia também: senão excluir a última pessoa a deixava guardada.
    if (!isSupabaseConfigured && pessoasLoaded) {
      localStorage.setItem("pessoas", JSON.stringify(pessoas));
    }
  }, [pessoas, pessoasLoaded]);

  // Adicionar nova pessoa
  const handleAddPessoa = async (
    onSuccess?: (nome: string) => void
  ) => {
    const nome = novaPessoa.trim();
    if (nome && !pessoas.includes(nome)) {
      if (isSupabaseConfigured && supabase) {
        let novoId = "";
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          novoId = crypto.randomUUID();
        } else {
          novoId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        const sucesso = await pessoasFunctions.create({ id: novoId, nome });
        if (!sucesso) {
          toast.error(`Não foi possível salvar ${nome}. Confira se o nome já existe e tente de novo.`);
          return; // Aborta e não adiciona na interface se der erro
        }
      }
      setPessoas((prev) => [...prev, nome]);
      setNovaPessoa("");
      setShowAddPessoa(false);
      onSuccess?.(nome);
      toast.success(`A pessoa ${nome} foi adicionada com sucesso!`);
    }
  };

  /**
   * Cadastra uma pessoa pelo nome, sem passar pela tela de Por pessoa (o
   * formulário de gasto dividido usa). Devolve o nome salvo ou um erro.
   */
  const adicionarPessoa = async (nomeBruto: string): Promise<{ nome?: string; erro?: string }> => {
    const nome = nomeBruto.trim().replace(/\s+/g, " ");
    if (!nome) return { erro: "Digite um nome." };
    const existente = pessoas.find((p) => p.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"));
    if (existente) return { nome: existente };
    if (isSupabaseConfigured && supabase) {
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      const ok = await pessoasFunctions.create({ id, nome });
      if (!ok) return { erro: `Não foi possível salvar ${nome}.` };
    }
    setPessoas((prev) => [...prev, nome]);
    return { nome };
  };

  // Remover pessoa
  const handleRemovePessoa = async (nome: string) => {
    if (isSupabaseConfigured && supabase) {
      // Buscar ID da pessoa e deletar
      const pessoasData = await pessoasFunctions.getAll();
      const pessoaToDelete = pessoasData.find((p) => p.nome === nome);
      if (pessoaToDelete && !(await pessoasFunctions.delete(pessoaToDelete.id))) {
        toast.error(`Não foi possível remover ${nome}. Tente de novo.`);
        return;
      }
    }
    setPessoas((prev) => prev.filter((p) => p !== nome));
  };

  return {
    pessoas,
    setPessoas,
    pessoasLoaded,
    novaPessoa,
    setNovaPessoa,
    showAddPessoa,
    setShowAddPessoa,
    fetchPessoas,
    handleAddPessoa,
    adicionarPessoa,
    handleRemovePessoa,
  };
}
