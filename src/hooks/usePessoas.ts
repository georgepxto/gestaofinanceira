import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  isSupabaseConfigured,
  pessoasFunctions,
} from "../lib/supabase";

export function usePessoas() {
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
        await pessoasFunctions.create({ id: `pessoa-${Date.now()}`, nome });
      }
      setPessoas((prev) => [...prev, nome]);
      setNovaPessoa("");
      setShowAddPessoa(false);
      onSuccess?.(nome);
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
