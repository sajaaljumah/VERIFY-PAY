import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Copy, Eye, ShieldAlert, XCircle } from "lucide-react";
import type { PaymentStatus, VerificationCheck } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { systemText } from "@/lib/system-text";
import { fmtAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const STATUS_STYLE: Record<PaymentStatus, { dot: string; chip: string; bar: string }> = {
  VERIFIED: { dot: "bg-[hsl(var(--ok))]", chip: "bg-[hsl(var(--ok)/0.1)] text-[hsl(var(--ok))] ring-[hsl(var(--ok)/0.25)]", bar: "bg-[hsl(var(--ok))]" },
  PENDING: { dot: "bg-[hsl(var(--warn))]", chip: "bg-[hsl(var(--warn)/0.12)] text-[hsl(36_80%_32%)] ring-[hsl(var(--warn)/0.3)]", bar: "bg-[hsl(var(--warn))]" },
  MISMATCH: { dot: "bg-[hsl(var(--bad))]", chip: "bg-[hsl(var(--bad)/0.09)] text-[hsl(var(--bad))] ring-[hsl(var(--bad)/0.25)]", bar: "bg-[hsl(var(--bad))]" },
  DUPLICATE: { dot: "bg-[hsl(var(--bad))]", chip: "bg-[hsl(var(--bad)/0.09)] text-[hsl(var(--bad))] ring-[hsl(var(--bad)/0.25)]", bar: "bg-[hsl(354_60%_68%)]" },
  MANUAL_REVIEW: { dot: "bg-[hsl(var(--info))]", chip: "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] ring-[hsl(var(--info)/0.25)]", bar: "bg-[hsl(var(--info))]" },
};

export const STATUSES: PaymentStatus[] = ["VERIFIED", "PENDING", "MISMATCH", "DUPLICATE", "MANUAL_REVIEW"];

export function StatusIcon({ status, className }: { status: PaymentStatus; className?: string }) {
  const c = cn("size-4", className);
  if (status === "VERIFIED") return <CheckCircle2 className={c} />;
  if (status === "PENDING") return <CircleDashed className={c} />;
  if (status === "MISMATCH") return <XCircle className={c} />;
  if (status === "DUPLICATE") return <Copy className={c} />;
  return <Eye className={c} />;
}

export function StatusBadge({ status, size = "sm" }: { status: PaymentStatus; size?: "sm" | "lg" }) {
  const { t } = useI18n();
  return (
    <span
      data-testid={`status-${status}`}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs",
        STATUS_STYLE[status].chip,
      )}
    >
      <StatusIcon status={status} className={size === "lg" ? "size-4" : "size-3.5"} />
      {t(`status_${status}`)}
    </span>
  );
}

export function Money({ value, className, unit = true, big = false }: { value: number | null | undefined; className?: string; unit?: boolean; big?: boolean }) {
  const { t } = useI18n();
  const s = fmtAmount(value);
  const [whole, frac] = s.split(".");
  return (
    <span dir="ltr" className={cn("num inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span>
        {whole}
        {frac !== undefined && <span className="opacity-55">.{frac}</span>}
      </span>
      {unit && <span className={cn("font-sans font-semibold opacity-50", big ? "text-[0.45em]" : "text-[0.72em]")}>{t("kwd")}</span>}
    </span>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="rise mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[1.9rem]" data-testid="text-page-title">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground md:text-[0.95rem]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-card-border bg-card shadow-[0_1px_2px_hsl(var(--navy)/0.04)]", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="ledger-grid flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center" data-testid="state-empty">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-card text-[hsl(var(--orange))] shadow-sm ring-1 ring-border">{icon}</div>
      <h3 className="text-base font-bold">{title}</h3>
      {sub && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[hsl(var(--bad)/0.25)] bg-[hsl(var(--bad)/0.04)] px-6 py-10 text-center" data-testid="state-error">
      <AlertTriangle className="mb-3 size-7 text-[hsl(var(--bad))]" />
      <h3 className="font-bold">{t("error_title")}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message || t("error_generic")}</p>
      {onRetry && (
        <button onClick={onRetry} data-testid="button-retry" className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
          {t("retry")}
        </button>
      )}
    </div>
  );
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("flex gap-3 rounded-2xl border border-[hsl(var(--orange)/0.3)] bg-[hsl(var(--orange)/0.06)]", compact ? "p-3.5" : "p-5")} data-testid="text-disclaimer">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[hsl(var(--orange))]" />
      <div>
        <p className="text-sm font-bold">{t("disclaimer_title")}</p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground">{t("disclaimer_body")}</p>
      </div>
    </div>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-5" data-testid="state-loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function CheckList({ checks }: { checks: VerificationCheck[] }) {
  const { t, lang } = useI18n();
  return (
    <ol className="relative space-y-3 ps-1">
      <span className="absolute bottom-3 start-[13px] top-3 w-px bg-border" />
      {checks.map((c, i) => {
        const tone = c.passed === true ? "text-[hsl(var(--ok))] bg-[hsl(var(--ok)/0.1)]" : c.passed === false ? "text-[hsl(var(--bad))] bg-[hsl(var(--bad)/0.1)]" : "text-muted-foreground bg-muted";
        return (
          <li key={i} className="rise relative flex gap-3" style={{ animationDelay: `${i * 70}ms` }} data-testid={`check-${i}`}>
            <span className={cn("relative z-10 grid size-[26px] shrink-0 place-items-center rounded-full ring-4 ring-card", tone)}>
              {c.passed === true ? <CheckCircle2 className="size-4" /> : c.passed === false ? <XCircle className="size-4" /> : <CircleDashed className="size-4" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold">
                {systemText(c.label, lang)}
                <span className="ms-2 text-xs font-medium text-muted-foreground">
                  {c.passed === true ? t("check_passed") : c.passed === false ? t("check_failed") : t("check_skipped")}
                </span>
              </p>
              {c.detail && <p className="mt-0.5 break-words text-xs text-muted-foreground">{systemText(c.detail, lang)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function StatusFilter({ value, onChange }: { value: PaymentStatus | ""; onChange: (s: PaymentStatus | "") => void }) {
  const { t } = useI18n();
  const opts: (PaymentStatus | "")[] = ["", ...STATUSES];
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {opts.map((s) => (
        <button
          key={s || "all"}
          onClick={() => onChange(s)}
          data-testid={`filter-status-${s || "all"}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            value === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
          )}
        >
          {s && <span className={cn("size-1.5 rounded-full", STATUS_STYLE[s].dot)} />}
          {s ? t(`status_${s}`) : t("all")}
        </button>
      ))}
    </div>
  );
}
