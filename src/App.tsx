import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CreditCard,
  Wallet,
  TrendingDown,
  User,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  Loader2,
  AlertCircle,
  Trash2,
  UserPlus,
  Receipt,
  History,
  MinusCircle,
  Clock,
  CheckCircle,
  Undo2,
} from "lucide-react";
import { addMonths, subMonths, format } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  saldosFunctions,
  pessoasFunctions,
} from "./lib/supabase";
import type {
  Gasto,
  GastoForm,
  ParcelaAtiva,
  ResumoMensal,
  SaldoDevedor,
  SaldoDevedorForm,
} from "./types";
import {
  formatMonthYear,
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
  getParcelasAtivas,
  calcularResumoMensal,
  calcularTotalMes,
} from "./utils/calculations";
import "./index.css";

// Opções de parcelas
const PARCELAS_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

// Dados de demonstração para quando o Supabase não está configurado
const DADOS_DEMO: Gasto[] = [
  {
    id: "1",
    descricao: "iPhone 15 Pro",
    pessoa: "Pai",
    valor_total: 5999,
    num_parcelas: 12,
    data_inicio: "2024-10-15",
    tipo: "credito",
  },
  {
    id: "2",
    descricao: "Geladeira Brastemp",
    pessoa: "Mãe",
    valor_total: 3500,
    num_parcelas: 10,
    data_inicio: "2024-11-01",
    tipo: "credito",
  },
  {
    id: "3",
    descricao: "Supermercado",
    pessoa: "Pai",
    valor_total: 850,
    num_parcelas: 1,
    data_inicio: "2024-12-10",
    tipo: "debito",
  },
  {
    id: "4",
    descricao: "Curso de Inglês",
    pessoa: "Mãe",
    valor_total: 2400,
    num_parcelas: 6,
    data_inicio: "2024-09-20",
    tipo: "credito",
  },
  {
    id: "5",
    descricao: "TV 55 polegadas",
    pessoa: "Pai",
    valor_total: 2800,
    num_parcelas: 5,
    data_inicio: "2024-10-01",
    tipo: "credito",
  },
];

