import { useState } from "react";
import { Users, Plus, Trash2, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAppContext } from "../context";
import { formatCurrency, formatMonthYear } from "../utils/calculations";

const COLORS = ["#10B981", "#F59E0B"]; // emerald, amber

export const PessoasPage = () => {
  const {
    pessoas,
    novaPessoa,
    setNovaPessoa,
    handleAddPessoa,
    handleRemovePessoa,
    setModalConfirm,
    resumoMensal,
    saldosDevedores,
    mesVisualizacao,
    navegarMes,
    irParaHoje,
  } = useAppContext();

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pessoaExpandida, setPessoaExpandida] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!novaPessoa.trim()) return;
    setAdding(true);
    await handleAddPessoa();
    setAdding(false);
    setShowAddForm(false);
  };

  const handleDelete = (nome: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir Pessoa",
      mensagem: `Tem certeza que deseja excluir "${nome}"? Isso não afetará gastos ou dívidas já cadastradas.`,
      onConfirm: () => {
        handleRemovePessoa(nome);
        setModalConfirm({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });
      },
    });
  };

  // Calcular estatísticas por pessoa
  const getEstatisticasPessoa = (nome: string) => {
    const resumoPessoa = resumoMensal.find((r) => r.pessoa === nome);
    const dividasPessoa = saldosDevedores.filter((d) => d.pessoa === nome);
    
    const gastosMesAtual = resumoPessoa?.total || 0;
    const dividasPendentes = dividasPessoa.filter((d) => d.valor_atual > 0);
    const totalDividas = dividasPendentes.reduce((sum, d) => sum + d.valor_atual, 0);
    const qtdDividas = dividasPendentes.length;
    
    return { gastosMesAtual, totalDividas, qtdDividas };
  };

  // Totais gerais
  const totalGastosMes = resumoMensal.reduce((sum, r) => sum + r.total, 0);
  const totalDividasGeral = saldosDevedores
    .filter((d) => d.valor_atual > 0)
    .reduce((sum, d) => sum + d.valor_atual, 0);

  // Dados do gráfico geral
  const dadosGraficoGeral = [
    { name: "Gastos do Mês", value: totalGastosMes },
    { name: "Dívidas Pendentes", value: totalDividasGeral },
  ].filter((d) => d.value > 0);

  const toggleExpand = (nome: string) => {
    setPessoaExpandida(pessoaExpandida === nome ? null : nome);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Devedores</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie pessoas com valores em aberto com você</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Novo Devedor</span>
        </button>
      </div>

      {/* Seletor de Mês */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navegarMes("anterior")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {formatMonthYear(mesVisualizacao)}
            </h2>
            <button
              onClick={irParaHoje}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              Ir para hoje
            </button>
          </div>
          <button
            onClick={() => navegarMes("proximo")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Add Person Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Adicionar Devedor</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={novaPessoa}
              onChange={(e) => setNovaPessoa(e.target.value)}
              placeholder="Nome do devedor"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !novaPessoa.trim()}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Adicionar
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNovaPessoa(""); }}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* People List with Charts */}
      <div className="space-y-3">
        {pessoas.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum devedor cadastrado</p>
          </div>
        ) : (
          pessoas.map((pessoa) => {
            const stats = getEstatisticasPessoa(pessoa);
            const isExpanded = pessoaExpandida === pessoa;
            const dadosGraficoPessoa = [
              { name: "Gastos do Mês", value: stats.gastosMesAtual },
              { name: "Dívidas", value: stats.totalDividas },
            ].filter((d) => d.value > 0);

            return (
              <div
                key={pessoa}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                {/* Header clicável */}
                <div
                  onClick={() => toggleExpand(pessoa)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                        {pessoa.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{pessoa}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {formatCurrency(stats.gastosMesAtual + stats.totalDividas)} total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(pessoa); }}
                      disabled={pessoas.length <= 1}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido com gráfico */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                        <p className="text-blue-600 dark:text-blue-400 text-xs mb-1">Gastos do Mês</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(stats.gastosMesAtual)}</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                        <p className="text-orange-600 dark:text-orange-400 text-xs mb-1">Dívidas Pendentes</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(stats.totalDividas)}</p>
                      </div>
                    </div>

                    {dadosGraficoPessoa.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height={192}>
                          <PieChart>
                            <Pie
                              data={dadosGraficoPessoa}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {dadosGraficoPessoa.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatCurrency(Number(value))}
                              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                              itemStyle={{ color: "#374151" }}
                              labelStyle={{ color: "#6b7280" }}
                            />
                            <Legend
                              formatter={(value) => <span className="text-gray-600 dark:text-gray-400 text-sm">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-center py-4">Sem dados para exibir</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Gráfico Total */}
      {pessoas.length > 0 && (totalGastosMes > 0 || totalDividasGeral > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">Resumo Total</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
              <p className="text-blue-600 dark:text-blue-400 text-xs mb-1">Total Gastos do Mês</p>
              <p className="text-gray-900 dark:text-gray-100 font-bold text-lg">{formatCurrency(totalGastosMes)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
              <p className="text-orange-600 dark:text-orange-400 text-xs mb-1">Total Dívidas</p>
              <p className="text-gray-900 dark:text-gray-100 font-bold text-lg">{formatCurrency(totalDividasGeral)}</p>
            </div>
          </div>

          {dadosGraficoGeral.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={dadosGraficoGeral}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dadosGraficoGeral.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    itemStyle={{ color: "#374151" }}
                    labelStyle={{ color: "#6b7280" }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-gray-600 dark:text-gray-400 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-center mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Geral</p>
            <p className="text-gray-900 dark:text-gray-100 font-bold text-2xl">
              {formatCurrency(totalGastosMes + totalDividasGeral)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
