import { createContext, useContext, useState, type ReactNode } from "react";
import { addMonths, subMonths } from "date-fns";
import {
  useAuth,
  useModals,
  usePessoas,
  useObservacoes,
  usePagamentosParciais,
  useGastos,
  useSaldosDevedores,
  useMeusGastos,
  useCartoes,
} from "../hooks";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { MeuGasto, MeuGastoForm, Gasto, GastoForm, SaldoDevedor, SaldoDevedorForm, ParcelaAtiva, ResumoMensal, CartaoCredito } from "../types";
import type { PagamentoParcial } from "../types/extended";
import type { UserFeatures } from "../types/admin";

// Define the context type
interface AppContextType {
  // Auth
  user: SupabaseUser | null;
  authLoading: boolean;
  handleLogin: (email: string, password: string) => Promise<{ error: string | undefined }>;
  handleSignUp: (email: string, password: string, nome: string) => Promise<{ error: string | undefined }>;
  handleLogout: () => Promise<void>;

  // Admin & Feature Flags
  isAdmin: boolean;
  isActive: boolean;
  features: UserFeatures;
  featuresLoading: boolean;

  // Navigation
  mesVisualizacao: Date;
  navegarMes: (direcao: "anterior" | "proximo") => void;
  irParaHoje: () => void;

  // Modals
  modalFeedback: { show: boolean; titulo: string; mensagem: string; tipo: "sucesso" | "info" };
  setModalFeedback: (modal: { show: boolean; titulo: string; mensagem: string; tipo: "sucesso" | "info" }) => void;
  modalConfirm: { show: boolean; titulo: string; mensagem: string; onConfirm: () => void };
  setModalConfirm: (modal: { show: boolean; titulo: string; mensagem: string; onConfirm: () => void; confirmLabel?: string; confirmColor?: "red" | "green" | "blue" | "indigo" | "purple" }) => void;

  // Pessoas
  pessoas: string[];
  novaPessoa: string;
  setNovaPessoa: (nome: string) => void;
  showAddPessoa: boolean;
  setShowAddPessoa: (show: boolean) => void;
  fetchPessoas: () => Promise<void>;
  handleAddPessoa: (onSuccess?: (nome: string) => void) => Promise<void>;
  handleRemovePessoa: (nome: string) => Promise<void>;

  // Observações
  observacoesMes: Record<string, string>;
  showObsModal: string | null;
  setShowObsModal: (pessoa: string | null) => void;
  obsTexto: string;
  setObsTexto: (texto: string) => void;
  savingObs: boolean;
  getObsKey: (pessoa: string) => string;
  getMesAtual: () => string;
  handleSalvarObs: (pessoa: string) => Promise<void>;
  handleAbrirObs: (pessoa: string) => void;

  // Gastos
  parcelasAtivas: ParcelaAtiva[];
  resumoMensal: ResumoMensal[];
  totalMes: number;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editandoGasto: Gasto | null;
  loading: boolean;
  savingGastos: boolean;
  errorGastos: string | null;
  setErrorGastos: (error: string | null) => void;
  filtroPessoaGasto: string;
  setFiltroPessoaGasto: (pessoa: string) => void;
  filtroTipoGasto: string;
  setFiltroTipoGasto: (tipo: string) => void;
  filtroDiaGasto: string;
  setFiltroDiaGasto: (dia: string) => void;
  formData: GastoForm;
  setFormData: (data: GastoForm) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleEditGasto: (gasto: Gasto) => void;
  handleDelete: (id: string) => Promise<void>;
  resetFormGasto: () => void;

  // Pagamentos Parciais
  showPagamentoParcial: string | null;
  setShowPagamentoParcial: (pessoa: string | null) => void;
  valorPagamentoParcial: string;
  setValorPagamentoParcial: (valor: string) => void;
  savingPagParcial: boolean;
  getPagamentosParciais: (pessoa: string) => PagamentoParcial[];
  getTotalPagoParcial: (pessoa: string) => number;
  handleAddPagamentoParcial: (pessoa: string) => Promise<void>;
  handleDesfazerPagamentoParcial: (pessoa: string) => void;

