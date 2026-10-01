import { useState, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "../../context";
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  Receipt,
  CalendarCheck,
  Gauge,
} from "lucide-react";
import { useAlertas, type Alerta } from "../../hooks/useAlertas";
import { useIsMobile } from "../../hooks";
import { PainelDetalhe } from "../ui/PainelDetalhe";

// A cor é o estado, não o assunto: perigo em --danger-ink, atenção em
// --accent-ink, informação em --fg-2. O ícone diz o assunto, sempre em traço
// fino e sem enfeite (o confete das parcelas saiu).
//
// A cadeia de `if` decide por substring do título — a ordem é significativa,
// reordenar troca qual ícone aparece.
const corDoAlerta = (alerta: Alerta) =>
  alerta.tipo === "danger" ? "text-danger-ink" : alerta.tipo === "warning" ? "text-accent-ink" : "text-fg-2";

const AlertIcon = ({ alerta }: { alerta: Alerta }) => {
  const classe = `w-4 h-4 shrink-0 ${corDoAlerta(alerta)}`;
  const props = { className: classe, strokeWidth: 1.5 };

  if (alerta.titulo.includes("subiu")) return <TrendingUp {...props} />;
  if (alerta.titulo.includes("receita") || alerta.titulo.includes("gastou")) return <Receipt {...props} />;
  if (alerta.titulo.includes("parcela")) return <CalendarCheck {...props} />;
  if (alerta.titulo.includes("Meta") || alerta.titulo.includes("superam")) return <Gauge {...props} />;
  if (alerta.tipo === "danger") return <AlertTriangle {...props} />;
  if (alerta.tipo === "warning") return <AlertCircle {...props} />;
  return <Info {...props} />;
};

export const NotificationBell = () => {
  const { user } = useAppContext();
  const { alertas, loading } = useAlertas();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const getStorageKey = useCallback(
    () => `reppago_dismissed_notifications_${user?.id || 'guest'}`,
    [user?.id]
  );
  
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
  }, [dismissed, user, getStorageKey]);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

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

  const conteudo = loading ? (
    <p className="py-6 text-center text-sm text-fg-2">Carregando…</p>
  ) : alertasVisiveis.length === 0 ? (
    <div className="py-8 flex flex-col items-center gap-2 text-center">
      <Bell className="w-5 h-5 text-fg-3" strokeWidth={1.5} />
      <p className="text-sm text-fg-2">Nada novo por aqui.</p>
    </div>
  ) : (
    <>
      <ul className="divide-y divide-line">
        {alertasVisiveis.map((alerta) => (
          <li key={alerta.titulo + alerta.mensagem} className="py-3 flex items-start gap-3">
            {/* O bloco de 36px das linhas do app; a cor do ícone é o estado. */}
            <span className="w-9 h-9 shrink-0 rounded-sm bg-surface-2 flex items-center justify-center">
              <AlertIcon alerta={alerta} />
            </span>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[15px] md:text-sm text-fg break-words">{alerta.titulo}</p>
              <p className="text-xs text-fg-2 mt-0.5 break-words">{alerta.mensagem}</p>
            </div>
            <button
              onClick={() => handleDismiss(alerta)}
              aria-label={`Dispensar: ${alerta.titulo}`}
              className="w-11 h-11 md:w-8 md:h-8 -mr-2 -mt-1 flex items-center justify-center rounded text-fg-3 hover:text-fg transition-colors shrink-0"
            >
              <X className="w-4 h-4 md:w-3.5 md:h-3.5" strokeWidth={1.5} />
            </button>
          </li>
        ))}
      </ul>
      <div className="py-3 border-t border-line flex justify-end">
        <button
          onClick={handleDismissAll}
          className="min-h-[44px] md:min-h-[32px] px-2 -mr-2 rounded text-sm md:text-xs text-fg-2 hover:text-fg transition-colors"
        >
          Limpar tudo
        </button>
      </div>
    </>
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded text-fg-2 hover:text-fg hover:bg-surface-2 transition-colors"
        aria-label={totalCount > 0 ? `Notificações, ${totalCount} ${totalCount === 1 ? "nova" : "novas"}` : "Notificações"}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" strokeWidth={1.5} />
        {totalCount > 0 && (
          <span
            aria-hidden="true"
            className={`absolute top-2 right-1.5 md:top-1 md:right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-sm valor text-[10px] leading-none text-accent-fg ${
              dangerCount > 0 ? "bg-danger" : "bg-accent"
            }`}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Celular: o painel de baixo do app (largura toda, nunca cortado).
          Desktop: a lista abre logo abaixo do sino, alinhada à direita. */}
      {isMobile ? (
        <PainelDetalhe
          aberto={isOpen}
          titulo="Notificações"
          resumo={totalCount > 0 ? `${totalCount} ${totalCount === 1 ? "nova" : "novas"}` : undefined}
          onFechar={() => setIsOpen(false)}
        >
          <div className="pt-2">{conteudo}</div>
        </PainelDetalhe>
      ) : (
        isOpen && (
          <div
            role="dialog"
            aria-label="Notificações"
            className="absolute right-0 top-full mt-2 w-[380px] bg-surface-1 border border-line rounded z-overlay overflow-hidden animate-[fundo-entra_150ms_ease-out]"
          >
            <div className="flex items-center justify-between pl-4 pr-2 h-12 border-b border-line">
              <h3 className="text-sm font-medium text-fg">
                Notificações
                {totalCount > 0 && <span className="ml-2 text-fg-3 font-normal">{totalCount}</span>}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fechar notificações"
                className="w-8 h-8 flex items-center justify-center rounded text-fg-3 hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="max-h-[min(26rem,70vh)] overflow-y-auto px-4">{conteudo}</div>
          </div>
        )
      )}
    </div>
  );
};
