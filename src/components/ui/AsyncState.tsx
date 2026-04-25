import { AlertCircle, CheckCircle2, Inbox, Loader2, RefreshCw } from "lucide-react";

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
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {description ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        ) : null}

        {onAction ? (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
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
  return (
    <Container compact={compact}>
      <div className="text-center px-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </Container>
  );
}

export function PageEmptyState({ title, description, compact }: BaseProps) {
  return (
    <StateCard
      icon={<Inbox className="w-6 h-6 text-gray-500" />}
      title={title}
      description={description}
      colorClass="bg-gray-100 dark:bg-gray-800"
      compact={compact}
    />
  );
}

export function PageErrorState({ title, description, compact, actionLabel, onAction }: BaseProps & ActionProps) {
  return (
    <StateCard
      icon={<AlertCircle className="w-6 h-6 text-red-500" />}
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
      icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
      title={title}
      description={description}
      colorClass="bg-emerald-100 dark:bg-emerald-900/30"
      compact={compact}
    />
  );
}
