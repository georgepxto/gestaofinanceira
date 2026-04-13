import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/@supabase/supabase-js")) {
            return "supabase-vendor";
          }

          if (id.includes("node_modules/recharts")) {
            return "charts-vendor";
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
