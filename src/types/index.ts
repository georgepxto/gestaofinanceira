export interface Gasto {
  id: string;
  descricao: string;
  pessoa: string;
  valor_total: number;
  num_parcelas: number;
  data_inicio: string;
  tipo: "credito" | "debito";
  categoria: string;
  cartao_id?: string;
  conta_id?: string;
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
  categoria: string;
  cartao_id: string;
  conta_id: string;
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

export interface MeuGasto {
  id: string;
  descricao: string;
  valor: number;
  tipo: "credito" | "debito";
  categoria: "pessoal" | "dividido" | "fixo";
  categoria_gasto?: string;
  data: string;
  pago: boolean;
  data_pagamento?: string;
  dividido_com?: string;
  minha_parte?: number;
  dia_vencimento?: number;
  ativo?: boolean;
  num_parcelas?: number;
  parcela_atual?: number;
  cartao_id?: string;
  conta_id?: string;
}

export interface MeuGastoForm {
  descricao: string;
  valor: string;
  tipo: "credito" | "debito";
  categoria: "pessoal" | "dividido" | "fixo";
  categoria_gasto: string;
  data: string;
  dividido_com: string;
  minha_parte: string;
  dia_vencimento: string;
  num_parcelas: string;
  cartao_id: string;
  conta_id: string;
}

export interface SaldoDevedorForm {
  pessoa: string;
  descricao: string;
  valor: string;
}

export interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string;
  saldo_inicial: number;
  saldo_atual?: number;
  user_id?: string;
  created_at?: string;
}

export interface ContaBancariaForm {
  nome: string;
  banco: string;
  saldo_inicial: string;
  saldo_atual: string;
}

export interface Receita {
  id: string;
  conta_id: string;
  descricao: string;
  valor: number;
  categoria: string;
  tipo: "fixo" | "recorrente" | "avulso";
  dia_recebimento: number;
  num_meses?: number;
  user_id?: string;
  created_at?: string;
}

export interface ReceitaForm {
  conta_id: string;
  descricao: string;
  valor: string;
  categoria: string;
  tipo: "fixo" | "recorrente" | "avulso";
  dia_recebimento: string;
  num_meses: string;
}

export interface CartaoCredito {
  id: string;
  nome: string;
  conta_id?: string;
  dia_vencimento: number;
  melhor_dia_compra?: number;
  limite: number;
  divida_inicial?: number;
  cor?: string;
  user_id?: string;
  created_at?: string;
}

export interface CartaoCreditoForm {
  nome: string;
  conta_id: string;
  dia_vencimento: string;
  melhor_dia_compra: string;
  limite: string;
  divida_inicial: string;
  cor: string;
}

export interface TransacaoCartao {
  id: string;
  cartao_id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  num_parcelas: number;
  parcela_atual: number;
  pago: boolean;
  recorrente?: boolean;
  user_id?: string;
  created_at?: string;
}

export interface TransacaoCartaoForm {
  cartao_id: string;
  descricao: string;
  valor: string;
  categoria: string;
  data: string;
  num_parcelas: string;
  recorrente: boolean;
  pago: boolean;
}