  // Saldos Devedores
  saldosDevedores: SaldoDevedor[];
  showFormDivida: boolean;
  setShowFormDivida: (show: boolean) => void;
  showPagamento: string | null;
  setShowPagamento: (id: string | null) => void;
  valorPagamento: string;
  setValorPagamento: (valor: string) => void;
  obsPagamento: string;
  setObsPagamento: (obs: string) => void;
  showFecharMes: string | null;
  setShowFecharMes: (pessoa: string | null) => void;
  valorPagoFecharMes: string;
  setValorPagoFecharMes: (valor: string) => void;
  savingDividas: boolean;
  errorDividas: string | null;
  setErrorDividas: (error: string | null) => void;
  filtroPessoaDivida: string;
  setFiltroPessoaDivida: (pessoa: string) => void;
  filtroStatusDivida: "pendentes" | "pagos";
  setFiltroStatusDivida: (status: "pendentes" | "pagos") => void;
  formDivida: SaldoDevedorForm;
  setFormDivida: (data: SaldoDevedorForm) => void;
  dividasFiltradas: SaldoDevedor[];
  totalPendentes: number;
  totalPagos: number;
  totalDividasPendentes: number;
  totalDividasQuitadas: number;
  pessoasComDividas: string[];
  handleAddDivida: () => Promise<void>;
  handlePagamento: (dividaId: string) => Promise<void>;
  handleDesfazerPagamento: (dividaId: string, pagamentoId: string, valor: number) => void;
  handleDeleteDivida: (id: string) => void;
  handleFecharMes: (pessoa: string) => Promise<void>;
  isMesFechado: (pessoa: string) => boolean;
  getMesFechado: (pessoa: string) => { saldoDevedorId?: string; valorPago: number; valorDevedor: number } | null;
  handleDesfazerFechamento: (pessoa: string) => Promise<void>;

  // Meus Gastos
  showFormMeuGasto: boolean;
  setShowFormMeuGasto: (show: boolean) => void;
  editandoMeuGasto: MeuGasto | null;
  savingMeusGastos: boolean;
  errorMeusGastos: string | null;
  filtroCategoriaMeuGasto: string;
  setFiltroCategoriaMeuGasto: (categoria: string) => void;
  filtroDiaMeuGasto: string;
  setFiltroDiaMeuGasto: (dia: string) => void;
  formMeuGasto: MeuGastoForm;
  setFormMeuGasto: (data: MeuGastoForm) => void;
  meusGastosDoMes: MeuGasto[];
  gastosFixos: MeuGasto[];
  totalMeusGastosCredito: number;
  totalMeusGastosDebito: number;
  totalMeusGastosPagos: number;
  totalGastosFixos: number;
  handleEditMeuGasto: (gasto: MeuGasto) => void;
  handleSaveMeuGasto: () => Promise<void>;
  handleTogglePagoMeuGasto: (id: string) => Promise<void>;
  handleDeleteMeuGasto: (id: string) => void;
  handleToggleGastoFixo: (id: string) => Promise<void>;
  handleToggleSuspenderGastoFixo: (id: string, mesRef: Date) => Promise<void>;
  handlePagarTodosCredito: () => Promise<void>;
  resetFormMeuGasto: () => void;
  cartoes: CartaoCredito[];

  // Combined
  saving: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Navigation state
  const [mesVisualizacao, setMesVisualizacao] = useState<Date>(new Date());

