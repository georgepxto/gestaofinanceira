import { AlertCircle, CheckCircle2, Inbox, RefreshCw } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";

interface BaseProps {
  title: string;
  description?: string;
  compact?: boolean;
}

interface ActionProps {
  actionLabel?: string;
  onAction?: () => void;
}

export function PageLoadingState({ title = "Carregando…", compact }: Partial<BaseProps>) {
  if (compact) {
    return (
      <div className="py-2 space-y-2" role="status" aria-label={title}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-8" role="status" aria-label={title}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

export function PageEmptyState({ title, description, compact }: BaseProps) {
  return <EmptyState Icone={Inbox} frase={title} detalhe={description} compacto={compact} />;
}

export function PageErrorState({ title, description, compact, actionLabel, onAction }: BaseProps & ActionProps) {
  return (
    <div role="alert">
      <EmptyState
        Icone={AlertCircle}
        frase={title}
        detalhe={description}
        compacto={compact}
        acao={
          onAction ? (
            <Button onClick={onAction} icone={<RefreshCw className="w-4 h-4" strokeWidth={1.5} />}>
              {actionLabel || "Tentar de novo"}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

export function PageSuccessState({ title, description, compact }: BaseProps) {
  return <EmptyState Icone={CheckCircle2} frase={title} detalhe={description} compacto={compact} />;
}