function App() {
  // Aba ativa: 'gastos' ou 'dividas'
  const [abaAtiva, setAbaAtiva] = useState<"gastos" | "dividas">("gastos");

  // Estado do mês de visualização
  const [mesVisualizacao, setMesVisualizacao] = useState<Date>(new Date());

  // Estados de dados
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parcelasAtivas, setParcelasAtivas] = useState<ParcelaAtiva[]>([]);
  // Modo demo quando Supabase não está configurado
  const [modoDemo, setModoDemo] = useState<boolean>(false);
  const [resumoMensal, setResumoMensal] = useState<ResumoMensal[]>([]);
  const [totalMes, setTotalMes] = useState<number>(0);

  // Saldo Devedor
  const [saldosDevedores, setSaldosDevedores] = useState<SaldoDevedor[]>([]);
  const [saldosLoaded, setSaldosLoaded] = useState<boolean>(false);
  const [showFormDivida, setShowFormDivida] = useState<boolean>(false);
  const [showPagamento, setShowPagamento] = useState<string | null>(null);
  const [formDivida, setFormDivida] = useState<SaldoDevedorForm>({
    pessoa: "",
    descricao: "",
    valor: "",
  });
  const [valorPagamento, setValorPagamento] = useState<string>("");
  const [obsPagamento, setObsPagamento] = useState<string>("");
  const [filtroPessoaDivida, setFiltroPessoaDivida] = useState<string>(""); // "" = todos
  const [filtroStatusDivida, setFiltroStatusDivida] = useState<
    "pendentes" | "pagos"
  >("pendentes");

  // Fechar Mês
  const [showFecharMes, setShowFecharMes] = useState<string | null>(null); // pessoa
  const [valorPagoFecharMes, setValorPagoFecharMes] = useState<string>("");

  // Modal de Feedback
  const [modalFeedback, setModalFeedback] = useState<{
    show: boolean;
    titulo: string;
    mensagem: string;
    tipo: "sucesso" | "info";
  }>({ show: false, titulo: "", mensagem: "", tipo: "sucesso" });

  // Modal de Confirmação
  const [modalConfirm, setModalConfirm] = useState<{
    show: boolean;
    titulo: string;
    mensagem: string;
    onConfirm: () => void;
  }>({ show: false, titulo: "", mensagem: "", onConfirm: () => {} });

  // Lista de pessoas (dinâmica)
  const [pessoas, setPessoas] = useState<string[]>([]);
  const [pessoasLoaded, setPessoasLoaded] = useState<boolean>(false);
  const [novaPessoa, setNovaPessoa] = useState<string>("");
  const [showAddPessoa, setShowAddPessoa] = useState<boolean>(false);

  // Estados de UI
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState<GastoForm>({
    descricao: "",
    pessoa: "",
    valor_total: "",
    num_parcelas: 1,
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    tipo: "credito",
  });

  // Carregar pessoas do Supabase (ou localStorage como fallback)
  const fetchPessoas = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback para localStorage em modo demo
      const saved = localStorage.getItem("pessoas");
      const data = saved ? JSON.parse(saved) : ["Pai", "Mãe"];
      setPessoas(data);
      setPessoasLoaded(true);
      return;
    }

    try {
      const data = await pessoasFunctions.getAll();
      if (data.length > 0) {
        setPessoas(data.map((p) => p.nome));
      } else {
        // Migrar dados do localStorage se existir
        const saved = localStorage.getItem("pessoas");
        const localData = saved ? JSON.parse(saved) : ["Pai", "Mãe"];
        for (const nome of localData) {
          await pessoasFunctions.create({
            id: `pessoa-${Date.now()}-${Math.random()}`,
            nome,
          });
        }
        setPessoas(localData);
      }
    } catch (err) {
      console.error("Erro ao carregar pessoas:", err);
      const saved = localStorage.getItem("pessoas");
      setPessoas(saved ? JSON.parse(saved) : ["Pai", "Mãe"]);
    }
    setPessoasLoaded(true);
  }, []);

  // Carregar saldos devedores do Supabase (ou localStorage como fallback)
  const fetchSaldos = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback para localStorage em modo demo
      const saved = localStorage.getItem("saldosDevedores");
      setSaldosDevedores(saved ? JSON.parse(saved) : []);
      setSaldosLoaded(true);
      return;
    }

    try {
      const data = await saldosFunctions.getAll();
      if (data.length > 0) {
        setSaldosDevedores(data);
      } else {
        // Migrar dados do localStorage se existir
        const saved = localStorage.getItem("saldosDevedores");
        if (saved) {
          const localData: SaldoDevedor[] = JSON.parse(saved);
          for (const saldo of localData) {
            await saldosFunctions.create(saldo);
          }
          setSaldosDevedores(localData);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar saldos:", err);
      const saved = localStorage.getItem("saldosDevedores");
      setSaldosDevedores(saved ? JSON.parse(saved) : []);
    }
    setSaldosLoaded(true);
  }, []);

  // Carregar dados ao iniciar
  useEffect(() => {
    fetchPessoas();
    fetchSaldos();
  }, [fetchPessoas, fetchSaldos]);

  // Salvar pessoas no Supabase (e localStorage como backup)
  useEffect(() => {
    if (pessoasLoaded && pessoas.length > 0) {
      localStorage.setItem("pessoas", JSON.stringify(pessoas));
    }
  }, [pessoas, pessoasLoaded]);

  // Atualizar pessoa padrão quando lista muda
  useEffect(() => {
    if (pessoas.length > 0 && !formData.pessoa) {
      setFormData((prev) => ({ ...prev, pessoa: pessoas[0] }));
    }
  }, [pessoas, formData.pessoa]);

  // Adicionar nova pessoa
  const handleAddPessoa = async () => {
    const nome = novaPessoa.trim();
    if (nome && !pessoas.includes(nome)) {
      if (isSupabaseConfigured && supabase) {
        await pessoasFunctions.create({ id: `pessoa-${Date.now()}`, nome });
      }
      setPessoas((prev) => [...prev, nome]);
      setFormData((prev) => ({ ...prev, pessoa: nome }));
      setNovaPessoa("");
      setShowAddPessoa(false);
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
      if (formData.pessoa === nome) {
        setFormData((prev) => ({ ...prev, pessoa: pessoas[0] }));
      }
    }
  };

  // Salvar saldos devedores no Supabase (e localStorage como backup)
  useEffect(() => {
    if (saldosLoaded && saldosDevedores.length >= 0) {
      localStorage.setItem("saldosDevedores", JSON.stringify(saldosDevedores));
    }
  }, [saldosDevedores, saldosLoaded]);

  // Adicionar nova dívida
  const handleAddDivida = async () => {
    const valor = parseCurrency(formDivida.valor);
    if (!formDivida.pessoa || !formDivida.descricao || valor <= 0) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    const novaDivida: SaldoDevedor = {
      id: Date.now().toString(),
      pessoa: formDivida.pessoa,
      descricao: formDivida.descricao,
      valor_original: valor,
      valor_atual: valor,
      data_criacao: format(new Date(), "yyyy-MM-dd"),
      historico: [],
    };

    // Salvar no Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      await saldosFunctions.create(novaDivida);
    }

    setSaldosDevedores((prev) => [...prev, novaDivida]);
    setFormDivida({ pessoa: pessoas[0] || "", descricao: "", valor: "" });
    setShowFormDivida(false);
    setError(null);
  };

  // Registrar pagamento de dívida
  const handlePagamento = async (dividaId: string, valorMaximo: number) => {
    const valor = parseCurrency(valorPagamento);
    if (valor <= 0) {
      setError("Valor de pagamento inválido.");
      return;
    }
    // Arredondar para 2 casas decimais para evitar erros de ponto flutuante
    const valorArredondado = Math.round(valor * 100) / 100;
    const maximoArredondado = Math.round(valorMaximo * 100) / 100;

    if (valorArredondado > maximoArredondado + 0.01) {
      setError(
        `O valor não pode ser maior que ${formatCurrency(valorMaximo)}.`
      );
      return;
    }

    // Usar o menor entre o valor pago e o máximo (para evitar valores negativos)
    const valorFinal = Math.min(valorArredondado, maximoArredondado);

    // Encontrar a dívida para atualizar
    const dividaAtual = saldosDevedores.find((d) => d.id === dividaId);
    if (!dividaAtual) return;

    const novoValor = Math.max(
      0,
      Math.round((dividaAtual.valor_atual - valorFinal) * 100) / 100
    );
    const novoHistorico = [
      ...dividaAtual.historico,
      {
        id: Date.now().toString(),
        valor: valorFinal,
        data: format(new Date(), "yyyy-MM-dd"),
        observacao: obsPagamento || undefined,
      },
    ];

    // Atualizar no Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      await saldosFunctions.update(dividaId, {
        valor_atual: novoValor,
        historico: novoHistorico,
      });
    }

    setSaldosDevedores((prev) =>
      prev.map((divida) => {
        if (divida.id === dividaId) {
          return {
            ...divida,
            valor_atual: novoValor,
            historico: novoHistorico,
          };
        }
        return divida;
      })
    );

    setValorPagamento("");
    setObsPagamento("");
    setShowPagamento(null);
    setError(null);
  };

  // Desfazer pagamento
  const handleDesfazerPagamento = (
    dividaId: string,
    pagamentoId: string,
    valorPagamento: number
  ) => {
    setModalConfirm({
      show: true,
      titulo: "Desfazer Pagamento",
      mensagem: `Tem certeza que deseja desfazer este pagamento de ${formatCurrency(
        valorPagamento
      )}? O valor será adicionado de volta à dívida.`,
      onConfirm: async () => {
        const dividaAtual = saldosDevedores.find((d) => d.id === dividaId);
        if (!dividaAtual) return;

        const novoValorAtual =
          Math.round((dividaAtual.valor_atual + valorPagamento) * 100) / 100;
        const novoHistorico = dividaAtual.historico.filter(
          (p) => p.id !== pagamentoId
        );

        // Atualizar no Supabase se configurado
        if (isSupabaseConfigured && supabase) {
          await saldosFunctions.update(dividaId, {
            valor_atual: novoValorAtual,
            historico: novoHistorico,
          });
        }

        setSaldosDevedores((prev) =>
          prev.map((divida) => {
            if (divida.id === dividaId) {
              return {
                ...divida,
                valor_atual: novoValorAtual,
                historico: novoHistorico,
              };
            }
            return divida;
          })
        );
        setModalConfirm((prev) => ({ ...prev, show: false }));
      },
    });
  };

  // Excluir dívida
  const handleDeleteDivida = (id: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir Dívida",
      mensagem:
        "Tem certeza que deseja excluir esta dívida? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        // Deletar no Supabase se configurado
        if (isSupabaseConfigured && supabase) {
          await saldosFunctions.delete(id);
        }
        setSaldosDevedores((prev) => prev.filter((d) => d.id !== id));
        setModalConfirm({ ...modalConfirm, show: false });
      },
    });
  };

  // Fechar mês de uma pessoa
  const handleFecharMes = async (pessoa: string) => {
    const resumoPessoa = resumoMensal.find((r) => r.pessoa === pessoa);
    if (!resumoPessoa) return;

    const totalDevido = resumoPessoa.total;
    const valorPago = parseCurrency(valorPagoFecharMes);

    if (valorPago < 0) {
      setError("Valor pago inválido.");
      return;
    }

    if (valorPago > totalDevido) {
      setError(
        `O valor pago não pode ser maior que ${formatCurrency(totalDevido)}.`
      );
      return;
    }

    const valorRestante = totalDevido - valorPago;

    if (valorRestante > 0) {
      // Criar saldo devedor com o valor restante
      const novaDivida: SaldoDevedor = {
        id: Date.now().toString(),
        pessoa: pessoa,
        descricao: `Gastos pendentes - ${formatMonthYear(mesVisualizacao)}`,
        valor_original: valorRestante,
        valor_atual: valorRestante,
        data_criacao: format(new Date(), "yyyy-MM-dd"),
        historico: [],
      };

      // Salvar no Supabase se configurado
      if (isSupabaseConfigured && supabase) {
        await saldosFunctions.create(novaDivida);
      }

      setSaldosDevedores((prev) => [...prev, novaDivida]);
    }

    // Limpar e fechar modal
    setValorPagoFecharMes("");
    setShowFecharMes(null);
    setError(null);

    // Mostrar feedback
    if (valorRestante > 0) {
      setModalFeedback({
        show: true,
        titulo: "Mês Fechado!",
        mensagem: `${pessoa} pagou ${formatCurrency(
          valorPago
        )}.\n${formatCurrency(
          valorRestante
        )} foi transferido para o Saldo Devedor.`,
        tipo: "info",
      });
    } else {
      setModalFeedback({
        show: true,
        titulo: "Mês Fechado!",
        mensagem: `${pessoa} pagou ${formatCurrency(
          valorPago
        )} (total quitado).`,
        tipo: "sucesso",
      });
    }
  };

  // Filtrar dívidas por pessoa e status
  const dividasFiltradas = saldosDevedores.filter((d) => {
    // Filtro por status (pendentes = valor_atual > 0, pagos = valor_atual === 0)
    const matchStatus =
      filtroStatusDivida === "pendentes"
        ? d.valor_atual > 0
        : d.valor_atual === 0;

    // Filtro por pessoa
    const matchPessoa = filtroPessoaDivida
      ? d.pessoa === filtroPessoaDivida
      : true;

    return matchStatus && matchPessoa;
  });

  // Contar pendentes e pagos (sem filtro de pessoa)
  const totalPendentes = saldosDevedores.filter(
    (d) => d.valor_atual > 0
  ).length;
  const totalPagos = saldosDevedores.filter((d) => d.valor_atual === 0).length;

  // Calcular total de dívidas pendentes (filtrado)
  const totalDividasPendentes = dividasFiltradas.reduce(
    (acc, d) => acc + d.valor_atual,
    0
  );

  // Calcular total de dívidas quitadas (valor original das quitadas filtradas)
  const totalDividasQuitadas = dividasFiltradas.reduce(
    (acc, d) => acc + d.valor_original,
    0
  );

  // Pessoas que têm dívidas (para o filtro)
  const pessoasComDividas = [...new Set(saldosDevedores.map((d) => d.pessoa))];

  // Buscar gastos do Supabase
  const fetchGastos = useCallback(async () => {
    // Se Supabase não está configurado, usar dados demo
    if (!isSupabaseConfigured || !supabase) {
      setModoDemo(true);
      setGastos(DADOS_DEMO);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("gastos")
        .select("*")
        .order("data_inicio", { ascending: false });

      if (fetchError) throw fetchError;

      setGastos(data || []);
    } catch (err) {
      console.error("Erro ao buscar gastos:", err);
      setError(
        "Erro ao carregar gastos. Verifique sua conexão com o Supabase."
      );
      // Usar dados demo em caso de erro
      setModoDemo(true);
      setGastos(DADOS_DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar gastos ao iniciar
  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);

  // Sincronização em tempo real com Supabase (Realtime)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Inscrever para mudanças na tabela gastos
    const gastosChannel = supabase
      .channel('gastos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos' }, () => {
        fetchGastos();
      })
      .subscribe();

    // Inscrever para mudanças na tabela saldos_devedores
    const saldosChannel = supabase
      .channel('saldos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saldos_devedores' }, () => {
        fetchSaldos();
      })
      .subscribe();

    // Inscrever para mudanças na tabela pessoas
    const pessoasChannel = supabase
      .channel('pessoas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, () => {
        fetchPessoas();
      })
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      if (supabase) {
        supabase.removeChannel(gastosChannel);
        supabase.removeChannel(saldosChannel);
        supabase.removeChannel(pessoasChannel);
      }
    };
  }, [fetchGastos, fetchSaldos, fetchPessoas]);

  // Recalcular parcelas ativas quando muda o mês ou os gastos
  useEffect(() => {
    const parcelas = getParcelasAtivas(gastos, mesVisualizacao);
    setParcelasAtivas(parcelas);
    setResumoMensal(calcularResumoMensal(parcelas));
    setTotalMes(calcularTotalMes(parcelas));
  }, [gastos, mesVisualizacao]);

  // Navegação entre meses
  const navegarMes = (direcao: "anterior" | "proximo") => {
    setMesVisualizacao((prev) =>
      direcao === "anterior" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  // Ir para o mês atual
  const irParaHoje = () => {
    setMesVisualizacao(new Date());
  };

  // Handlers do formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "valor_total") {
      setFormData((prev) => ({ ...prev, [name]: formatCurrencyInput(value) }));
    } else if (name === "num_parcelas") {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const valorNumerico = parseCurrency(formData.valor_total);

      if (valorNumerico <= 0) {
        setError("O valor deve ser maior que zero.");
        return;
      }

      if (!formData.descricao.trim()) {
        setError("A descrição é obrigatória.");
        return;
      }

      // Se em modo demo, adicionar localmente
      if (modoDemo || !supabase) {
        const novoGasto: Gasto = {
          id: Date.now().toString(),
          descricao: formData.descricao.trim(),
          pessoa: formData.pessoa,
          valor_total: valorNumerico,
          num_parcelas: formData.num_parcelas,
          data_inicio: formData.data_inicio,
          tipo: formData.tipo,
        };
        setGastos((prev) => [novoGasto, ...prev]);
      } else {
        const { error: insertError } = await supabase.from("gastos").insert({
          descricao: formData.descricao.trim(),
          pessoa: formData.pessoa,
          valor_total: valorNumerico,
          num_parcelas: formData.num_parcelas,
          data_inicio: formData.data_inicio,
          tipo: formData.tipo,
        });

        if (insertError) throw insertError;
        await fetchGastos();
      }

      // Resetar formulário
      setFormData({
        descricao: "",
        pessoa: pessoas[0] || "",
        valor_total: "",
        num_parcelas: 1,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        tipo: "credito",
      });
      setShowForm(false);
    } catch (err) {
      console.error("Erro ao salvar gasto:", err);
      setError("Erro ao salvar o gasto. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Excluir gasto
  const handleDelete = async (id: string) => {
    setModalConfirm({
      show: true,
      titulo: "Excluir Lançamento",
      mensagem:
        "Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        setModalConfirm((prev) => ({ ...prev, show: false }));
        try {
          setError(null);

          // Se em modo demo, remover localmente
          if (modoDemo || !supabase) {
            setGastos((prev) => prev.filter((g) => g.id !== id));
            return;
          }

          const { error: deleteError } = await supabase
            .from("gastos")
            .delete()
            .eq("id", id);

          if (deleteError) throw deleteError;

          await fetchGastos();
        } catch (err) {
          console.error("Erro ao excluir gasto:", err);
          setError("Erro ao excluir o gasto. Tente novamente.");
        }
      },
    });
  };

  // Cores por tipo
  const getCorTipo = (tipo: string) => {
    return tipo === "credito"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : "bg-green-100 text-green-800 border-green-200";
  };

  // Ícone por tipo
  const getIconeTipo = (tipo: string) => {
    return tipo === "credito" ? (
      <CreditCard className="w-4 h-4" />
    ) : (
      <Wallet className="w-4 h-4" />
    );
  };

  // Cores para os cards de resumo
  const coresCards = [
    "from-blue-500 to-blue-600",
    "from-pink-500 to-pink-600",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-violet-500 to-violet-600",
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Banner Modo Demo */}
      {modoDemo && (
        <div className="bg-amber-600 text-white text-center py-2 px-4 text-sm">
          ⚠️ Modo Demonstração - Configure o Supabase no arquivo .env para
          salvar dados
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 shadow-lg sticky top-0 z-40 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-blue-500" />
              Controle Financeiro
            </h1>
            <button
              onClick={() =>
                abaAtiva === "gastos"
                  ? setShowForm(true)
                  : setShowFormDivida(true)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">
                {abaAtiva === "gastos" ? "Novo Gasto" : "Nova Dívida"}
              </span>
            </button>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setAbaAtiva("gastos")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "gastos"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Receipt className="w-4 h-4" />
              Gastos do Mês
            </button>
            <button
              onClick={() => setAbaAtiva("dividas")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "dividas"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Clock className="w-4 h-4" />
              Saldo Devedor
              {saldosDevedores.filter((d) => d.valor_atual > 0).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {saldosDevedores.filter((d) => d.valor_atual > 0).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* === ABA GASTOS === */}
        {abaAtiva === "gastos" && (
          <>
            {/* Navegação de Meses */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navegarMes("anterior")}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-300" />
                </button>

                <div className="text-center">
                  <h2 className="text-lg font-semibold text-white capitalize">
                    {formatMonthYear(mesVisualizacao)}
                  </h2>
                  <button
                    onClick={irParaHoje}
                    className="text-sm text-blue-400 hover:text-blue-300 mt-1"
                  >
                    Ir para hoje
                  </button>
                </div>

                <button
                  onClick={() => navegarMes("proximo")}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="w-6 h-6 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Card Total Geral */}
              <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-4 text-white shadow-sm">
                <p className="text-sm text-gray-300 mb-1">Total do Mês</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMes)}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {parcelasAtivas.length} lançamentos
                </p>
              </div>

              {/* Cards por Pessoa */}
              {resumoMensal.map((resumo, index) => (
                <div
                  key={resumo.pessoa}
                  className={`bg-gradient-to-br ${
                    coresCards[index % coresCards.length]
                  } rounded-xl p-4 text-white shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-white/80 mb-1 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {resumo.pessoa}
                      </p>
                      <p className="text-xl font-bold">
                        {formatCurrency(resumo.total)}
                      </p>
                      <p className="text-xs text-white/70 mt-2">
                        {resumo.quantidade} itens
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowFecharMes(resumo.pessoa);
                        setValorPagoFecharMes("");
                      }}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="Fechar mês"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Lista de Lançamentos */}
            {!loading && (
              <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold text-white">
                    Lançamentos do Mês
                  </h3>
                </div>

                {parcelasAtivas.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>Nenhum lançamento para este mês</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {parcelasAtivas.map(
                      ({ gasto, parcela_atual, valor_parcela }) => (
                        <li
                          key={gasto.id}
                          className="p-4 hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getCorTipo(
                                    gasto.tipo
                                  )}`}
                                >
                                  {getIconeTipo(gasto.tipo)}
                                  {gasto.tipo === "credito"
                                    ? "Crédito"
                                    : "Débito"}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {gasto.pessoa}
                                </span>
                              </div>
                              <p className="font-medium text-white truncate">
                                {gasto.descricao}
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  Parcela {parcela_atual}/{gasto.num_parcelas}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Total: {formatCurrency(gasto.valor_total)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold text-white">
                                {formatCurrency(valor_parcela)}
                              </p>
                              <button
                                onClick={() => handleDelete(gasto.id)}
                                className="mt-2 p-1 text-gray-500 hover:text-red-400 transition-colors"
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {/* === ABA DÍVIDAS === */}
        {abaAtiva === "dividas" && (
          <>
            {/* Card Total Dívidas */}
            <div
              className={`bg-gradient-to-br ${
                filtroStatusDivida === "pendentes"
                  ? "from-orange-600 to-red-600"
                  : "from-green-600 to-emerald-600"
              } rounded-xl p-4 text-white shadow-lg`}
            >
              <p className="text-sm text-white/80 mb-1 flex items-center gap-2">
                {filtroStatusDivida === "pendentes" ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {filtroPessoaDivida
                  ? filtroStatusDivida === "pendentes"
                    ? `Dívidas de ${filtroPessoaDivida}`
                    : `Quitado por ${filtroPessoaDivida}`
                  : filtroStatusDivida === "pendentes"
                  ? "Total de Dívidas Pendentes"
                  : "Total Quitado"}
              </p>
              <p className="text-3xl font-bold">
                {formatCurrency(
                  filtroStatusDivida === "pendentes"
                    ? totalDividasPendentes
                    : totalDividasQuitadas
                )}
              </p>
              <p className="text-xs text-white/70 mt-2">
                {dividasFiltradas.length} dívida(s){" "}
                {filtroStatusDivida === "pendentes" ? "ativa(s)" : "quitada(s)"}
                {filtroPessoaDivida && (
                  <button
                    onClick={() => setFiltroPessoaDivida("")}
                    className="ml-2 underline hover:text-white"
                  >
                    Ver todos
                  </button>
                )}
              </p>
            </div>

            {/* Filtro por Status */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Status:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFiltroStatusDivida("pendentes");
                    setFiltroPessoaDivida("");
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    filtroStatusDivida === "pendentes"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Pendentes
                  {totalPendentes > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        filtroStatusDivida === "pendentes"
                          ? "bg-orange-700"
                          : "bg-gray-600"
                      }`}
                    >
                      {totalPendentes}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setFiltroStatusDivida("pagos");
                    setFiltroPessoaDivida("");
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    filtroStatusDivida === "pagos"
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Pagos
                  {totalPagos > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        filtroStatusDivida === "pagos"
                          ? "bg-green-700"
                          : "bg-gray-600"
                      }`}
                    >
                      {totalPagos}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filtro por Pessoa */}
            {pessoasComDividas.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">
                  Filtrar por pessoa:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroPessoaDivida("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filtroPessoaDivida === ""
                        ? filtroStatusDivida === "pendentes"
                          ? "bg-orange-600 text-white"
                          : "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Todos
                  </button>
                  {pessoasComDividas.map((pessoa) => {
                    // Calcular valor baseado no status atual
                    const dividasPessoa = saldosDevedores.filter(
                      (d) => d.pessoa === pessoa
                    );
                    let valorExibir: number;

                    if (filtroStatusDivida === "pendentes") {
                      // Soma do valor atual (ainda devendo)
                      valorExibir = dividasPessoa
                        .filter((d) => d.valor_atual > 0)
                        .reduce((acc, d) => acc + d.valor_atual, 0);
                    } else {
                      // Soma do valor original das dívidas quitadas (total que pagou)
                      valorExibir = dividasPessoa
                        .filter((d) => d.valor_atual === 0)
                        .reduce((acc, d) => acc + d.valor_original, 0);
                    }

                    // Não mostrar pessoa se não tem dívidas nesse status
                    const temDividasNoStatus =
                      filtroStatusDivida === "pendentes"
                        ? dividasPessoa.some((d) => d.valor_atual > 0)
                        : dividasPessoa.some((d) => d.valor_atual === 0);

                    if (!temDividasNoStatus) return null;

                    return (
                      <button
                        key={pessoa}
                        onClick={() => setFiltroPessoaDivida(pessoa)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          filtroPessoaDivida === pessoa
                            ? filtroStatusDivida === "pendentes"
                              ? "bg-orange-600 text-white"
                              : "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        <User className="w-3 h-3" />
                        {pessoa}
                        <span
                          className={`text-xs ${
                            filtroPessoaDivida === pessoa
                              ? filtroStatusDivida === "pendentes"
                                ? "text-orange-200"
                                : "text-green-200"
                              : "text-gray-400"
                          }`}
                        >
                          ({formatCurrency(valorExibir)})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista de Dívidas */}
            <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-400" />
                  Saldos Devedores
                  {filtroPessoaDivida && (
                    <span className="text-sm font-normal text-gray-400">
                      — {filtroPessoaDivida}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Dívidas antigas que estão sendo pagas aos poucos
                </p>
              </div>

              {dividasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>
                    {filtroPessoaDivida
                      ? `Nenhuma dívida para ${filtroPessoaDivida}`
                      : "Nenhuma dívida pendente"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {filtroPessoaDivida ? (
                      <button
                        onClick={() => setFiltroPessoaDivida("")}
                        className="text-orange-400 hover:underline"
                      >
                        Ver todas as dívidas
                      </button>
                    ) : (
                      'Clique em "Nova Dívida" para adicionar'
                    )}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {dividasFiltradas.map((divida) => (
                    <li key={divida.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-900/50 text-orange-300 border border-orange-700">
                              <User className="w-3 h-3" />
                              {divida.pessoa}
                            </span>
                            {divida.valor_atual === 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                                ✓ Quitado
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-white">
                            {divida.descricao}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                            <span>
                              Original: {formatCurrency(divida.valor_original)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Criado em:{" "}
                              {format(
                                new Date(divida.data_criacao),
                                "dd/MM/yyyy"
                              )}
                            </span>
                          </div>

                          {/* Barra de progresso */}
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>
                                Pago:{" "}
                                {formatCurrency(
                                  divida.valor_original - divida.valor_atual
                                )}
                              </span>
                              <span>
                                {Math.round(
                                  ((divida.valor_original -
                                    divida.valor_atual) /
                                    divida.valor_original) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{
                                  width: `${
                                    ((divida.valor_original -
                                      divida.valor_atual) /
                                      divida.valor_original) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Histórico de pagamentos */}
                          {divida.historico.length > 0 && (
                            <details className="mt-3">
                              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                                Ver histórico ({divida.historico.length}{" "}
                                pagamento(s))
                              </summary>
                              <ul className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-700">
                                {divida.historico.map((pag) => (
                                  <li
                                    key={pag.id}
                                    className="text-xs text-gray-400 flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <span className="text-green-400">
                                        -{formatCurrency(pag.valor)}
                                      </span>
                                      {" em "}
                                      {format(new Date(pag.data), "dd/MM/yyyy")}
                                      {pag.observacao && (
                                        <span className="text-gray-500">
                                          {" "}
                                          • {pag.observacao}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleDesfazerPagamento(
                                          divida.id,
                                          pag.id,
                                          pag.valor
                                        )
                                      }
                                      className="p-1 text-gray-500 hover:text-orange-400 hover:bg-gray-700 rounded transition-colors"
                                      title="Desfazer pagamento"
                                    >
                                      <Undo2 className="w-3.5 h-3.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className={`text-xl font-bold ${
                              divida.valor_atual > 0
                                ? "text-orange-400"
                                : "text-green-400"
                            }`}
                          >
                            {formatCurrency(divida.valor_atual)}
                          </p>
                          <p className="text-xs text-gray-500">restante</p>

                          <div className="flex gap-1 mt-2 justify-end">
                            {divida.valor_atual > 0 && (
                              <button
                                onClick={() =>
                                  setShowPagamento(
                                    showPagamento === divida.id
                                      ? null
                                      : divida.id
                                  )
                                }
                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                title="Registrar pagamento"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDivida(divida.id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                              title="Excluir dívida"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Formulário de pagamento inline */}
                      {showPagamento === divida.id && (
                        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-300">
                              Registrar pagamento:
                            </p>
                            <button
                              onClick={() => {
                                setValorPagamento(
                                  divida.valor_atual.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                );
                              }}
                              className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                            >
                              Tudo
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                R$
                              </span>
                              <input
                                type="text"
                                value={valorPagamento}
                                onChange={(e) =>
                                  setValorPagamento(
                                    formatCurrencyInput(e.target.value)
                                  )
                                }
                                placeholder="0,00"
                                className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
                                inputMode="numeric"
                              />
                            </div>
                            <input
                              type="text"
                              value={obsPagamento}
                              onChange={(e) => setObsPagamento(e.target.value)}
                              placeholder="Observação (opcional)"
                              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowPagamento(null);
                                  setValorPagamento("");
                                  setObsPagamento("");
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() =>
                                  handlePagamento(divida.id, divida.valor_atual)
                                }
                                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                              >
                                Confirmar Pagamento
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal de Feedback */}
      {modalFeedback.show && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 overflow-hidden">
            <div
              className={`p-4 ${
                modalFeedback.tipo === "sucesso"
                  ? "bg-green-600"
                  : "bg-blue-600"
              }`}
            >
              <div className="flex items-center gap-3">
                {modalFeedback.tipo === "sucesso" ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-white" />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {modalFeedback.titulo}
                </h2>
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-300 whitespace-pre-line">
                {modalFeedback.mensagem}
              </p>
            </div>
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() =>
                  setModalFeedback({ ...modalFeedback, show: false })
                }
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  modalFeedback.tipo === "sucesso"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {modalConfirm.show && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 overflow-hidden">
            <div className="p-4 bg-red-600">
              <div className="flex items-center gap-3">
                <Trash2 className="w-8 h-8 text-white" />
                <h2 className="text-lg font-semibold text-white">
                  {modalConfirm.titulo}
                </h2>
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-300">{modalConfirm.mensagem}</p>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button
                onClick={() =>
                  setModalConfirm((prev) => ({ ...prev, show: false }))
                }
                className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirm.onConfirm}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fechar Mês */}
      {showFecharMes && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Fechar Mês - {showFecharMes}
              </h2>
              <button
                onClick={() => {
                  setShowFecharMes(null);
                  setValorPagoFecharMes("");
                  setError(null);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Info do mês */}
              {(() => {
                const resumoPessoa = resumoMensal.find(
                  (r) => r.pessoa === showFecharMes
                );
                const totalDevido = resumoPessoa?.total || 0;
                const valorPago = parseCurrency(valorPagoFecharMes);
                const valorRestante = Math.max(0, totalDevido - valorPago);

                return (
                  <>
                    <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mês:</span>
                        <span className="text-white font-medium">
                          {formatMonthYear(mesVisualizacao)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total devido:</span>
                        <span className="text-white font-medium">
                          {formatCurrency(totalDevido)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Itens:</span>
                        <span className="text-white font-medium">
                          {resumoPessoa?.quantidade || 0}
                        </span>
                      </div>
                    </div>

                    {/* Campo de valor pago */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quanto {showFecharMes} pagou?
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          R$
                        </span>
                        <input
                          type="text"
                          value={valorPagoFecharMes}
                          onChange={(e) =>
                            setValorPagoFecharMes(
                              formatCurrencyInput(e.target.value)
                            )
                          }
                          placeholder="0,00"
                          className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() =>
                            setValorPagoFecharMes(
                              totalDevido.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            )
                          }
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                        >
                          Tudo ({formatCurrency(totalDevido)})
                        </button>
                        <button
                          onClick={() => setValorPagoFecharMes("")}
                          className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    {/* Resumo */}
                    {valorPago > 0 && (
                      <div
                        className={`rounded-lg p-4 ${
                          valorRestante > 0
                            ? "bg-orange-900/30 border border-orange-700"
                            : "bg-green-900/30 border border-green-700"
                        }`}
                      >
                        <p className="text-sm text-gray-300 mb-2">Resumo:</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Valor pago:</span>
                            <span className="text-green-400 font-medium">
                              {formatCurrency(valorPago)}
                            </span>
                          </div>
                          {valorRestante > 0 ? (
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Vai para Saldo Devedor:
                              </span>
                              <span className="text-orange-400 font-medium">
                                {formatCurrency(valorRestante)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status:</span>
                              <span className="text-green-400 font-medium">
                                Quitado ✓
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botões */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowFecharMes(null);
                          setValorPagoFecharMes("");
                          setError(null);
                        }}
                        className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleFecharMes(showFecharMes)}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Fechar Mês
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário de Gasto */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">
                Novo Lançamento
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, tipo: "credito" }))
                    }
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                      formData.tipo === "credito"
                        ? "border-purple-500 bg-purple-900/50 text-purple-300"
                        : "border-gray-600 hover:border-gray-500 text-gray-400"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, tipo: "debito" }))
                    }
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                      formData.tipo === "debito"
                        ? "border-green-500 bg-green-900/50 text-green-300"
                        : "border-gray-600 hover:border-gray-500 text-gray-400"
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    Débito
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label
                  htmlFor="descricao"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  Descrição
                </label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  placeholder="Ex: iPhone 15, Supermercado..."
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-700 text-white placeholder-gray-400"
                  required
                />
              </div>

              {/* Pessoa */}
              <div>
                <label
                  htmlFor="pessoa"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  <User className="w-4 h-4 inline mr-1" />
                  Pessoa
                </label>
                <div className="flex gap-2">
                  <select
                    id="pessoa"
                    name="pessoa"
                    value={formData.pessoa}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-700 text-white"
                  >
                    {pessoas.map((pessoa) => (
                      <option key={pessoa} value={pessoa}>
                        {pessoa}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddPessoa(!showAddPessoa)}
                    className="px-3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Adicionar pessoa"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
                {showAddPessoa && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={novaPessoa}
                      onChange={(e) => setNovaPessoa(e.target.value)}
                      placeholder="Nome da nova pessoa"
                      className="flex-1 px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddPessoa())
                      }
                    />
                    <button
                      type="button"
                      onClick={handleAddPessoa}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
                {pessoas.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pessoas.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300"
                      >
                        {p}
                        <button
                          type="button"
                          onClick={() => handleRemovePessoa(p)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Valor */}
              <div>
                <label
                  htmlFor="valor_total"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Valor Total
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    R$
                  </span>
                  <input
                    type="text"
                    id="valor_total"
                    name="valor_total"
                    value={formData.valor_total}
                    onChange={handleInputChange}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-700 text-white placeholder-gray-400"
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>

              {/* Parcelas */}
              <div>
                <label
                  htmlFor="num_parcelas"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  <Hash className="w-4 h-4 inline mr-1" />
                  Parcelas
                </label>
                <select
                  id="num_parcelas"
                  name="num_parcelas"
                  value={formData.num_parcelas}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-700 text-white"
                >
                  {PARCELAS_OPTIONS.map((num) => (
                    <option key={num} value={num}>
                      {num}x{" "}
                      {formData.valor_total &&
                        `de ${formatCurrency(
                          parseCurrency(formData.valor_total) / num
                        )}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data de Início */}
              <div>
                <label
                  htmlFor="data_inicio"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data da Primeira Parcela
                </label>
                <input
                  type="date"
                  id="data_inicio"
                  name="data_inicio"
                  value={formData.data_inicio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-700 text-white"
                  required
                />
              </div>

              {/* Preview */}
              {formData.valor_total && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Resumo:</p>
                  <p className="font-medium text-white">
                    {formData.num_parcelas}x de{" "}
                    {formatCurrency(
                      parseCurrency(formData.valor_total) /
                        formData.num_parcelas
                    )}
                  </p>
                  <p className="text-sm text-gray-400">
                    Total: {formatCurrency(parseCurrency(formData.valor_total))}
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Dívida */}
      {showFormDivida && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Nova Dívida Pendente
              </h2>
              <button
                onClick={() => setShowFormDivida(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Formulário */}
            <div className="p-4 space-y-4">
              <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                <p className="text-sm text-orange-300">
                  💡 Use esta seção para registrar dívidas que não são gastos do
                  mês atual. Ex: Alguém te deve dinheiro e vai pagar aos poucos.
                </p>
              </div>

              {/* Pessoa */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Pessoa (quem deve)
                </label>
                <select
                  value={formDivida.pessoa}
                  onChange={(e) =>
                    setFormDivida((prev) => ({
                      ...prev,
                      pessoa: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none appearance-none bg-gray-700 text-white"
                >
                  <option value="">Selecione...</option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa} value={pessoa}>
                      {pessoa}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Descrição
                </label>
                <input
                  type="text"
                  value={formDivida.descricao}
                  onChange={(e) =>
                    setFormDivida((prev) => ({
                      ...prev,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Ex: Empréstimo de Janeiro, Dívida do carro..."
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-gray-700 text-white placeholder-gray-400"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Valor da Dívida
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formDivida.valor}
                    onChange={(e) =>
                      setFormDivida((prev) => ({
                        ...prev,
                        valor: formatCurrencyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-gray-700 text-white placeholder-gray-400"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormDivida(false)}
                  className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddDivida}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  Adicionar Dívida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
