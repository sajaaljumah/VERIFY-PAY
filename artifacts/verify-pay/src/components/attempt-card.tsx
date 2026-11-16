import { Landmark } from "lucide-react";
import type { Attempt } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { CheckList, Money, StatusBadge } from "@/components/kit";

export function MatchedTx({ attempt }: { attempt: Attempt }) {
  const { t, locale } = useI18n();
  const tx = attempt.matchedTransaction;
  if (!tx) return <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground" data-testid="text-no-match">{t("no_matched_tx")}</div>;
  return (
    <div className="rounded-xl bg-[#101B35] p-4 text-white" data-testid="card-matched-tx">
      <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-white/50"><Landmark className="size-3.5" />{t("matched_tx")}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <Money value={tx.amount} className="text-2xl font-semibold" />
        <span className="text-xs text-white/60">{fmtDate(tx.date, locale)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-white/45">{t("tx_id")}</dt><dd className="num truncate" dir="ltr">{tx.transactionId}</dd></div>
        <div><dt className="text-white/45">{t("reference")}</dt><dd className="num truncate" dir="ltr">{tx.reference}</dd></div>
        <div className="col-span-2"><dt className="text-white/45">{t("sender")}</dt><dd className="truncate">{tx.sender || "—"}</dd></div>
      </dl>
    </div>
  );
}

export function AttemptCard({ attempt }: { attempt: Attempt }) {
  const { t, locale } = useI18n();
  return (
    <article className="rounded-2xl border border-border bg-card p-5" data-testid={`card-attempt-${attempt.id}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={attempt.status} size="lg" />
        <span className="text-xs text-muted-foreground">{fmtDate(attempt.createdAt, locale, true)}</span>
      </header>
      <p className="mt-3 text-sm font-medium">{attempt.reason}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("checks")}</p>
          <CheckList checks={attempt.checks} />
        </div>
        <MatchedTx attempt={attempt} />
      </div>
    </article>
  );
}
