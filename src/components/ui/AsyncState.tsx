import { AlertCircle, CheckCircle2, Inbox, RefreshCw } from "lucide-react";
import { Skeleton } from "./Skeleton";

interface BaseProps {
  title: string;
  description?: string;
  compact?: boolean;
}

interface ActionProps {
  actionLabel?: string;
  onAction?: () => void;
}

function Container({ compact, children }: { compact?: boolean; children: React.ReactNode }) {
  if (compact) {
    return <div className="py-6 flex items-center justify-center">{children}</div>;
  }

  return (
    <div className="min-h-[260px] flex items-center justify-center">
      {children}
    </div>
  );
}

function StateCard({ icon, title, description, colorClass, compact, actionLabel, onAction }: BaseProps & ActionProps & { icon: React.ReactNode; colorClass: string }) {
  return (
    <Container compact={compact}>
      <div className="text-center max-w-md px-4">
        <div className={`mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
        {description ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
        ) : null}

        {onAction ? (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {actionLabel || "Tentar novamente"}
          </button>
        ) : null}
      </div>
    </Container>
  );
}

export function PageLoadingState({ title = "Carregando...", description = "Estamos buscando os dados da página.", compact }: Partial<BaseProps>) {
  if (compact) {
    return (
      <div className="py-2 space-y-2" role="status" aria-label={title}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-1 py-2 space-y-6" role="status" aria-label={title}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">{title} — {description}</span>
    </div>
  );
}

export function PageEmptyState({ title, description, compact }: BaseProps) {
  return (
    <StateCard
      icon={<Inbox className="w-6 h-6 text-zinc-500" />}
      title={title}
      description={description}
      colorClass="bg-zinc-100 dark:bg-white/[0.04]"
      compact={compact}
    />
  );
}

export function PageErrorState({ title, description, compact, actionLabel, onAction }: BaseProps & ActionProps) {
  return (
    <StateCard
      icon={<AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />}
      title={title}
      description={description}
      colorClass="bg-red-100 dark:bg-red-900/30"
      compact={compact}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}

export function PageSuccessState({ title, description, compact }: BaseProps) {
  return (
    <StateCard
      icon={<CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />}
      title={title}
      description={description}
      colorClass="bg-emerald-100 dark:bg-emerald-900/30"
      compact={compact}
    />
  );
}
