import {
  format,
  addMonths,
  startOfMonth,
  isSameMonth,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Gasto, ParcelaAtiva, ResumoMensal } from "../types";

/**
 * Calcula o mês da fatura de um gasto no cartão de crédito, baseado 
 * no dia da compra, no melhor dia para compra e no dia de vencimento do cartão.
 * A lógica determina a quantos meses a frente a fatura será paga.
 */
export function getMesFaturaCartao(
  dataCompraIso: string, 
  melhorDiaCompra: number, 
  diaVencimento: number
): Date {
  const [ano, mes, dia] = dataCompraIso.split("-").map(Number);
  let mesesAdicionais = 0;
  
  // Regra 1: Compra no dia ou após o fechamento (melhor dia)
  if (dia >= melhorDiaCompra) {
    mesesAdicionais += 1;
  }
  
  // Regra 2: Quando o vencimento ocorre antes do fechamento do mesmo mês
  // (Exemplo: Vencimento dia 5, Fechamento/Melhor Dia 28)
  if (diaVencimento < melhorDiaCompra) {
    mesesAdicionais += 1;
  }
  
  // Retorna dia 1 para evitar pulo de meses (ex: 31 de fev não existe)
  return new Date(ano, mes - 1 + mesesAdicionais, 1);
}

/**
 * Ajusta o dia para o último dia válido do mês quando o dia excede.
 * Ex: clampDay(31, 2026, 1) => 28 (fevereiro 2026 tem 28 dias)
 * @param day - dia desejado (1-31)
 * @param year - ano
 * @param month - mês (0-indexed, como Date do JS)
 */
export function clampDay(day: number, year: number, month: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * Formata uma data para exibição (ex: "Janeiro 2024")
 */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Formata um valor monetário para BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Converte string monetária (ex: "1.500,00") para número
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove tudo exceto números e vírgula
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/**
 * Formata string de input para exibição monetária (ex: "1.500,00")
 * Aceita apenas dígitos e trabalha com centavos
 */
export function formatCurrencyInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  if (!numbers) return "";

  // Converte para número e divide por 100 (para centavos)
  const amount = parseInt(numbers, 10) / 100;

  // Formata como moeda brasileira sem o símbolo
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte número para string formatada (para preencher inputs)
 */
export function numberToFormattedString(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Verifica se um gasto está ativo em determinado mês
 * Um gasto está ativo se o mês de visualização está entre data_inicio e data_inicio + num_parcelas - 1
 * Gastos recorrentes são sempre ativos a partir da data de início
 */
export function isGastoAtivoNoMes(
  gasto: Gasto,
  mesVisualizacao: Date
): boolean {
  const dataInicio = parseISO(gasto.data_inicio);
  const dataInicioMes = startOfMonth(dataInicio);
  const mesVisualizacaoInicio = startOfMonth(mesVisualizacao);

  // Se for recorrente, está ativo a partir da data de início (sem limite de fim)
  if (gasto.recorrente) {
    return !isBefore(mesVisualizacaoInicio, dataInicioMes);
  }

  // Data da última parcela
  const dataUltimaParcela = addMonths(dataInicioMes, gasto.num_parcelas - 1);

  // Verifica se o mês de visualização está no período das parcelas
  const estaNoInicio = !isBefore(mesVisualizacaoInicio, dataInicioMes);
  const estaNoFim = !isAfter(mesVisualizacaoInicio, dataUltimaParcela);

  return estaNoInicio && estaNoFim;
}

/**
 * Calcula qual parcela está ativa para um gasto em determinado mês
 */
export function calcularParcelaAtual(
  gasto: Gasto,
  mesVisualizacao: Date
): number {
  const dataInicio = parseISO(gasto.data_inicio);
  const dataInicioMes = startOfMonth(dataInicio);
  const mesVisualizacaoInicio = startOfMonth(mesVisualizacao);

  // Calcula a diferença em meses
  let parcela = 1;
  let mesAtual = dataInicioMes;

  while (
    !isSameMonth(mesAtual, mesVisualizacaoInicio) &&
    parcela < gasto.num_parcelas
  ) {
    mesAtual = addMonths(mesAtual, 1);
    parcela++;
  }

  return parcela;
}

/**
 * Filtra e calcula as parcelas ativas para um determinado mês
 */
export function getParcelasAtivas(
  gastos: Gasto[],
  mesVisualizacao: Date
): ParcelaAtiva[] {
  return gastos
    .filter((gasto) => isGastoAtivoNoMes(gasto, mesVisualizacao))
    .map((gasto) => ({
      gasto,
      parcela_atual: calcularParcelaAtual(gasto, mesVisualizacao),
      valor_parcela: gasto.valor_total / gasto.num_parcelas,
    }))
    .sort((a, b) => {
      // Ordena por data de início (mais recente primeiro)
      return (
        new Date(b.gasto.data_inicio).getTime() -
        new Date(a.gasto.data_inicio).getTime()
      );
    });
}

/**
 * Calcula o resumo mensal por pessoa
 */
export function calcularResumoMensal(
  parcelasAtivas: ParcelaAtiva[]
): ResumoMensal[] {
  const resumoPorPessoa: Record<string, ResumoMensal> = {};

  parcelasAtivas.forEach((parcela) => {
    const pessoa = parcela.gasto.pessoa;

    if (!resumoPorPessoa[pessoa]) {
      resumoPorPessoa[pessoa] = {
        pessoa,
        total: 0,
        quantidade: 0,
      };
    }

    resumoPorPessoa[pessoa].total += parcela.valor_parcela;
    resumoPorPessoa[pessoa].quantidade += 1;
  });

  return Object.values(resumoPorPessoa).sort((a, b) => b.total - a.total);
}

/**
 * Calcula o total geral do mês
 */
export function calcularTotalMes(parcelasAtivas: ParcelaAtiva[]): number {
  return parcelasAtivas.reduce(
    (total, parcela) => total + parcela.valor_parcela,
    0
  );
}
