import { useState, useEffect, useCallback } from "react";
import { Target, Plus, X, Loader2 } from "lucide-react";
import { useAppContext } from "../context";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../utils/calculations";
import { CATEGORIAS } from "../utils/categories";
import type { MetaGasto } from "../types";

export const MetasPage = () => {
  const { user, setModalFeedback } = useAppContext();

  const [metas, setMetas] = useState<MetaGasto[]>([]);
  const [novaMeta, setNovaMeta] = useState({ categoria: "", limite: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMetas = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("metas_gasto").select("*").order("categoria");
    setMetas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetas();
  }, [fetchMetas]);

  const handleAddMeta = async () => {
    if (!supabase || !novaMeta.categoria.trim() || !novaMeta.limite) return;
    setSavingMeta(true);
    try {
      const { error } = await supabase.from("metas_gasto").upsert({
        categoria: novaMeta.categoria.trim(),
        limite: parseFloat(novaMeta.limite),
        user_id: user?.id,
      }, { onConflict: "user_id,categoria" });
      if (error) throw error;
      setNovaMeta({ categoria: "", limite: "" });
      fetchMetas();
      setModalFeedback({ show: true, titulo: "Sucesso!", mensagem: "Meta salva com sucesso.", tipo: "sucesso" });
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      setModalFeedback({ show: true, titulo: "Erro", mensagem: "Não foi possível salvar a meta.", tipo: "info" });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDeleteMeta = async (id: string) => {
    if (!supabase) return;
    await supabase.from("metas_gasto").delete().eq("id", id);
    fetchMetas();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Target className="w-7 h-7 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Metas de Gasto</h1>
          <p className="text-gray-400 text-sm">Defina tetos mensais por categoria</p>
        </div>
      </div>

      {/* Adicionar nova meta */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Nova Meta</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={novaMeta.categoria}
            onChange={(e) => setNovaMeta({ ...novaMeta, categoria: e.target.value })}
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none"
          >
            <option value="" disabled>Selecione uma categoria</option>
            {CATEGORIAS
              .filter(cat => !metas.some(m => m.categoria.toLowerCase() === cat.toLowerCase()))
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))
            }
          </select>
          <div className="relative w-full sm:w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
            <input
              type="number"
              value={novaMeta.limite}
              onChange={(e) => setNovaMeta({ ...novaMeta, limite: e.target.value })}
              placeholder="0,00"
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <button
            onClick={handleAddMeta}
            disabled={savingMeta || !novaMeta.categoria.trim() || !novaMeta.limite}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {savingMeta ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Salvar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Selecione a categoria e defina o limite mensal. As barras de progresso aparecerão no Dashboard.
        </p>
      </section>

      {/* Lista de metas */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Suas Metas</h2>
        {metas.length > 0 ? (
          <div className="space-y-3">
            {metas.map((meta) => (
              <div key={meta.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white capitalize">{meta.categoria}</span>
                    <p className="text-gray-400 text-xs">Limite: {formatCurrency(meta.limite)} / mês</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMeta(meta.id)}
                  className="p-2 hover:bg-red-600/20 rounded-lg transition-colors group"
                  title="Remover meta"
                >
                  <X className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma meta definida ainda.</p>
            <p className="text-gray-600 text-sm mt-1">Adicione uma meta acima para começar a monitorar seus gastos.</p>
          </div>
        )}
      </section>
    </div>
  );
};
