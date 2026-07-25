// Constantes da aplicação
export const PARCELAS_PRESET_MAX = 12;
export const PARCELAS_MAX = 48;
export const PARCELAS_OPTIONS = Array.from(
  { length: PARCELAS_PRESET_MAX },
  (_, i) => i + 1
);
