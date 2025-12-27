import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  TrendingDown,
  Loader2,
  AlertCircle,
  UserCircle,
  Receipt,
  Clock,
  LogOut,
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
  parseCurrency,
  getParcelasAtivas,
  calcularResumoMensal,
  calcularTotalMes,
} from "./utils/calculations";
import { Login } from "./components/Login";
import {
  FormGastoModal,
  FormDividaModal,
  FormMeuGastoModal,
  ConfirmModal,
  FeedbackModal,
  ObservacaoModal,
  PagamentoParcialModal,
  FecharMesModal,
  PagamentoModal,
} from "./components/modals";
import { TabGastos, TabDividas, TabMeuGasto } from "./components/Tabs";
import type { PagamentoParcial } from "./types/extended";
import "./index.css";

function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"gastos" | "dividas" | "eu">("eu");
  const [mesVisualizacao, setMesVisualizacao] = useState<Date>(new Date());
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parcelasAtivas, setParcelasAtivas] = useState<ParcelaAtiva[]>([]);
  const [resumoMensal, setResumoMensal] = useState<ResumoMensal[]>([]);
  const [totalMes, setTotalMes] = useState<number>(0);
  const [saldosDevedores, setSaldosDevedores] = useState<SaldoDevedor[]>([]);
  const [saldosLoaded, setSaldosLoaded] = useState<boolean>(false);
  const [showFormDivida, setShowFormDivida] = useState<boolean>(false);
  const [showPagamento, setShowPagamento] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState<string>("");
  const [obsPagamento, setObsPagamento] = useState<string>("");
  const [formDivida, setFormDivida] = useState<SaldoDevedorForm>({
    pessoa: "",
    descricao: "",
    valor: "",
  });
  const [filtroPessoaGasto, setFiltroPessoaGasto] = useState<string>("");
  const [filtroTipoGasto, setFiltroTipoGasto] = useState<string>("");
  const [filtroDiaGasto, setFiltroDiaGasto] = useState<string>("");
  const [filtroDiaMeuGasto, setFiltroDiaMeuGasto] = useState<string>("");
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

    setSaving(true);
    try {
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
    } finally {
      setSaving(false);
    }
  };

  // Registrar pagamento de dívida
  const handlePagamento = async (dividaId: string) => {
    const valor = parseCurrency(valorPagamento);
    if (valor <= 0) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        tipo: "info",
        mensagem: "Valor de pagamento inválido.",
      });
      return;
    }

    // Arredondar para 2 casas decimais para evitar erros de ponto flutuante
    const valorArredondado = Math.round(valor * 100) / 100;
    const dividaAtual = saldosDevedores.find((d) => d.id === dividaId);
    if (!dividaAtual) return;

    const maximoArredondado = Math.round(dividaAtual.valor_atual * 100) / 100;

    if (valorArredondado > maximoArredondado + 0.01) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        tipo: "info",
        mensagem: `O valor não pode ser maior que ${formatCurrency(
          maximoArredondado
        )}.`,
      });
      return;
    }

    // Usar o menor entre o valor pago e o máximo (para evitar valores negativos)
    const valorFinal = Math.min(valorArredondado, maximoArredondado);

    setSaving(true);
    try {
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
      setModalFeedback({
        show: true,
        titulo: "Sucesso",
        tipo: "sucesso",
        mensagem: `Pagamento de ${formatCurrency(
          valorFinal
        )} registrado com sucesso!`,
      });
    } catch (err) {
      setModalFeedback({
        show: true,
        titulo: "Erro",
        tipo: "info",
        mensagem:
          err instanceof Error
            ? err.message
            : "Erro ao registrar pagamento. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
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
        setSaving(true);
        try {
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
        } finally {
          setSaving(false);
        }
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
        setSaving(true);
        try {
          // Deletar no Supabase se configurado
          if (isSupabaseConfigured && supabase) {
            await saldosFunctions.delete(id);
          }
          setSaldosDevedores((prev) => prev.filter((d) => d.id !== id));
          setModalConfirm({ ...modalConfirm, show: false });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Fechar mês de uma pessoa
  const handleFecharMes = async (pessoa: string) => {
    const resumoPessoa = resumoMensal.find((r) => r.pessoa === pessoa);
    if (!resumoPessoa) return;

    const jaPago = getTotalPagoParcial(pessoa);
    const totalDevido = resumoPessoa.total;
    const totalRestante = totalDevido - jaPago;
    const valorPago = parseCurrency(valorPagoFecharMes);

    if (valorPago < 0) {
      setError("Valor pago inválido.");
      return;
    }

    if (valorPago > totalRestante + 0.01) {
      // +0.01 margin for float errors
      setError(
        `O valor pago não pode ser maior que o restante (${formatCurrency(
          totalRestante
        )}).`
      );
      return;
    }

    const valorDevedor = totalRestante - valorPago;

    setSaving(true);
    try {
      // Registrar o pagamento se houver valor pago
      if (valorPago > 0) {
        const dataPagamento = format(new Date(), "dd/MM/yyyy");
        const mes = getMesAtual();
        const key = getObsKey(pessoa);

        if (isSupabaseConfigured && supabase) {
          const result = await pagamentosParciaisFunctions.create({
            pessoa,
            mes,
            valor: valorPago,
            data_pagamento: dataPagamento,
          });

          if (result) {
            setPagamentosParciais((prev) => ({
              ...prev,
              [key]: [
                ...(prev[key] || []),
                { id: result.id, valor: valorPago, data: dataPagamento },
              ],
            }));
          }
        } else {
          // Modo demo
          setPagamentosParciais((prev) => ({
            ...prev,
            [key]: [
              ...(prev[key] || []),
              { valor: valorPago, data: dataPagamento },
            ],
          }));
        }
      }

      if (valorDevedor > 0) {
        // Criar saldo devedor com o valor restante
        const novaDivida: SaldoDevedor = {
          id: Date.now().toString(),
          pessoa: pessoa,
          descricao: `Gastos pendentes - ${formatMonthYear(mesVisualizacao)}`,
          valor_original: valorDevedor,
          valor_atual: valorDevedor,
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
      if (valorDevedor > 0) {
        setModalFeedback({
          show: true,
          titulo: "Mês Fechado!",
          mensagem: `${pessoa} pagou ${formatCurrency(
            valorPago
          )}.\n${formatCurrency(
            valorDevedor
          )} foi transferido para o Saldo Devedor.`,
          tipo: "info",
        });
      } else {
        setModalFeedback({
          show: true,
          titulo: "Mês Fechado!",
          mensagem: `${pessoa} quitou o restante de ${formatCurrency(
            valorPago
          )}.`,
          tipo: "sucesso",
        });
      }
    } finally {
      setSaving(false);
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

    setSaving(true);
    try {
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
    } finally {
      setSaving(false);
    }
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
        setSaving(true);
        try {
          // Deletar do Supabase se tiver ID
          if (isSupabaseConfigured && supabase && ultimoPagamento.id) {
            await pagamentosParciaisFunctions.delete(ultimoPagamento.id);
          }

          setPagamentosParciais((prev) => ({
            ...prev,
            [key]: pagamentos.slice(0, -1),
          }));
          setModalConfirm({ ...modalConfirm, show: false });
        } finally {
          setSaving(false);
        }
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

    setSaving(true);
    try {
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
    } finally {
      setSaving(false);
    }
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

      setSaving(true);
      try {
        let minhaParte = valor;
        if (formMeuGasto.categoria === "dividido" && formMeuGasto.minha_parte) {
          minhaParte = parseCurrency(formMeuGasto.minha_parte);
        }

        const novoNumParcelas =
          formMeuGasto.tipo === "credito"
            ? parseInt(formMeuGasto.num_parcelas) || 1
            : 1;
        const novoValorParcela = valor / novoNumParcelas;

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

        // Determinar a data de início real (data da parcela 1)
        // Baseado na parcela sendo editada atualmente
        const indiceParcelaEditada = (editandoMeuGasto.parcela_atual || 1) - 1; // 0-based
        const dataAtualSelecionada = new Date(formMeuGasto.data);
        // dataInicio = data da edição - offset da parcela atual
        const dataInicioReal = subMonths(
          dataAtualSelecionada,
          indiceParcelaEditada
        );

        const maxParcelas = Math.max(
          parcelasRelacionadas.length,
          novoNumParcelas
        );

        for (let i = 0; i < maxParcelas; i++) {
          const numParcela = i + 1;
          const existente = parcelasRelacionadas.find(
            (p) => (p.parcela_atual || 1) === numParcela
          );

          // Se estiver dentro do novo número de parcelas: CRIAR ou ATUALIZAR
          if (numParcela <= novoNumParcelas) {
            const dataParcela = addMonths(dataInicioReal, i);
            const dataFormatada = format(dataParcela, "yyyy-MM-dd");

            const dadosAtualizados: any = {
              descricao:
                novoNumParcelas > 1
                  ? `${formMeuGasto.descricao} (${numParcela}/${novoNumParcelas})`
                  : formMeuGasto.descricao,
              valor: novoValorParcela,
              tipo: formMeuGasto.tipo,
              categoria: formMeuGasto.categoria,
              data: dataFormatada,
              dividido_com:
                formMeuGasto.categoria === "dividido"
                  ? formMeuGasto.dividido_com
                  : undefined,
              minha_parte:
                formMeuGasto.categoria === "dividido"
                  ? minhaParte / novoNumParcelas
                  : undefined,
              num_parcelas: novoNumParcelas,
              parcela_atual: numParcela,
              dia_vencimento:
                formMeuGasto.categoria === "fixo"
                  ? parseInt(formMeuGasto.dia_vencimento)
                  : undefined,
              // Ao converter para débito, marca como pago automaticamente.
              // Em crédito mantemos o status anterior se existir, ou false se for novo.
              pago:
                formMeuGasto.tipo === "debito"
                  ? true
                  : existente
                  ? existente.pago
                  : false,
            };

            if (existente) {
              // ATUALIZAR
              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.update(
                  existente.id,
                  dadosAtualizados
                );
              }
              setMeusGastos((prev) =>
                prev.map((g) =>
                  g.id === existente.id ? { ...g, ...dadosAtualizados } : g
                )
              );
            } else {
              // CRIAR (nova parcela que não existia antes)
              // Usar timestamp + índice para garantir ID único
              const novoId = `${Date.now()}-${i}`;
              const novoGasto: MeuGasto = {
                id: novoId,
                ...dadosAtualizados,
                // Garantir campos obrigatórios que podem não estar nos dadosAtualizados
                pago: dadosAtualizados.pago || false,
              };

              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.create(novoGasto);
              }
              setMeusGastos((prev) => [...prev, novoGasto]);
            }
          } else {
            // Se exceder o novo número de parcelas (diminuiu): EXCLUIR
            if (existente) {
              if (isSupabaseConfigured && supabase) {
                await meusGastosFunctions.delete(existente.id);
              }
              setMeusGastos((prev) =>
                prev.filter((g) => g.id !== existente.id)
              );
            }
          }
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
      } finally {
        setSaving(false);
      }
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

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, updates);
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
    } finally {
      setSaving(false);
    }
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
        setSaving(true);
        try {
          // Excluir todas as parcelas relacionadas
          for (const parcela of parcelasRelacionadas) {
            if (isSupabaseConfigured && supabase) {
              await meusGastosFunctions.delete(parcela.id);
            }
          }

          // Remover todas as parcelas do estado local
          const idsParaExcluir = new Set(parcelasRelacionadas.map((p) => p.id));
          setMeusGastos((prev) =>
            prev.filter((g) => !idsParaExcluir.has(g.id))
          );
          setModalConfirm({ ...modalConfirm, show: false });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Desativar gasto fixo
  const handleToggleGastoFixo = async (id: string) => {
    const gasto = meusGastos.find((g) => g.id === id);
    if (!gasto) return;

    const novoStatus = !gasto.ativo;

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await meusGastosFunctions.update(id, { ativo: novoStatus });
      }

      setMeusGastos((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ativo: novoStatus } : g))
      );
    } finally {
      setSaving(false);
    }
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
        setSaving(true);
        try {
          setError(null);

          const { error: deleteError } = await supabase!
            .from("gastos")
            .delete()
            .eq("id", id);

          if (deleteError) throw deleteError;

          await fetchGastos();
          setModalConfirm((prev) => ({ ...prev, show: false }));
        } catch (err) {
          console.error("Erro ao excluir gasto:", err);
          setError("Erro ao excluir o gasto. Tente novamente.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

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
          <TabGastos
            mesVisualizacao={mesVisualizacao}
            navegarMes={navegarMes}
            irParaHoje={irParaHoje}
            error={error}
            totalMes={totalMes}
            parcelasAtivas={parcelasAtivas}
            loading={loading}
            resumoMensal={resumoMensal}
            filtroPessoaGasto={filtroPessoaGasto}
            setFiltroPessoaGasto={setFiltroPessoaGasto}
            filtroTipoGasto={filtroTipoGasto}
            setFiltroTipoGasto={setFiltroTipoGasto}
            filtroDiaGasto={filtroDiaGasto}
            setFiltroDiaGasto={setFiltroDiaGasto}
            pessoas={pessoas}
            observacoesMes={observacoesMes}
            getObsKey={getObsKey}
            getPagamentosParciais={getPagamentosParciais}
            getTotalPagoParcial={getTotalPagoParcial}
            handleAbrirObs={handleAbrirObs}
            handleDesfazerPagamentoParcial={handleDesfazerPagamentoParcial}
            handleEditGasto={handleEditGasto}
            handleDelete={handleDelete}
            setShowPagamentoParcial={setShowPagamentoParcial}
            setValorPagamentoParcial={setValorPagamentoParcial}
            setShowFecharMes={setShowFecharMes}
            setValorPagoFecharMes={setValorPagoFecharMes}
          />
        )}

        {/* === ABA DÍVIDAS === */}
        {abaAtiva === "dividas" && (
          <TabDividas
            saldosDevedores={saldosDevedores}
            filtroStatusDivida={filtroStatusDivida}
            setFiltroStatusDivida={setFiltroStatusDivida}
            filtroPessoaDivida={filtroPessoaDivida}
            setFiltroPessoaDivida={setFiltroPessoaDivida}
            dividasFiltradas={dividasFiltradas}
            totalDividasPendentes={totalDividasPendentes}
            totalDividasQuitadas={totalDividasQuitadas}
            totalPendentes={totalPendentes}
            totalPagos={totalPagos}
            pessoasComDividas={pessoasComDividas}
            showPagamento={showPagamento}
            setShowPagamento={setShowPagamento}
            handleDeleteDivida={handleDeleteDivida}
            handleDesfazerPagamento={handleDesfazerPagamento}
          />
        )}

        {/* === ABA EU (MEUS GASTOS) === */}
        {abaAtiva === "eu" && (
          <TabMeuGasto
            mesVisualizacao={mesVisualizacao}
            navegarMes={navegarMes}
            irParaHoje={irParaHoje}
            totalMeusGastosCredito={totalMeusGastosCredito}
            totalMeusGastosDebito={totalMeusGastosDebito}
            totalMeusGastosPagos={totalMeusGastosPagos}
            totalGastosFixos={totalGastosFixos}
            filtroCategoriaMeuGasto={filtroCategoriaMeuGasto}
            setFiltroCategoriaMeuGasto={setFiltroCategoriaMeuGasto}
            filtroDiaMeuGasto={filtroDiaMeuGasto}
            setFiltroDiaMeuGasto={setFiltroDiaMeuGasto}
            gastosFixos={gastosFixos}
            meusGastosDoMes={meusGastosDoMes}
            handleEditMeuGasto={handleEditMeuGasto}
            handleToggleGastoFixo={handleToggleGastoFixo}
            handleDeleteMeuGasto={handleDeleteMeuGasto}
            handleTogglePagoMeuGasto={handleTogglePagoMeuGasto}
          />
        )}
      </main>

      <FormMeuGastoModal
        show={showFormMeuGasto}
        isEditing={!!editandoMeuGasto}
        formData={formMeuGasto}
        saving={saving}
        error={error}
        onClose={() => {
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
          setError(null);
        }}
        onFormChange={setFormMeuGasto}
        onSubmit={handleSaveMeuGasto}
      />

      <FeedbackModal
        modal={modalFeedback}
        onClose={() => setModalFeedback({ ...modalFeedback, show: false })}
      />

      <ConfirmModal
        modal={modalConfirm}
        saving={saving}
        onClose={() => setModalConfirm((prev) => ({ ...prev, show: false }))}
      />

      <ObservacaoModal
        show={!!showObsModal}
        pessoa={showObsModal}
        mesVisualizacao={mesVisualizacao}
        obsTexto={obsTexto}
        saving={saving}
        onClose={() => {
          setShowObsModal(null);
          setObsTexto("");
        }}
        onTextChange={setObsTexto}
        onSave={handleSalvarObs}
      />

      {/* Modal de Pagamento Parcial */}
      {(() => {
        const resumoPessoa = resumoMensal.find(
          (r) => r.pessoa === showPagamentoParcial
        );
        const totalDevido = resumoPessoa?.total || 0;
        const jaPago = getTotalPagoParcial(showPagamentoParcial || "");
        return (
          <PagamentoParcialModal
            show={!!showPagamentoParcial}
            pessoa={showPagamentoParcial}
            mesVisualizacao={mesVisualizacao}
            totalDevido={totalDevido}
            jaPago={jaPago}
            valorPagamento={valorPagamentoParcial}
            saving={saving}
            error={error}
            onClose={() => {
              setShowPagamentoParcial(null);
              setValorPagamentoParcial("");
              setError(null);
            }}
            onValorChange={setValorPagamentoParcial}
            onSubmit={() => {
              if (showPagamentoParcial) {
                handleAddPagamentoParcial(showPagamentoParcial);
              }
            }}
          />
        );
      })()}

      {/* Modal de Fechar Mês */}
      <FecharMesModal
        show={!!showFecharMes}
        pessoa={showFecharMes}
        mesVisualizacao={mesVisualizacao}
        totalDevido={(() => {
          const resumoPessoa = resumoMensal.find(
            (r) => r.pessoa === showFecharMes
          );
          return resumoPessoa?.total || 0;
        })()}
        jaPago={getTotalPagoParcial(showFecharMes || "")}
        valorPagoFecharMes={valorPagoFecharMes}
        saving={saving}
        error={error}
        onClose={() => {
          setShowFecharMes(null);
          setValorPagoFecharMes("");
          setError(null);
        }}
        onValorChange={setValorPagoFecharMes}
        onSubmit={(pessoa: string) => handleFecharMes(pessoa)}
      />

      {/* Modal de Formulário de Gasto */}
      <FormGastoModal
        show={showForm}
        isEditing={!!editandoGasto}
        formData={formData}
        pessoas={pessoas}
        saving={saving}
        error={error}
        onClose={() => {
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
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        onAddPessoa={handleAddPessoa}
        onRemovePessoa={handleRemovePessoa}
        showAddPessoa={showAddPessoa}
        onShowAddPessoa={setShowAddPessoa}
        novaPessoa={novaPessoa}
        onNovaPessoaChange={setNovaPessoa}
      />

      {/* Modal de Nova Dívida */}
      <FormDividaModal
        show={showFormDivida}
        formData={formDivida}
        pessoas={pessoas}
        saving={saving}
        error={error}
        onClose={() => setShowFormDivida(false)}
        onFormChange={setFormDivida}
        onSubmit={handleAddDivida}
      />

      {/* Modal de Pagamento de Dívida */}
      <PagamentoModal
        show={!!showPagamento}
        dividaId={showPagamento}
        valorAtual={
          saldosDevedores.find((d) => d.id === showPagamento)?.valor_atual || 0
        }
        valorPagamento={valorPagamento}
        obsPagamento={obsPagamento}
        saving={saving}
        error={error}
        onClose={() => {
          setShowPagamento(null);
          setValorPagamento("");
          setObsPagamento("");
        }}
        onValorChange={setValorPagamento}
        onObsChange={setObsPagamento}
        onTudo={(valor) => setValorPagamento(formatCurrency(valor))}
        onSubmit={handlePagamento}
      />
    </div>
  );
}

export default App;
