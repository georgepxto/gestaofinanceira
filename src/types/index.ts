export interface Gasto {
  id: string;
  descricao: string;
  pessoa: string;
  valor_total: number;
  num_parcelas: number;
  data_inicio: string;
  tipo: "credito" | "debito";
  categoria: string;
  recorrente?: boolean;
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
  recorrente: boolean;
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
  /** Conta em que o pagamento caiu — faz ele entrar no saldo. */
  conta_id?: string;
}

export interface MeuGasto {
  id: string;
  descricao: string;
  valor: number;
  tipo: "credito" | "debito";
  categoria: "pessoal" | "dividido" | "fixo" | "divida";
  categoria_gasto?: string;
  data: string;
  pago: boolean;
  data_pagamento?: string;
  dividido_com?: string;
  dividido_com_pessoas?: string[];
  minha_parte?: number;
  dia_vencimento?: number;
  ativo?: boolean;
  num_parcelas?: number;
  parcela_atual?: number;
  cartao_id?: string;
  conta_id?: string;
  meses_suspensos?: string[];
}

export interface MeuGastoForm {
  descricao: string;
  valor: string;
  tipo: "credito" | "debito";
  categoria: "pessoal" | "dividido" | "fixo" | "divida";
  categoria_gasto: string;
  data: string;
  dividido_com: string;
  dividido_com_pessoas: string[];
  minha_parte: string;
  dia_vencimento: string;
  num_parcelas: string;
  cartao_id: string;
  conta_id: string;
  /** Compra parcelada antiga: o valor é o da parcela e só entram as que faltam. */
  compra_antiga?: boolean;
  /** Na compra antiga, a parcela que vem na próxima fatura. */
  parcela_proxima?: string;
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
  /** Modelo antigo. Nulo nas contas já migradas: o saldo é calculado (utils/saldo). */
  saldo_atual?: number | null;
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
  /** Limite usado no dia da abertura (o mesmo que `abertura.usado`). */
  divida_inicial?: number;
  /** O cartão como o banco mostrava no dia em que foi conferido (utils/fatura). */
  abertura?: AberturaCartao | null;
  cor?: string;
  user_id?: string;
  created_at?: string;
}

/** O cartão no app do banco, num dia: o ponto de partida das contas do Hedge. */
export interface AberturaCartao {
  /** Dia em que a pessoa conferiu ("yyyy-MM-dd"). */
  em: string;
  /** A próxima fatura a pagar naquele dia ("yyyy-MM"). */
  mes: string;
  /** O que faltava pagar dessa fatura. */
  fatura: number;
  /** Limite usado: essa fatura mais as parcelas das próximas. */
  usado: number;
  /**
   * As faturas depois dessa, mês a mês ("yyyy-MM" → valor), como o app do
   * banco mostra. Opcional: sem elas, o que passa da próxima fatura fica só no
   * limite, sem mês.
   */
  seguintes?: Record<string, number>;
}

export interface CartaoCreditoForm {
  nome: string;
  conta_id: string;
  dia_vencimento: string;
  melhor_dia_compra: string;
  limite: string;
  /** Limite disponível hoje, como o banco mostra. Em branco: sem mudança. */
  disponivel: string;
  /** O que falta pagar da próxima fatura. */
  fatura_atual: string;
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

export interface MetaGasto {
  id: string;
  categoria: string;
  limite: number;
  user_id?: string;
}
