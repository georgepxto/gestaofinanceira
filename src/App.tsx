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
  UserCircle,
  Users,
  Repeat,
  LogOut,
  MessageSquare,
  Edit3,
  Banknote,
} from "lucide-react";
import { addMonths, subMonths, format } from "date-fns";
import {
  supabase,
  isSupabaseConfigured,
  saldosFunctions,
  pessoasFunctions,
  meusGastosFunctions,
  authFunctions,
  observacoesFunctions,
  pagamentosParciaisFunctions,
} from "./lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type {
  Gasto,
  GastoForm,
  ParcelaAtiva,
  ResumoMensal,
  SaldoDevedor,
  SaldoDevedorForm,
  MeuGasto,
  MeuGastoForm,
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
import { Login } from "./components/Login";
import "./index.css";

interface PagamentoParcial {
  id?: string;
  valor: number;
  data: string;
}

const PARCELAS_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"gastos" | "dividas" | "eu">(
    "gastos"
  );
  const [mesVisualizacao, setMesVisualizacao] = useState<Date>(new Date());
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parcelasAtivas, setParcelasAtivas] = useState<ParcelaAtiva[]>([]);
  const [resumoMensal, setResumoMensal] = useState<ResumoMensal[]>([]);
  const [totalMes, setTotalMes] = useState<number>(0);
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
  const [filtroPessoaGasto, setFiltroPessoaGasto] = useState<string>("");
  const [filtroTipoGasto, setFiltroTipoGasto] = useState<string>("");
  const [filtroPessoaDivida, setFiltroPessoaDivida] = useState<string>("");
  const [filtroStatusDivida, setFiltroStatusDivida] = useState<
    "pendentes" | "pagos"
  >("pendentes");
  const [meusGastos, setMeusGastos] = useState<MeuGasto[]>([]);
  const [meusGastosLoaded, setMeusGastosLoaded] = useState<boolean>(false);
  const [showFormMeuGasto, setShowFormMeuGasto] = useState<boolean>(false);
  const [formMeuGasto, setFormMeuGasto] = useState<MeuGastoForm>({
    descricao: "",
    valor: "",
    tipo: "debito",
    categoria: "pessoal",
    data: format(new Date(), "yyyy-MM-dd"),
    dividido_com: "",
    minha_parte: "",
    dia_vencimento: "",
    num_parcelas: "1",
  });
  const [filtroCategoriaMeuGasto, setFiltroCategoriaMeuGasto] =
    useState<string>("");
  const [showFecharMes, setShowFecharMes] = useState<string | null>(null);
  const [valorPagoFecharMes, setValorPagoFecharMes] = useState<string>("");
  const [observacoesMes, setObservacoesMes] = useState<Record<string, string>>(
    {}
  );
  const [showObsModal, setShowObsModal] = useState<string | null>(null);
  const [obsTexto, setObsTexto] = useState<string>("");
  const [pagamentosParciais, setPagamentosParciais] = useState<
    Record<string, PagamentoParcial[]>
  >({});
  const [showPagamentoParcial, setShowPagamentoParcial] = useState<
    string | null
  >(null);
  const [valorPagamentoParcial, setValorPagamentoParcial] =
    useState<string>("");
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
  const [pessoas, setPessoas] = useState<string[]>([]);
  const [pessoasLoaded, setPessoasLoaded] = useState<boolean>(false);
  const [novaPessoa, setNovaPessoa] = useState<string>("");
  const [showAddPessoa, setShowAddPessoa] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoGasto, setEditandoGasto] = useState<Gasto | null>(null);
  const [editandoMeuGasto, setEditandoMeuGasto] = useState<MeuGasto | null>(
    null
  );
  const [formData, setFormData] = useState<GastoForm>({
    descricao: "",
    pessoa: "",
    valor_total: "",
    num_parcelas: 1,
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    tipo: "credito",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authFunctions.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkAuth();
    const {
      data: { subscription },
    } = authFunctions.onAuthStateChange((user) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const result = await authFunctions.signIn(email, password);
    if (!result.error && result.user) {
      setUser(result.user);
    }
    return { error: result.error ?? undefined };
  };

  const handleSignUp = async (
    email: string,
    password: string,
    nome: string
  ) => {
    const result = await authFunctions.signUp(email, password, nome);
    return { error: result.error ?? undefined };
  };

  const handleLogout = async () => {
    await authFunctions.signOut();
    setUser(null);
  };

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
      setSaldosDevedores(data);
    } catch (err) {
      console.error("Erro ao carregar saldos:", err);
      setSaldosDevedores([]);
    }
    setSaldosLoaded(true);
  }, []);

  // Carregar meus gastos do Supabase (ou localStorage como fallback)
  const fetchMeusGastos = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem("meusGastos");
      setMeusGastos(saved ? JSON.parse(saved) : []);
      setMeusGastosLoaded(true);
      return;
    }

    try {
      const data = await meusGastosFunctions.getAll();
      setMeusGastos(data);
    } catch (err) {
      console.error("Erro ao carregar meus gastos:", err);
      setMeusGastos([]);
    }
    setMeusGastosLoaded(true);
  }, []);

  // Carregar dados ao iniciar e quando o usuário mudar
  useEffect(() => {
    if (user) {
      fetchPessoas();
      fetchSaldos();
      fetchMeusGastos();
    }
  }, [user, fetchPessoas, fetchSaldos, fetchMeusGastos]);

  // Salvar meus gastos no localStorage como backup
  useEffect(() => {
    if (meusGastosLoaded) {
      localStorage.setItem("meusGastos", JSON.stringify(meusGastos));
    }
  }, [meusGastos, meusGastosLoaded]);

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

  // Gerar chave única para observações (pessoa + mês/ano)
  const getObsKey = (pessoa: string) => {
    return `${pessoa}_${format(mesVisualizacao, "yyyy-MM")}`;
  };

  // Obter mês atual no formato yyyy-MM
  const getMesAtual = () => format(mesVisualizacao, "yyyy-MM");

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

  // Carregar pagamentos parciais do Supabase (ou localStorage como fallback)
  const fetchPagamentosParciais = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem("pagamentosParciais");
      if (saved) {
        setPagamentosParciais(JSON.parse(saved));
      }
      return;
    }

    try {
      const data = await pagamentosParciaisFunctions.getAll();
      const pagMap: Record<string, PagamentoParcial[]> = {};
      data.forEach((item) => {
        const key = `${item.pessoa}_${item.mes}`;
        if (!pagMap[key]) pagMap[key] = [];
        pagMap[key].push({
          id: item.id,
          valor: Number(item.valor),
          data: item.data_pagamento,
        });
      });
      setPagamentosParciais(pagMap);
    } catch (err) {
      console.error("Erro ao carregar pagamentos parciais:", err);
    }
  }, []);

  // Carregar observações e pagamentos quando usuário logar
  useEffect(() => {
    if (user) {
      fetchObservacoes();
      fetchPagamentosParciais();
    }
  }, [user, fetchObservacoes, fetchPagamentosParciais]);

  // Salvar observações no localStorage como backup (modo demo)
  useEffect(() => {
    if (!isSupabaseConfigured && Object.keys(observacoesMes).length > 0) {
      localStorage.setItem("observacoesMes", JSON.stringify(observacoesMes));
    }
  }, [observacoesMes]);

  // Salvar pagamentos no localStorage como backup (modo demo)
  useEffect(() => {
    if (!isSupabaseConfigured && Object.keys(pagamentosParciais).length > 0) {
      localStorage.setItem(
        "pagamentosParciais",
        JSON.stringify(pagamentosParciais)
      );
    }
  }, [pagamentosParciais]);

  // Salvar observação de uma pessoa
  const handleSalvarObs = async (pessoa: string) => {
    const key = getObsKey(pessoa);
    const mes = getMesAtual();

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
  };

  // Abrir modal de observação
  const handleAbrirObs = (pessoa: string) => {
    const key = getObsKey(pessoa);
    setObsTexto(observacoesMes[key] || "");
    setShowObsModal(pessoa);
  };

  // Obter pagamentos parciais de uma pessoa no mês atual
  const getPagamentosParciais = (pessoa: string): PagamentoParcial[] => {
    const key = getObsKey(pessoa);
    return pagamentosParciais[key] || [];
  };

  // Calcular total pago parcialmente por uma pessoa no mês
  const getTotalPagoParcial = (pessoa: string): number => {
    return getPagamentosParciais(pessoa).reduce((acc, p) => acc + p.valor, 0);
  };

  // Adicionar pagamento parcial
  const handleAddPagamentoParcial = async (pessoa: string) => {
    const valor = parseCurrency(valorPagamentoParcial);
    if (valor <= 0) {
      setError("Valor de pagamento inválido.");
      return;
    }

    const resumoPessoa = resumoMensal.find((r) => r.pessoa === pessoa);
    const totalDevido = resumoPessoa?.total || 0;
    const jaPago = getTotalPagoParcial(pessoa);
    const restante = totalDevido - jaPago;

    if (valor > restante) {
      setError(`O valor não pode ser maior que ${formatCurrency(restante)}.`);
      return;
    }

    const dataPagamento = format(new Date(), "dd/MM/yyyy");
    const mes = getMesAtual();
    const key = getObsKey(pessoa);

    // Salvar no Supabase
    if (isSupabaseConfigured && supabase) {
      const result = await pagamentosParciaisFunctions.create({
        pessoa,
        mes,
        valor,
        data_pagamento: dataPagamento,
      });

      if (result) {
        setPagamentosParciais((prev) => ({
          ...prev,
          [key]: [
            ...(prev[key] || []),
            { id: result.id, valor, data: dataPagamento },
          ],
        }));
      }
    } else {
      // Modo demo - salvar localmente
      setPagamentosParciais((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { valor, data: dataPagamento }],
      }));
    }

    setValorPagamentoParcial("");
    setShowPagamentoParcial(null);
    setError(null);

    setModalFeedback({
      show: true,
      titulo: "Pagamento Registrado!",
      mensagem: `${pessoa} pagou ${formatCurrency(
        valor
      )}.\nFalta: ${formatCurrency(restante - valor)}`,
      tipo: "sucesso",
    });
  };

  // Remover último pagamento parcial (desfazer)
  const handleDesfazerPagamentoParcial = (pessoa: string) => {
    const key = getObsKey(pessoa);
    const pagamentos = pagamentosParciais[key] || [];

    if (pagamentos.length === 0) return;

    const ultimoPagamento = pagamentos[pagamentos.length - 1];

    setModalConfirm({
      show: true,
      titulo: "Desfazer Pagamento",
      mensagem: `Deseja remover o pagamento de ${formatCurrency(
        ultimoPagamento.valor
      )} feito em ${ultimoPagamento.data}?`,
      onConfirm: async () => {
        // Deletar do Supabase se tiver ID
        if (isSupabaseConfigured && supabase && ultimoPagamento.id) {
          await pagamentosParciaisFunctions.delete(ultimoPagamento.id);
        }

        setPagamentosParciais((prev) => ({
          ...prev,
          [key]: pagamentos.slice(0, -1),
        }));
        setModalConfirm({ ...modalConfirm, show: false });
      },
    });
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

  // ========== FUNÇÕES DE MEUS GASTOS ==========

  // Adicionar meu gasto
  const handleAddMeuGasto = async () => {
    const valor = parseCurrency(formMeuGasto.valor);
    if (!formMeuGasto.descricao || valor <= 0) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    let minhaParte = valor;
    if (formMeuGasto.categoria === "dividido" && formMeuGasto.minha_parte) {
      minhaParte = parseCurrency(formMeuGasto.minha_parte);
    }

    const numParcelas =
      formMeuGasto.tipo === "credito"
        ? parseInt(formMeuGasto.num_parcelas) || 1
        : 1;
    const valorParcela = valor / numParcelas;

    // Se for crédito parcelado, criar uma entrada para cada parcela
    if (formMeuGasto.tipo === "credito" && numParcelas > 1) {
      const dataInicio = new Date(formMeuGasto.data);

      for (let i = 0; i < numParcelas; i++) {
        const dataParcela = new Date(dataInicio);
        dataParcela.setMonth(dataParcela.getMonth() + i);

        const novoGasto: MeuGasto = {
          id: `${Date.now()}-${i}`,
          descricao: `${formMeuGasto.descricao} (${i + 1}/${numParcelas})`,
          valor: valorParcela,
          tipo: formMeuGasto.tipo,
          categoria: formMeuGasto.categoria,
          data: format(dataParcela, "yyyy-MM-dd"),
          pago: false,
          dividido_com:
            formMeuGasto.categoria === "dividido"
              ? formMeuGasto.dividido_com
              : undefined,
          minha_parte:
            formMeuGasto.categoria === "dividido"
              ? minhaParte / numParcelas
              : undefined,
          num_parcelas: numParcelas,
          parcela_atual: i + 1,
        };

        if (isSupabaseConfigured && supabase) {
          await meusGastosFunctions.create(novoGasto);
        }
        setMeusGastos((prev) => [...prev, novoGasto]);
      }
    } else {
      // Gasto único (débito ou crédito à vista)
      // Débito é automaticamente marcado como pago
      const novoGasto: MeuGasto = {
        id: Date.now().toString(),
        descricao: formMeuGasto.descricao,
        valor: valor,
        tipo: formMeuGasto.tipo,
        categoria: formMeuGasto.categoria,
        data: formMeuGasto.data,
        pago: formMeuGasto.tipo === "debito",
        dividido_com:
          formMeuGasto.categoria === "dividido"
            ? formMeuGasto.dividido_com
            : undefined,
        minha_parte:
          formMeuGasto.categoria === "dividido" ? minhaParte : undefined,
        dia_vencimento:
          formMeuGasto.categoria === "fixo"
            ? parseInt(formMeuGasto.dia_vencimento)
            : undefined,
        ativo: formMeuGasto.categoria === "fixo" ? true : undefined,
        num_parcelas: 1,
        parcela_atual: 1,
      };

      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.create(novoGasto);
      }
      setMeusGastos((prev) => [...prev, novoGasto]);
    }

    setFormMeuGasto({
      descricao: "",
      valor: "",
      tipo: "debito",
      categoria: "pessoal",
      data: format(new Date(), "yyyy-MM-dd"),
      dividido_com: "",
      minha_parte: "",
      dia_vencimento: "",
      num_parcelas: "1",
    });
    setShowFormMeuGasto(false);
    setEditandoMeuGasto(null);
    setError(null);
  };

  // Editar meu gasto
  const handleEditMeuGasto = (gasto: MeuGasto) => {
    // Calcular valor total (valor da parcela * número de parcelas)
    const numParcelas = gasto.num_parcelas || 1;
    const valorTotal = gasto.valor * numParcelas;
    const minhaParteTotal = gasto.minha_parte
      ? gasto.minha_parte * numParcelas
      : undefined;

    setFormMeuGasto({
      descricao: gasto.descricao.replace(/\s*\(\d+\/\d+\)$/, ""), // Remove " (1/3)" do final
      valor: formatCurrency(valorTotal).replace("R$\u00a0", ""),
      tipo: gasto.tipo,
      categoria: gasto.categoria,
      data: gasto.data,
      dividido_com: gasto.dividido_com || "",
      minha_parte: minhaParteTotal
        ? formatCurrency(minhaParteTotal).replace("R$\u00a0", "")
        : "",
      dia_vencimento: gasto.dia_vencimento?.toString() || "",
      num_parcelas: numParcelas.toString(),
    });
    setEditandoMeuGasto(gasto);
    setShowFormMeuGasto(true);
  };

  // Salvar edição de meu gasto
  const handleSaveMeuGasto = async () => {
    // Se está editando, atualizar
    if (editandoMeuGasto) {
      const valor = parseCurrency(formMeuGasto.valor);
      if (!formMeuGasto.descricao || valor <= 0) {
        setError("Preencha todos os campos corretamente.");
        return;
      }

      let minhaParte = valor;
      if (formMeuGasto.categoria === "dividido" && formMeuGasto.minha_parte) {
        minhaParte = parseCurrency(formMeuGasto.minha_parte);
      }

      const numParcelas =
        formMeuGasto.tipo === "credito"
          ? parseInt(formMeuGasto.num_parcelas) || 1
          : 1;
      const valorParcela = valor / numParcelas;

      // Extrair a descrição base do gasto que está sendo editado (sem o "(X/Y)")
      const descricaoBaseOriginal = editandoMeuGasto.descricao.replace(
        /\s*\(\d+\/\d+\)$/,
        ""
      );
      const numParcelasOriginal = editandoMeuGasto.num_parcelas || 1;

      // Encontrar todas as parcelas relacionadas (mesma descrição base e num_parcelas)
      const parcelasRelacionadas = meusGastos.filter((g) => {
        const descBase = g.descricao.replace(/\s*\(\d+\/\d+\)$/, "");
        return (
          descBase === descricaoBaseOriginal &&
          g.num_parcelas === numParcelasOriginal
        );
      });

      // Se é crédito parcelado
      if (formMeuGasto.tipo === "credito" && numParcelas > 1) {
        // Atualizar todas as parcelas existentes
        for (const parcela of parcelasRelacionadas) {
          const parcelaAtual = parcela.parcela_atual || 1;
          const updates: Partial<MeuGasto> = {
            descricao: `${formMeuGasto.descricao} (${parcelaAtual}/${numParcelas})`,
            valor: valorParcela,
            tipo: formMeuGasto.tipo,
            categoria: formMeuGasto.categoria,
            dividido_com:
              formMeuGasto.categoria === "dividido"
                ? formMeuGasto.dividido_com
                : undefined,
            minha_parte:
              formMeuGasto.categoria === "dividido"
                ? minhaParte / numParcelas
                : undefined,
            num_parcelas: numParcelas,
          };

          if (isSupabaseConfigured && supabase) {
            await meusGastosFunctions.update(parcela.id, updates);
          }

          setMeusGastos((prev) =>
            prev.map((g) => (g.id === parcela.id ? { ...g, ...updates } : g))
          );
        }
      } else {
        // Gasto único (débito ou crédito à vista)
        // Se tinha parcelas e agora é único, atualizar apenas o atual
        const updates: Partial<MeuGasto> = {
          descricao: formMeuGasto.descricao,
          valor: valor,
          tipo: formMeuGasto.tipo,
          categoria: formMeuGasto.categoria,
          data: formMeuGasto.data,
          dividido_com:
            formMeuGasto.categoria === "dividido"
              ? formMeuGasto.dividido_com
              : undefined,
          minha_parte:
            formMeuGasto.categoria === "dividido" ? minhaParte : undefined,
          dia_vencimento:
            formMeuGasto.categoria === "fixo"
              ? parseInt(formMeuGasto.dia_vencimento)
              : undefined,
          pago: formMeuGasto.tipo === "debito" ? true : editandoMeuGasto.pago,
          num_parcelas: 1,
          parcela_atual: 1,
        };

        if (isSupabaseConfigured && supabase) {
          await meusGastosFunctions.update(editandoMeuGasto.id, updates);
        }

        setMeusGastos((prev) =>
          prev.map((g) =>
            g.id === editandoMeuGasto.id ? { ...g, ...updates } : g
          )
        );
      }

      setFormMeuGasto({
        descricao: "",
        valor: "",
        tipo: "debito",
        categoria: "pessoal",
        data: format(new Date(), "yyyy-MM-dd"),
        dividido_com: "",
        minha_parte: "",
        dia_vencimento: "",
        num_parcelas: "1",
      });
      setShowFormMeuGasto(false);
      setEditandoMeuGasto(null);
      setError(null);
    } else {
      // Se não está editando, criar novo
      await handleAddMeuGasto();
    }
  };

  // Marcar meu gasto como pago/não pago
  const handleTogglePagoMeuGasto = async (id: string) => {
    const gasto = meusGastos.find((g) => g.id === id);
    if (!gasto) return;

    const novoStatus = !gasto.pago;
    const updates = {
      pago: novoStatus,
      data_pagamento: novoStatus ? format(new Date(), "yyyy-MM-dd") : undefined,
    };

    if (isSupabaseConfigured && supabase) {
      await meusGastosFunctions.update(id, updates);
    }

    setMeusGastos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  // Excluir meu gasto
  const handleDeleteMeuGasto = (id: string) => {
    const gastoParaExcluir = meusGastos.find((g) => g.id === id);
    if (!gastoParaExcluir) return;

    // Extrair a descrição base (sem o "(X/Y)")
    const descricaoBase = gastoParaExcluir.descricao.replace(
      /\s*\(\d+\/\d+\)$/,
      ""
    );
    const numParcelas = gastoParaExcluir.num_parcelas || 1;

    // Encontrar todas as parcelas relacionadas
    const parcelasRelacionadas = meusGastos.filter((g) => {
      const descBase = g.descricao.replace(/\s*\(\d+\/\d+\)$/, "");
      return descBase === descricaoBase && g.num_parcelas === numParcelas;
    });

    const mensagem =
      parcelasRelacionadas.length > 1
        ? `Tem certeza que deseja excluir este gasto e todas as suas ${parcelasRelacionadas.length} parcelas?`
        : "Tem certeza que deseja excluir este gasto?";

    setModalConfirm({
      show: true,
      titulo: "Excluir Gasto",
      mensagem,
      onConfirm: async () => {
        // Excluir todas as parcelas relacionadas
        for (const parcela of parcelasRelacionadas) {
          if (isSupabaseConfigured && supabase) {
            await meusGastosFunctions.delete(parcela.id);
          }
        }

        // Remover todas as parcelas do estado local
        const idsParaExcluir = new Set(parcelasRelacionadas.map((p) => p.id));
        setMeusGastos((prev) => prev.filter((g) => !idsParaExcluir.has(g.id)));
        setModalConfirm({ ...modalConfirm, show: false });
      },
    });
  };

  // Desativar gasto fixo
  const handleToggleGastoFixo = async (id: string) => {
    const gasto = meusGastos.find((g) => g.id === id);
    if (!gasto) return;

    const novoStatus = !gasto.ativo;

    if (isSupabaseConfigured && supabase) {
      await meusGastosFunctions.update(id, { ativo: novoStatus });
    }

    setMeusGastos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ativo: novoStatus } : g))
    );
  };

  // Filtrar meus gastos do mês atual
  const meusGastosDoMes = meusGastos.filter((g) => {
    const mesGasto = g.data.substring(0, 7);
    const mesAtual = format(mesVisualizacao, "yyyy-MM");
    const matchMes = mesGasto === mesAtual;
    const matchCategoria = filtroCategoriaMeuGasto
      ? g.categoria === filtroCategoriaMeuGasto
      : g.categoria !== "fixo"; // Não mostrar gastos fixos na lista normal
    return matchMes && matchCategoria;
  });

  // Gastos fixos (sempre mostrar)
  const gastosFixos = meusGastos.filter((g) => g.categoria === "fixo");

  // Calcular totais de meus gastos
  const totalMeusGastosCredito = meusGastosDoMes
    .filter((g) => g.tipo === "credito")
    .reduce(
      (acc, g) =>
        acc +
        (g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalMeusGastosDebito = meusGastosDoMes
    .filter((g) => g.tipo === "debito")
    .reduce(
      (acc, g) =>
        acc +
        (g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  const totalMeusGastosPagos = meusGastosDoMes
    .filter((g) => g.pago || g.tipo === "debito")
    .reduce(
      (acc, g) =>
        acc +
        (g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor),
      0
    );

  // Total de gastos fixos ativos
  const totalGastosFixos = gastosFixos
    .filter((g) => g.ativo !== false)
    .reduce((acc, g) => acc + g.valor, 0);

  // Buscar gastos do Supabase
  const fetchGastos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase!
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
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar gastos ao iniciar e quando o usuário mudar
  useEffect(() => {
    if (user) {
      fetchGastos();
    }
  }, [user, fetchGastos]);

  // Sincronização em tempo real com Supabase (Realtime)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Inscrever para mudanças na tabela gastos
    const gastosChannel = supabase
      .channel("gastos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gastos" },
        () => {
          fetchGastos();
        }
      )
      .subscribe();

    // Inscrever para mudanças na tabela saldos_devedores
    const saldosChannel = supabase
      .channel("saldos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saldos_devedores" },
        () => {
          fetchSaldos();
        }
      )
      .subscribe();

    // Inscrever para mudanças na tabela pessoas
    const pessoasChannel = supabase
      .channel("pessoas-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pessoas" },
        () => {
          fetchPessoas();
        }
      )
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

      // Se está editando
      if (editandoGasto) {
        const { error: updateError } = await supabase!
          .from("gastos")
          .update({
            descricao: formData.descricao.trim(),
            pessoa: formData.pessoa,
            valor_total: valorNumerico,
            num_parcelas: formData.num_parcelas,
            data_inicio: formData.data_inicio,
            tipo: formData.tipo,
          })
          .eq("id", editandoGasto.id);

        if (updateError) throw updateError;
        await fetchGastos();
        setEditandoGasto(null);
      } else {
        const {
          data: { user: currentUser },
        } = await supabase!.auth.getUser();
        const { error: insertError } = await supabase!.from("gastos").insert({
          descricao: formData.descricao.trim(),
          pessoa: formData.pessoa,
          valor_total: valorNumerico,
          num_parcelas: formData.num_parcelas,
          data_inicio: formData.data_inicio,
          tipo: formData.tipo,
          user_id: currentUser?.id,
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

  // Iniciar edição de gasto
  const handleEditGasto = (gasto: Gasto) => {
    setFormData({
      descricao: gasto.descricao,
      pessoa: gasto.pessoa,
      valor_total: formatCurrency(gasto.valor_total).replace("R$\u00a0", ""),
      num_parcelas: gasto.num_parcelas,
      data_inicio: gasto.data_inicio,
      tipo: gasto.tipo,
    });
    setEditandoGasto(gasto);
    setShowForm(true);
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

          const { error: deleteError } = await supabase!
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

  // Loading de autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            Configuração Necessária
          </h1>
          <p className="text-gray-400">
            Configure as variáveis de ambiente do Supabase no arquivo .env.local
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg sticky top-0 z-40 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-blue-500" />
              {user?.user_metadata?.nome || "Controle Financeiro"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (abaAtiva === "gastos") setShowForm(true);
                  else if (abaAtiva === "dividas") setShowFormDivida(true);
                  else setShowFormMeuGasto(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {abaAtiva === "gastos"
                    ? "Novo Gasto"
                    : abaAtiva === "dividas"
                    ? "Nova Dívida"
                    : "Novo"}
                </span>
              </button>
              {user && (
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setAbaAtiva("eu")}
              className={`py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "eu"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <UserCircle className="w-4 h-4" />
              Eu
            </button>
            <button
              onClick={() => setAbaAtiva("gastos")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === "gastos"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Gastos do Mês</span>
              <span className="sm:hidden">Gastos</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card Total Geral */}
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-4 text-white shadow-sm">
                <p className="text-sm text-gray-300 mb-1">Total do Mês</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMes)}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {parcelasAtivas.length} lançamentos
                </p>
              </div>

              {/* Cards por Pessoa */}
              {resumoMensal.map((resumo, index) => {
                const obsKey = getObsKey(resumo.pessoa);
                const temObs = observacoesMes[obsKey];
                const pagamentos = getPagamentosParciais(resumo.pessoa);
                const totalPago = getTotalPagoParcial(resumo.pessoa);
                const restante = resumo.total - totalPago;
                const temPagamentos = pagamentos.length > 0;

                return (
                  <div
                    key={resumo.pessoa}
                    className={`bg-gradient-to-br ${
                      coresCards[index % coresCards.length]
                    } rounded-xl p-3 sm:p-4 text-white shadow-sm overflow-hidden`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm text-white/80 mb-1 flex items-center gap-1">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{resumo.pessoa}</span>
                        </p>
                        <p className="text-lg sm:text-xl font-bold">
                          {formatCurrency(resumo.total)}
                        </p>
                        <p className="text-xs text-white/70 mt-1">
                          {resumo.quantidade} itens
                        </p>

                        {/* Pagamentos Parciais */}
                        {temPagamentos && (
                          <div className="mt-2 p-2 bg-green-900/40 rounded-lg border border-green-500/30 overflow-hidden">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-green-300 font-medium">
                                Pago:
                              </span>
                              <button
                                onClick={() =>
                                  handleDesfazerPagamentoParcial(resumo.pessoa)
                                }
                                className="p-0.5 hover:bg-green-800/50 rounded transition-colors flex-shrink-0"
                                title="Desfazer último"
                              >
                                <Undo2 className="w-3 h-3 text-green-300" />
                              </button>
                            </div>
                            {pagamentos.map((p, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs gap-1"
                              >
                                <span className="text-green-200 truncate">
                                  {p.data}
                                </span>
                                <span className="text-green-100 font-medium flex-shrink-0">
                                  {formatCurrency(p.valor)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-green-500/30 mt-1 pt-1 flex justify-between">
                              <span className="text-xs text-yellow-300">
                                Falta:
                              </span>
                              <span className="text-xs text-yellow-200 font-bold flex-shrink-0">
                                {formatCurrency(restante)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Observação */}
                        {temObs && (
                          <div className="mt-2 p-2 bg-black/20 rounded-lg overflow-hidden">
                            <p className="text-xs text-white/90 break-words whitespace-pre-wrap line-clamp-3">
                              {temObs}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <button
                          onClick={() => handleAbrirObs(resumo.pessoa)}
                          className={`p-1.5 ${
                            temObs ? "bg-yellow-500/40" : "bg-white/20"
                          } hover:bg-white/30 rounded-lg transition-colors`}
                          title={
                            temObs
                              ? "Editar observação"
                              : "Adicionar observação"
                          }
                        >
                          {temObs ? (
                            <Edit3 className="w-4 h-4" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowPagamentoParcial(resumo.pessoa);
                            setValorPagamentoParcial("");
                          }}
                          className={`p-1.5 ${
                            temPagamentos ? "bg-green-500/40" : "bg-white/20"
                          } hover:bg-white/30 rounded-lg transition-colors`}
                          title="Pagamento parcial"
                        >
                          <Banknote className="w-4 h-4" />
                        </button>
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
                  </div>
                );
              })}
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
                  <h3 className="font-semibold text-white mb-4">
                    Lançamentos do Mês
                  </h3>

                  {/* Filtros */}
                  <div className="space-y-3">
                    {/* Filtro por Pessoa */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">
                        Filtrar por pessoa:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFiltroPessoaGasto("")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            filtroPessoaGasto === ""
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          Todos
                        </button>
                        {pessoas.map((pessoa) => (
                          <button
                            key={pessoa}
                            onClick={() => setFiltroPessoaGasto(pessoa)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              filtroPessoaGasto === pessoa
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            {pessoa}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filtro por Tipo */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">
                        Filtrar por tipo:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFiltroTipoGasto("")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            filtroTipoGasto === ""
                              ? "bg-gray-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setFiltroTipoGasto("credito")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            filtroTipoGasto === "credito"
                              ? "bg-amber-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Crédito
                        </button>
                        <button
                          onClick={() => setFiltroTipoGasto("debito")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            filtroTipoGasto === "debito"
                              ? "bg-teal-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          Débito
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {parcelasAtivas.filter(
                  (p) =>
                    (filtroPessoaGasto === "" ||
                      p.gasto.pessoa === filtroPessoaGasto) &&
                    (filtroTipoGasto === "" || p.gasto.tipo === filtroTipoGasto)
                ).length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>
                      Nenhum lançamento{" "}
                      {filtroPessoaGasto ? `de ${filtroPessoaGasto} ` : ""}
                      {filtroTipoGasto
                        ? `(${
                            filtroTipoGasto === "credito" ? "crédito" : "débito"
                          }) `
                        : ""}
                      para este mês
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {parcelasAtivas
                      .filter(
                        (p) =>
                          (filtroPessoaGasto === "" ||
                            p.gasto.pessoa === filtroPessoaGasto) &&
                          (filtroTipoGasto === "" ||
                            p.gasto.tipo === filtroTipoGasto)
                      )
                      .map(({ gasto, parcela_atual, valor_parcela }) => (
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
                              <div className="flex items-center justify-end gap-1 mt-2">
                                <button
                                  onClick={() => handleEditGasto(gasto)}
                                  className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                  aria-label="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(gasto.id)}
                                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                  aria-label="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
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

        {/* === ABA EU (MEUS GASTOS) === */}
        {abaAtiva === "eu" && (
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
                  <h2 className="text-xl font-bold text-white capitalize">
                    {formatMonthYear(mesVisualizacao)}
                  </h2>
                  <button
                    onClick={irParaHoje}
                    className="text-xs text-emerald-400 hover:text-emerald-300 mt-1"
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

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white shadow-lg">
                <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Crédito
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalMeusGastosCredito)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white shadow-lg">
                <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Débito
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalMeusGastosDebito)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white shadow-lg">
                <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Pago
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalMeusGastosPagos)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white shadow-lg">
                <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
                  <Repeat className="w-3 h-3" /> Fixos
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalGastosFixos)}
                </p>
              </div>
            </div>

            {/* Filtro de Categoria */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Filtrar por:</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFiltroCategoriaMeuGasto("")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filtroCategoriaMeuGasto === ""
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroCategoriaMeuGasto("pessoal")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    filtroCategoriaMeuGasto === "pessoal"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <User className="w-3 h-3" /> Pessoal
                </button>
                <button
                  onClick={() => setFiltroCategoriaMeuGasto("dividido")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    filtroCategoriaMeuGasto === "dividido"
                      ? "bg-pink-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <Users className="w-3 h-3" /> Dividido
                </button>
              </div>
            </div>

            {/* Gastos Fixos */}
            {gastosFixos.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-amber-400" />
                  Gastos Fixos Mensais
                </h3>
                <div className="space-y-2">
                  {gastosFixos.map((gasto) => (
                    <div
                      key={gasto.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        gasto.ativo !== false
                          ? "bg-gray-700"
                          : "bg-gray-700/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            gasto.tipo === "credito"
                              ? "bg-purple-500/20"
                              : "bg-green-500/20"
                          }`}
                        >
                          {gasto.tipo === "credito" ? (
                            <CreditCard className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Wallet className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {gasto.descricao}
                          </p>
                          <p className="text-xs text-gray-400">
                            Todo dia {gasto.dia_vencimento}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">
                          {formatCurrency(gasto.valor)}
                        </p>
                        <button
                          onClick={() => handleEditMeuGasto(gasto)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleGastoFixo(gasto.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            gasto.ativo !== false
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-gray-600 text-gray-400 hover:bg-gray-500"
                          }`}
                          title={gasto.ativo !== false ? "Desativar" : "Ativar"}
                        >
                          {gasto.ativo !== false ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <MinusCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteMeuGasto(gasto.id)}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Meus Gastos do Mês */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Meus Gastos do Mês ({meusGastosDoMes.length})
              </h3>

              {meusGastosDoMes.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">Nenhum gasto registrado</p>
                  <button
                    onClick={() => setShowFormMeuGasto(true)}
                    className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    + Adicionar primeiro gasto
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {meusGastosDoMes.map((gasto) => (
                    <li
                      key={gasto.id}
                      className={`p-4 rounded-xl border transition-all ${
                        gasto.pago || gasto.tipo === "debito"
                          ? "bg-gray-700/50 border-gray-600 opacity-70"
                          : "bg-gray-700 border-gray-600"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Só mostra checkbox para crédito */}
                          {gasto.tipo === "credito" ? (
                            <button
                              onClick={() => handleTogglePagoMeuGasto(gasto.id)}
                              className={`mt-1 p-2 rounded-lg transition-colors ${
                                gasto.pago
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-600 text-gray-400 hover:bg-gray-500"
                              }`}
                            >
                              {gasto.pago ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                              )}
                            </button>
                          ) : (
                            <div className="mt-1 p-2 rounded-lg bg-green-500/20 text-green-400">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p
                              className={`font-medium ${
                                gasto.pago || gasto.tipo === "debito"
                                  ? "text-gray-400"
                                  : "text-white"
                              }`}
                            >
                              {gasto.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  gasto.tipo === "credito"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : "bg-green-500/20 text-green-400"
                                }`}
                              >
                                {gasto.tipo === "credito"
                                  ? "Crédito"
                                  : "Débito"}
                              </span>
                              {gasto.categoria === "dividido" && (
                                <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {gasto.dividido_com}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {format(
                                  new Date(gasto.data + "T12:00:00"),
                                  "dd/MM"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              gasto.pago || gasto.tipo === "debito"
                                ? "text-gray-400"
                                : "text-white"
                            }`}
                          >
                            {formatCurrency(
                              gasto.categoria === "dividido" &&
                                gasto.minha_parte
                                ? gasto.minha_parte
                                : gasto.valor
                            )}
                          </p>
                          {gasto.categoria === "dividido" &&
                            gasto.minha_parte && (
                              <p className="text-xs text-gray-500">
                                Total: {formatCurrency(gasto.valor)}
                              </p>
                            )}
                          <div className="flex items-center justify-end gap-1 mt-2">
                            <button
                              onClick={() => handleEditMeuGasto(gasto)}
                              className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMeuGasto(gasto.id)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal Adicionar/Editar Meu Gasto */}
      {showFormMeuGasto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto border-t sm:border border-gray-700">
            <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-white">
                {editandoMeuGasto
                  ? "Editar Gasto Pessoal"
                  : "Novo Gasto Pessoal"}
              </h2>
              <button
                onClick={() => {
                  setShowFormMeuGasto(false);
                  setEditandoMeuGasto(null);
                  setFormMeuGasto({
                    descricao: "",
                    valor: "",
                    tipo: "debito",
                    categoria: "pessoal",
                    data: format(new Date(), "yyyy-MM-dd"),
                    dividido_com: "",
                    minha_parte: "",
                    dia_vencimento: "",
                    num_parcelas: "1",
                  });
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Gasto
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        categoria: "pessoal",
                      }))
                    }
                    className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      formMeuGasto.categoria === "pessoal"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-xs">Pessoal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        categoria: "dividido",
                      }))
                    }
                    className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      formMeuGasto.categoria === "dividido"
                        ? "bg-pink-600 border-pink-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span className="text-xs">Dividido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        categoria: "fixo",
                      }))
                    }
                    className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      formMeuGasto.categoria === "fixo"
                        ? "bg-amber-600 border-amber-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <Repeat className="w-5 h-5" />
                    <span className="text-xs">Fixo</span>
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formMeuGasto.descricao}
                  onChange={(e) =>
                    setFormMeuGasto((prev) => ({
                      ...prev,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Ex: Netflix, Almoço, etc."
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Valor Total
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formMeuGasto.valor}
                    onChange={(e) =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        valor: formatCurrencyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Campos para Dividido */}
              {formMeuGasto.categoria === "dividido" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Dividido com
                    </label>
                    <input
                      type="text"
                      value={formMeuGasto.dividido_com}
                      onChange={(e) =>
                        setFormMeuGasto((prev) => ({
                          ...prev,
                          dividido_com: e.target.value,
                        }))
                      }
                      placeholder="Ex: João, Maria, etc."
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Minha Parte
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        R$
                      </span>
                      <input
                        type="text"
                        value={formMeuGasto.minha_parte}
                        onChange={(e) =>
                          setFormMeuGasto((prev) => ({
                            ...prev,
                            minha_parte: formatCurrencyInput(e.target.value),
                          }))
                        }
                        placeholder="0,00"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Campo para Fixo */}
              {formMeuGasto.categoria === "fixo" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Dia do Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formMeuGasto.dia_vencimento}
                    onChange={(e) =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        dia_vencimento: e.target.value,
                      }))
                    }
                    placeholder="Ex: 10"
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              {/* Data (não para fixo) */}
              {formMeuGasto.categoria !== "fixo" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={formMeuGasto.data}
                    onChange={(e) =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        data: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              {/* Tipo (Crédito/Débito) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormMeuGasto((prev) => ({
                        ...prev,
                        tipo: "debito",
                        num_parcelas: "1",
                      }))
                    }
                    className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      formMeuGasto.tipo === "debito"
                        ? "bg-green-600 border-green-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    Débito
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormMeuGasto((prev) => ({ ...prev, tipo: "credito" }))
                    }
                    className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      formMeuGasto.tipo === "credito"
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Crédito
                  </button>
                </div>
              </div>

              {/* Parcelas (apenas para Crédito e não fixo) */}
              {formMeuGasto.tipo === "credito" &&
                formMeuGasto.categoria !== "fixo" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Número de Parcelas
                    </label>
                    <select
                      value={formMeuGasto.num_parcelas}
                      onChange={(e) =>
                        setFormMeuGasto((prev) => ({
                          ...prev,
                          num_parcelas: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(
                        (num) => (
                          <option key={num} value={num}>
                            {num}x{" "}
                            {num === 1
                              ? "(à vista)"
                              : `de ${
                                  formMeuGasto.valor
                                    ? formatCurrency(
                                        parseCurrency(formMeuGasto.valor) / num
                                      )
                                    : "R$ 0,00"
                                }`}
                          </option>
                        )
                      )}
                    </select>
                    {parseInt(formMeuGasto.num_parcelas) > 1 &&
                      formMeuGasto.valor && (
                        <p className="text-sm text-gray-400 mt-1">
                          {formMeuGasto.num_parcelas}x de{" "}
                          {formatCurrency(
                            parseCurrency(formMeuGasto.valor) /
                              parseInt(formMeuGasto.num_parcelas)
                          )}
                        </p>
                      )}
                  </div>
                )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSaveMeuGasto}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {editandoMeuGasto ? (
                  <>
                    <Edit3 className="w-5 h-5" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    {formMeuGasto.categoria === "fixo"
                      ? "Adicionar Gasto Fixo"
                      : "Adicionar Gasto"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Observação por Pessoa/Mês */}
      {showObsModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-yellow-400" />
                Observação - {showObsModal}
              </h2>
              <button
                onClick={() => {
                  setShowObsModal(null);
                  setObsTexto("");
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">
                  Mês:{" "}
                  <span className="text-white font-medium">
                    {formatMonthYear(mesVisualizacao)}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Observação
                </label>
                <textarea
                  value={obsTexto}
                  onChange={(e) => setObsTexto(e.target.value)}
                  placeholder="Ex: Pagou R$ 1.000 em 15/12, falta R$ 500..."
                  rows={4}
                  className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowObsModal(null);
                    setObsTexto("");
                  }}
                  className="flex-1 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSalvarObs(showObsModal)}
                  className="flex-1 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento Parcial */}
      {showPagamentoParcial && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-400" />
                Pagamento Parcial - {showPagamentoParcial}
              </h2>
              <button
                onClick={() => {
                  setShowPagamentoParcial(null);
                  setValorPagamentoParcial("");
                  setError(null);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {(() => {
                const resumoPessoa = resumoMensal.find(
                  (r) => r.pessoa === showPagamentoParcial
                );
                const totalDevido = resumoPessoa?.total || 0;
                const jaPago = getTotalPagoParcial(showPagamentoParcial);
                const restante = totalDevido - jaPago;

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
                        <span className="text-gray-400">Total do mês:</span>
                        <span className="text-white font-medium">
                          {formatCurrency(totalDevido)}
                        </span>
                      </div>
                      {jaPago > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-green-400">Já pago:</span>
                            <span className="text-green-300 font-medium">
                              {formatCurrency(jaPago)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-gray-600 pt-2">
                            <span className="text-yellow-400">
                              Falta pagar:
                            </span>
                            <span className="text-yellow-300 font-bold">
                              {formatCurrency(restante)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Valor do pagamento
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          R$
                        </span>
                        <input
                          type="text"
                          value={valorPagamentoParcial}
                          onChange={(e) =>
                            setValorPagamentoParcial(
                              formatCurrencyInput(e.target.value)
                            )
                          }
                          placeholder="0,00"
                          className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
                          inputMode="numeric"
                        />
                      </div>
                      {restante > 0 && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() =>
                              setValorPagamentoParcial(
                                restante.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              )
                            }
                            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                          >
                            Tudo ({formatCurrency(restante)})
                          </button>
                          <button
                            onClick={() =>
                              setValorPagamentoParcial(
                                (restante / 2).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              )
                            }
                            className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
                          >
                            Metade ({formatCurrency(restante / 2)})
                          </button>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowPagamentoParcial(null);
                          setValorPagamentoParcial("");
                          setError(null);
                        }}
                        className="flex-1 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() =>
                          handleAddPagamentoParcial(showPagamentoParcial)
                        }
                        disabled={restante <= 0}
                        className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Registrar
                      </button>
                    </div>
                  </>
                );
              })()}
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
                {editandoGasto ? "Editar Lançamento" : "Novo Lançamento"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditandoGasto(null);
                  setFormData({
                    descricao: "",
                    pessoa: pessoas[0] || "",
                    valor_total: "",
                    num_parcelas: 1,
                    data_inicio: format(new Date(), "yyyy-MM-dd"),
                    tipo: "credito",
                  });
                }}
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
                  onClick={() => {
                    setShowForm(false);
                    setEditandoGasto(null);
                    setFormData({
                      descricao: "",
                      pessoa: pessoas[0] || "",
                      valor_total: "",
                      num_parcelas: 1,
                      data_inicio: format(new Date(), "yyyy-MM-dd"),
                      tipo: "credito",
                    });
                  }}
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
