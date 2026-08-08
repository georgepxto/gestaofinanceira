import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Migração única para o redesign light-first: quem estava no dark (padrão
    // antigo) passa a ver o tema claro uma vez; depois o toggle manda.
    //
    // Esta mesma lógica está duplicada no script bloqueante do <head> em
    // index.html, que é quem aplica a classe antes do primeiro paint. Os dois
    // leem a mesma chave e chegam à mesma conclusão — se um mudar, muda o outro.
    const MIGRATION_KEY = "theme-migrated-light-v1";
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "dark" && !localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(MIGRATION_KEY, "1");
      localStorage.setItem("theme", "light");
      return "light";
    }
    // Padrão para usuário novo é sempre light (sem detectar preferência do sistema).
    return stored || "light";
  });

  // Reconciliação, não aplicação inicial: quem aplica a classe no boot é o
  // script do <head>. Aqui só refletimos a troca de tema em tempo de execução —
  // e mantemos o theme-color junto, senão a barra do Chrome mobile fica com a
  // cor do tema anterior.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0A0A0B" : "#FAFAFA");
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
