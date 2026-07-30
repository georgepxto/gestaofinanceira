import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      // Mocks de design guardados para consulta, não são fonte do app. O diretório
      // existe em duas cópias no repositório, daí o `**/` na frente.
      "**/design_handoff_hedge_visual_revision/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
      "no-useless-assignment": "off",
      "no-var": "off",
    },
  },
  // Registro manual em vez do preset exportado: o nome do preset mudou entre
  // versões do plugin, o registro direto funciona igual em todas.
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Sempre bug: hook em condicional, em loop ou fora de componente.
      "react-hooks/rules-of-hooks": "error",
      // Em zero desde a etapa 32: os casos com conserto limpo foram corrigidos,
      // os deliberados levam `eslint-disable-next-line` com o motivo escrito.
      // Como `error` porque aviso permanente é aviso ignorado — com o log limpo,
      // o próximo a aparecer significa alguma coisa.
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
