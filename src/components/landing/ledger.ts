import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, Home, Popcorn, ShoppingBasket } from "lucide-react";

/* Modelo de exemplo compartilhado pelo card do hero e pela demo: a casa
   "Apê 302", o saldo do mês, os lançamentos e o orçamento por categoria.
   Tudo fictício. */

export type Cat = "mercado" | "casa" | "lazer" | "receber";
export type Budgeted = Exclude<Cat, "receber">;
export type Tx = { id: number; name: string; cat: Cat; who: string; amt: number };
export type Spent = Record<Budgeted, number>;

export const CATS: Record<Cat, { label: string; Icon: LucideIcon }> = {
  mercado: { label: "Mercado", Icon: ShoppingBasket },
  casa: { label: "Casa", Icon: Home },
  lazer: { label: "Lazer", Icon: Popcorn },
  receber: { label: "A receber", Icon: ArrowDownLeft },
};

export const BUDGETED: Budgeted[] = ["mercado", "casa", "lazer"];
export const LIMITS: Spent = { mercado: 1400, casa: 3400, lazer: 400 };
export const BASE_SPENT: Spent = { mercado: 868, casa: 2410, lazer: 214 };
export const BASE_BALANCE = 4812.4;
/** A partir daqui a barra vira alerta (laranja). */
export const ALERT = 0.8;

export const INITIAL_TXS: Tx[] = [
  { id: -1, name: "Pix de Bruno, mercado", cat: "receber", who: "Bruno", amt: 145 },
  { id: -2, name: "Aluguel dividido", cat: "casa", who: "você", amt: -1050 },
  { id: -3, name: "Internet fibra", cat: "casa", who: "Carla", amt: -119.9 },
  { id: -4, name: "Padaria", cat: "mercado", who: "Ana", amt: -23.8 },
  { id: -5, name: "Farmácia", cat: "casa", who: "Bruno", amt: -41.6 },
];

/** Aplica um lançamento ao orçamento: saída soma no gasto da categoria. */
export const applySpent = (spent: Spent, t: Pick<Tx, "cat" | "amt">): Spent =>
  t.cat === "receber" ? spent : { ...spent, [t.cat]: spent[t.cat] - t.amt };

export const round2 = (v: number) => Math.round(v * 100) / 100;
