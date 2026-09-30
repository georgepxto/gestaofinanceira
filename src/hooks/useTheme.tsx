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
    // O escuro é o padrão de quem nunca escolheu. A mesma regra está no script
    // bloqueante do <head> em index.html, que é quem aplica a classe antes do
    // primeiro paint — se uma mudar, muda a outra.
    try {
      return localStorage.getItem("theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  // Reconciliação, não aplicação inicial: quem aplica a classe no boot é o
  // script do <head>. Aqui só refletimos a troca de tema em tempo de execução —
  // e mantemos o theme-color junto, senão a barra do Chrome mobile fica com a
  // cor do tema anterior.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* armazenamento bloqueado: o tema vale só para esta visita */
    }
    document
      .querySelector('meta[name="theme-color"]')
      // ds-ok: a meta theme-color não lê var(); são os valores de --bg.
      ?.setAttribute("content", theme === "dark" ? "#0B0B0C" : "#ECECE9");
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
