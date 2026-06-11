// Constantes da aplicação
export const PARCELAS_PRESET_MAX = 12;
export const PARCELAS_MAX = 48;
export const PARCELAS_OPTIONS = Array.from(
  { length: PARCELAS_PRESET_MAX },
  (_, i) => i + 1
);

export const CORES_CARDS = [
  "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300",
  "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
];