  const navegarMes = (direcao: "anterior" | "proximo") => {
    setMesVisualizacao((prev) =>
      direcao === "anterior" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const irParaHoje = () => {
    setMesVisualizacao(new Date());
  };

  // Hooks
  const { user, authLoading, handleLogin, handleSignUp, handleLogout } = useAuth();

  const { isAdmin, isActive, features, loading: featuresLoading } = useFeatureFlags({ userId: user?.id });

  const { modalFeedback, setModalFeedback, modalConfirm, setModalConfirm } = useModals();

  const { cartoes, loading: cartoesLoading } = useCartoes({ user });

  const {
    pessoas,
    novaPessoa,
    setNovaPessoa,
    showAddPessoa,
    setShowAddPessoa,
    fetchPessoas,
    handleAddPessoa,
    handleRemovePessoa,
  } = usePessoas({ user });

  const {
    observacoesMes,
    showObsModal,
    setShowObsModal,
    obsTexto,
    setObsTexto,
    saving: savingObs,
    getObsKey,
    getMesAtual,
    handleSalvarObs,
    handleAbrirObs,
  } = useObservacoes({ mesVisualizacao, user });

  const {
    parcelasAtivas,
    resumoMensal,
    totalMes,
    showForm,
    setShowForm,
    editandoGasto,
    loading,
    saving: savingGastos,
    error: errorGastos,
    setError: setErrorGastos,
    filtroPessoaGasto,
    setFiltroPessoaGasto,
    filtroTipoGasto,
    setFiltroTipoGasto,
    filtroDiaGasto,
    setFiltroDiaGasto,
    formData,
    setFormData,
    handleSubmit,
    handleEditGasto,
    handleDelete,
    resetForm: resetFormGasto,
    fetchGastos,
  } = useGastos({
    user,
    mesVisualizacao,
    setModalConfirm,
  });

  const {
    showPagamentoParcial,
    setShowPagamentoParcial,
    valorPagamentoParcial,
    setValorPagamentoParcial,
    saving: savingPagParcial,
    getPagamentosParciais,
    getTotalPagoParcial,
    handleAddPagamentoParcial,
    handleDesfazerPagamentoParcial,
    fetchPagamentosParciais,
  } = usePagamentosParciais({
    user,
    getObsKey,
    getMesAtual,
    setModalConfirm,
    setModalFeedback,
    resumoMensal,
    setError: setErrorGastos,
  });

  const {
    saldosDevedores,
    showFormDivida,
    setShowFormDivida,
    showPagamento,
    setShowPagamento,
    valorPagamento,
    setValorPagamento,
    obsPagamento,
    setObsPagamento,
    showFecharMes,
    setShowFecharMes,
    valorPagoFecharMes,
    setValorPagoFecharMes,
    saving: savingDividas,
    error: errorDividas,
    setError: setErrorDividas,
    filtroPessoaDivida,
    setFiltroPessoaDivida,
    filtroStatusDivida,
    setFiltroStatusDivida,
    formDivida,
    setFormDivida,
    dividasFiltradas,
    totalPendentes,
    totalPagos,
    totalDividasPendentes,
    totalDividasQuitadas,
    pessoasComDividas,
    handleAddDivida,
    handlePagamento,
    handleDesfazerPagamento,
    handleDeleteDivida,
    handleFecharMes,
    isMesFechado,
    getMesFechado,
    handleDesfazerFechamento,
  } = useSaldosDevedores({
    user,
    mesVisualizacao,
    resumoMensal,
    getTotalPagoParcial,
    getObsKey,
    getMesAtual,
    setPagamentosParciais: () => {},
    setModalConfirm,
    setModalFeedback,
    fetchPessoas,
    onRefreshAfterClose: async () => {
      await fetchGastos();
      await fetchPagamentosParciais();
    },
  });

  const {
    showFormMeuGasto,
    setShowFormMeuGasto,
    editandoMeuGasto,
    saving: savingMeusGastos,
    error: errorMeusGastos,
    filtroCategoriaMeuGasto,
    setFiltroCategoriaMeuGasto,
    filtroDiaMeuGasto,
    setFiltroDiaMeuGasto,
    formMeuGasto,
    setFormMeuGasto,
    meusGastosDoMes,
    gastosFixos,
    totalMeusGastosCredito,
    totalMeusGastosDebito,
    totalMeusGastosPagos,
    totalGastosFixos,
    handleEditMeuGasto,
    handleSaveMeuGasto,
    handleTogglePagoMeuGasto,
    handleDeleteMeuGasto,
    handleToggleGastoFixo,
    handleToggleSuspenderGastoFixo,
    handlePagarTodosCredito,
    resetForm: resetFormMeuGasto,
  } = useMeusGastos({
    user,
    mesVisualizacao,
    setModalConfirm,
    cartoes,
    cartoesLoading,
  });

  // Combined states
  const saving = savingObs || savingGastos || savingPagParcial || savingDividas || savingMeusGastos;
  const error = errorGastos || errorDividas || errorMeusGastos;

  const value: AppContextType = {
    // Auth
    user,
    authLoading,
    handleLogin,
    handleSignUp,
    handleLogout,

    // Admin & Feature Flags
    isAdmin,
    isActive,
    features,
    featuresLoading,

    // Navigation
    mesVisualizacao,
    navegarMes,
    irParaHoje,

    // Modals
    modalFeedback,
    setModalFeedback,
    modalConfirm,
    setModalConfirm,

    // Pessoas
    pessoas,
    novaPessoa,
    setNovaPessoa,
    showAddPessoa,
    setShowAddPessoa,
    fetchPessoas,
    handleAddPessoa,
    handleRemovePessoa,

    // Observações
    observacoesMes,
    showObsModal,
    setShowObsModal,
    obsTexto,
    setObsTexto,
    savingObs,
    getObsKey,
    getMesAtual,
    handleSalvarObs,
    handleAbrirObs,

    // Gastos
    parcelasAtivas,
    resumoMensal,
    totalMes,
    showForm,
    setShowForm,
    editandoGasto,
    loading,
    savingGastos,
    errorGastos,
    setErrorGastos,
    filtroPessoaGasto,
    setFiltroPessoaGasto,
    filtroTipoGasto,
    setFiltroTipoGasto,
    filtroDiaGasto,
    setFiltroDiaGasto,
    formData,
    setFormData,
    handleSubmit,
    handleEditGasto,
    handleDelete,
    resetFormGasto,

    // Pagamentos Parciais
    showPagamentoParcial,
    setShowPagamentoParcial,
    valorPagamentoParcial,
    setValorPagamentoParcial,
    savingPagParcial,
    getPagamentosParciais,
    getTotalPagoParcial,
    handleAddPagamentoParcial,
    handleDesfazerPagamentoParcial,

    // Saldos Devedores
    saldosDevedores,
    showFormDivida,
    setShowFormDivida,
    showPagamento,
    setShowPagamento,
    valorPagamento,
    setValorPagamento,
    obsPagamento,
    setObsPagamento,
    showFecharMes,
    setShowFecharMes,
    valorPagoFecharMes,
    setValorPagoFecharMes,
    savingDividas,
    errorDividas,
    setErrorDividas,
    filtroPessoaDivida,
    setFiltroPessoaDivida,
    filtroStatusDivida,
    setFiltroStatusDivida,
    formDivida,
    setFormDivida,
    dividasFiltradas,
    totalPendentes,
    totalPagos,
    totalDividasPendentes,
    totalDividasQuitadas,
    pessoasComDividas,
    handleAddDivida,
    handlePagamento,
    handleDesfazerPagamento,
    handleDeleteDivida,
    handleFecharMes,
    isMesFechado,
    getMesFechado,
    handleDesfazerFechamento,

    // Meus Gastos
    showFormMeuGasto,
    setShowFormMeuGasto,
    editandoMeuGasto,
    savingMeusGastos,
    errorMeusGastos,
    filtroCategoriaMeuGasto,
    setFiltroCategoriaMeuGasto,
    filtroDiaMeuGasto,
    setFiltroDiaMeuGasto,
    formMeuGasto,
    setFormMeuGasto,
    meusGastosDoMes,
    gastosFixos,
    totalMeusGastosCredito,
    totalMeusGastosDebito,
    totalMeusGastosPagos,
    totalGastosFixos,
    handleEditMeuGasto,
    handleSaveMeuGasto,
    handleTogglePagoMeuGasto,
    handleDeleteMeuGasto,
    handleToggleGastoFixo,
    handleToggleSuspenderGastoFixo,
    handlePagarTodosCredito,
    resetFormMeuGasto,
    cartoes,

    // Combined
    saving,
    error,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
