import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Os testes nunca falam com o Supabase de verdade: sem estas variáveis o
    // app roda no modo demonstração, com os dados no navegador de mentira.
    env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isola o helper de preload do Vite para que não caia dentro de um
          // vendor pesado e force seu carregamento em todas as páginas.
          if (id.includes("vite/preload-helper")) {
            return "preload-helper";
          }

          if (id.includes("node_modules/@supabase/supabase-js")) {
            return "supabase-vendor";
          }

          if (id.includes("node_modules/date-fns")) {
            return "date-vendor";
          }

          if (id.includes("node_modules/html2canvas")) {
            return "html2canvas-vendor";
          }

          if (id.includes("node_modules/jspdf-autotable")) {
            return "jspdf-autotable-vendor";
          }

          if (id.includes("node_modules/jspdf")) {
            return "jspdf-vendor";
          }

          return undefined;
        },
      },
    },
  },
})
