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

  // Salvar pessoas no localStorage como backup
  useEffect(() => {
    if (pessoasLoaded && pessoas.length > 0) {
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
          alert(`Falha ao salvar: A pessoa "${nome}" já existe no banco de dados com este nome ou houve um problema de conexão.`);
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

  // Remover pessoa
  const handleRemovePessoa = async (nome: string) => {
    if (pessoas.length > 1) {
      if (isSupabaseConfigured && supabase) {
        // Buscar ID da pessoa e deletar
        const pessoasData = await pessoasFunctions.getAll();
        const pessoaToDelete = pessoasData.find((p) => p.nome === nome);
        if (pessoaToDelete) {
          await pessoasFunctions.delete(pessoaToDelete.id);
        }
      }
      setPessoas((prev) => prev.filter((p) => p !== nome));
    }
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
    handleRemovePessoa,
  };
}
