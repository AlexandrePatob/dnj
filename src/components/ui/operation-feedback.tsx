import { AlertCircle, Inbox, WifiOff } from "lucide-react";

type OperationFeedbackVariant = "error" | "empty" | "offline";

const variantIcon = {
  error: AlertCircle,
  empty: Inbox,
  offline: WifiOff,
} satisfies Record<OperationFeedbackVariant, typeof AlertCircle>;

export function OperationFeedback({
  variant,
  title,
  description,
  onRetry,
  retryLabel = "Tentar novamente",
  compact = false,
}: {
  variant: OperationFeedbackVariant;
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}) {
  const Icon = variantIcon[variant];

  return (
    <section
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-2xl border text-center ${compact ? "p-4" : "p-6"}`}
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <Icon aria-hidden="true" className="mx-auto mb-3" style={{ color: variant === "error" ? "var(--destructive)" : "var(--muted-foreground)" }} />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {retryLabel}
        </button>
      ) : null}
    </section>
  );
}
