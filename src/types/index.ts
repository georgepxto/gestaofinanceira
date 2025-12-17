export interface Gasto {
  id: string;
  descricao: string;
  pessoa: string;
  valor_total: number;
  num_parcelas: number;
  data_inicio: string;
  tipo: "credito" | "debito";
  created_at?: string;
  updated_at?: string;
}

export interface GastoForm {
  descricao: string;
  pessoa: string;
  valor_total: string;
  num_parcelas: number;
  data_inicio: string;
  tipo: "credito" | "debito";
}

export interface ParcelaAtiva {
  gasto: Gasto;
  parcela_atual: number;
  valor_parcela: number;
}

export interface ResumoMensal {
  pessoa: string;
  total: number;
  quantidade: number;
}

// Saldo Devedor - Dívidas pendentes
export interface SaldoDevedor {
  id: string;
  pessoa: string;
  descricao: string;
  valor_original: number;
  valor_atual: number;
  data_criacao: string;
  historico: PagamentoSaldo[];
}

export interface PagamentoSaldo {
  id: string;
  valor: number;
  data: string;
  observacao?: string;
}

export interface SaldoDevedorForm {
  pessoa: string;
  descricao: string;
  valor: string;
}
