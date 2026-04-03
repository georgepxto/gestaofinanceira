import { useState, useRef, useEffect } from "react";
import { useAppContext } from "../../context";
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  DollarSign,
  PartyPopper,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { useAlertas, type Alerta } from "../../hooks/useAlertas";

const AlertIcon = ({ alerta }: { alerta: Alerta }) => {
  const baseClass = "w-4 h-4 flex-shrink-0";

  if (alerta.titulo.includes("subiu"))
    return <TrendingUp className={`${baseClass} text-amber-600`} />;
  if (alerta.titulo.includes("receita") || alerta.titulo.includes("gastou"))
    return <DollarSign className={`${baseClass} text-amber-600`} />;
  if (alerta.titulo.includes("parcela"))
    return <PartyPopper className={`${baseClass} text-blue-600`} />;
  if (alerta.titulo.includes("Meta"))
    return <ShieldAlert className={`${baseClass} text-red-600`} />;
  if (alerta.titulo.includes("superam"))
    return <Flame className={`${baseClass} text-red-600`} />;

  if (alerta.tipo === "danger")
    return <AlertTriangle className={`${baseClass} text-red-500`} />;
  if (alerta.tipo === "warning")
    return <AlertCircle className={`${baseClass} text-amber-500`} />;
  return <Info className={`${baseClass} text-blue-500`} />;
};

export const NotificationBell = () => {
  const { user } = useAppContext();
  const { alertas, loading } = useAlertas();
  const [isOpen, setIsOpen] = useState(false);
  
  const getStorageKey = () => `reppago_dismissed_notifications_${user?.id || 'guest'}`;
  
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // Ignore errors
    }
    return new Set();
  });
  
  // Update storage whenever dismissed changes
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(dismissed)));
      }
    } catch {
      // Ignore errors
    }
  }, [dismissed, user]);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const alertasVisiveis = alertas.filter(
    (a) => !dismissed.has(a.titulo + a.mensagem)
  );
  const dangerCount = alertasVisiveis.filter(
    (a) => a.tipo === "danger"
  ).length;
  const totalCount = alertasVisiveis.length;

  const handleDismiss = (alerta: Alerta) => {
    setDismissed((prev) => new Set(prev).add(alerta.titulo + alerta.mensagem));
  };

  const handleDismissAll = () => {
    const newDismissed = new Set(dismissed);
    alertas.forEach((a) => newDismissed.add(a.titulo + a.mensagem));
    setDismissed(newDismissed);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificações"
      >
        <Bell
          className={`w-5 h-5 ${totalCount > 0 ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}
        />
        {totalCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
              dangerCount > 0
                ? "bg-red-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              Notificações
              {totalCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">({totalCount})</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 transition-colors"
                >
                  Limpar tudo
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                Carregando...
              </div>
            ) : alertasVisiveis.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Nenhuma notificação no momento
                </p>
              </div>
            ) : (
              alertasVisiveis.map((alerta, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    alerta.tipo === "danger"
                      ? "bg-red-50/50 dark:bg-red-950/20"
                      : alerta.tipo === "warning"
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : "bg-transparent"
                  }`}
                >
                  <div className="mt-0.5">
                    <AlertIcon alerta={alerta} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        alerta.tipo === "danger"
                          ? "text-red-700 dark:text-red-400"
                          : alerta.tipo === "warning"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {alerta.titulo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {alerta.mensagem}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDismiss(alerta)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
