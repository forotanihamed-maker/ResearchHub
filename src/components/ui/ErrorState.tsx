import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shared error UI for any section that fetches data and failed.
 * Distinct from EmptyState: EmptyState means "the request succeeded and
 * there's genuinely nothing here"; ErrorState means "we couldn't actually
 * find out — something went wrong". Conflating the two (as most pages did
 * before) silently hides real failures from the user.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-red-50 p-4">
        <AlertTriangle size={32} className="text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-4">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Small inline variant for use inside forms/panels (e.g. under a chat
 * input or an approve/reject button) where a full-page ErrorState would
 * be too heavy — just a compact red message.
 */
export function InlineError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-600 flex items-center gap-1.5 mt-2">
      <AlertTriangle size={14} className="shrink-0" />
      {message}
    </p>
  );
}
