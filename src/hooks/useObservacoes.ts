import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  observacoesFunctions,
} from "../lib/supabase";

interface UseObservacoesProps {
  mesVisualizacao: Date;
  user: { id: string } | null;
}

export function useObservacoes({ mesVisualizacao, user }: UseObservacoesProps) {
  const [observacoesMes, setObservacoesMes] = useState<Record<string, string>>(
    {}
  );
  const [showObsModal, setShowObsModal] = useState<string | null>(null);
  const [obsTexto, setObsTexto] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Gerar chave única para observações (pessoa + mês/ano)
  const getObsKey = useCallback(
    (pessoa: string) => {
      return `${pessoa}_${format(mesVisualizacao, "yyyy-MM")}`;
    },
    [mesVisualizacao]
  );

  // Obter mês atual no formato yyyy-MM
  const getMesAtual = useCallback(() => {
    return format(mesVisualizacao, "yyyy-MM");
  }, [mesVisualizacao]);

  // Carregar observações do Supabase (ou localStorage como fallback)
  const fetchObservacoes = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem("observacoesMes");
      if (saved) {
        setObservacoesMes(JSON.parse(saved));
      }
      return;
    }

    try {
      const data = await observacoesFunctions.getAll();
      const obsMap: Record<string, string> = {};
      data.forEach((item) => {
        obsMap[`${item.pessoa}_${item.mes}`] = item.observacao;
      });
      setObservacoesMes(obsMap);
    } catch (err) {
      console.error("Erro ao carregar observações:", err);
    }
  }, []);

  // Carregar observações quando usuário logar
  useEffect(() => {
    if (user) {
      fetchObservacoes();
    }
  }, [user, fetchObservacoes]);

  // Salvar observações no localStorage como backup (modo demo)
  useEffect(() => {
    if (!isSupabaseConfigured && Object.keys(observacoesMes).length > 0) {
      localStorage.setItem("observacoesMes", JSON.stringify(observacoesMes));
    }
  }, [observacoesMes]);

  // Salvar observação de uma pessoa
  const handleSalvarObs = async (pessoa: string) => {
    const key = getObsKey(pessoa);
    const mes = getMesAtual();

    setSaving(true);
    try {
      if (obsTexto.trim()) {
        // Salvar no Supabase
        if (isSupabaseConfigured && supabase) {
          await observacoesFunctions.upsert(pessoa, mes, obsTexto.trim());
        }
        setObservacoesMes((prev) => ({ ...prev, [key]: obsTexto.trim() }));
      } else {
        // Remover se vazio
        if (isSupabaseConfigured && supabase) {
          await observacoesFunctions.delete(pessoa, mes);
        }
        setObservacoesMes((prev) => {
          const newObs = { ...prev };
          delete newObs[key];
          return newObs;
        });
      }
      setShowObsModal(null);
      setObsTexto("");
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de observação
  const handleAbrirObs = (pessoa: string) => {
    const key = getObsKey(pessoa);
    setObsTexto(observacoesMes[key] || "");
    setShowObsModal(pessoa);
  };

  return {
    observacoesMes,
    showObsModal,
    setShowObsModal,
    obsTexto,
    setObsTexto,
    saving,
    getObsKey,
    getMesAtual,
    fetchObservacoes,
    handleSalvarObs,
    handleAbrirObs,
  };
}
