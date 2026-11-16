import { Link } from "wouter";
import { ArrowUpRight, FileSearch, FileSpreadsheet, Plus, ReceiptText, Settings } from "lucide-react";
import { useGetDashboard, type Dashboard } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { systemText } from "@/lib/system-text";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclaimer, ErrorState, Money, Panel, PageHeader, STATUS_STYLE, StatusBadge, StatusIcon } from "@/components/kit";

function GettingStarted() {
  const { t } = useI18n();
  const steps = [
    { href: "/settings", k: "start_1", i: Settings },
    { href: "/bank-transactions", k: "start_2", i: FileSpreadsheet },
    { href: "/payments/new", k: "start_3", i: ReceiptText },
    { href: "/upload", k: "start_4", i: FileSearch },
  ] as const;
  return (
    <Panel className="ledger-grid overflow-hidden p-6 md:p-8">
      <h2 className="text-xl font-extrabold">{t("start_title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("start_sub")}</p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.k}>
            <Link href={s.href} data-testid={`link-start-${i + 1}`} className="card-lift flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5">
              <span className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-[#101B35] text-white"><s.i className="size-4" /></span>
                <span className="num text-xs font-semibold text-muted-foreground">0{i + 1}</span>
              </span>
              <span className="text-sm font-bold">{t(s.k)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Kpis({ d }: { d: Dashboard }) {
  const { t } = useI18n();
  const items = [
    { k: "kpi_total", v: d.totalRequests, s: null },
    { k: "kpi_verified", v: d.verifiedPayments, s: "VERIFIED" },
    { k: "kpi_pending", v: d.pendingPayments, s: "PENDING" },
    { k: "kpi_mismatch", v: d.mismatchedPayments, s: "MISMATCH" },
    { k: "kpi_duplicate", v: d.duplicateAttempts, s: "DUPLICATE" },
    { k: "kpi_manual", v: d.manualReview, s: "MANUAL_REVIEW" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((it, i) => (
        <div key={it.k} className="rise rounded-2xl border border-card-border bg-card p-4" style={{ animationDelay: `${i * 40}ms` }} data-testid={`kpi-${it.k}`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {it.s ? <span className={cn("size-2 rounded-full", STATUS_STYLE[it.s].dot)} /> : <span className="size-2 rounded-full bg-primary" />}
            {t(it.k)}
          </p>
          <p className="num mt-3 text-3xl font-semibold">{it.v}</p>
        </div>
      ))}
    </div>
  );
}

function Trend({ d }: { d: Dashboard }) {
  const { t, locale } = useI18n();
  const max = Math.max(1, ...d.trend.map((p) => p.verified + p.pending));
  if (d.trend.length === 0) return <p className="p-6 text-sm text-muted-foreground">{t("no_trend")}</p>;
  return (
    <div className="p-5">
      <div className="flex h-40 items-end gap-1.5">
        {d.trend.map((p) => (
          <div key={p.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${fmtDate(p.date, locale)} · ${p.verified} / ${p.pending}`}>
            <div className="flex flex-col overflow-hidden rounded-md transition group-hover:opacity-80">
              <div className="bg-[hsl(var(--warn)/0.75)]" style={{ height: `${(p.pending / max) * 140}px` }} />
              <div className="bg-[hsl(var(--ok))]" style={{ height: `${(p.verified / max) * 140}px` }} />
            </div>
            {p.verified + p.pending === 0 && <div className="h-1 rounded bg-muted" />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[0.68rem] text-muted-foreground">
        <span>{fmtDate(d.trend[0].date, locale)}</span>
        <span>{fmtDate(d.trend[d.trend.length - 1].date, locale)}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[hsl(var(--ok))]" />{t("trend_verified")}</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[hsl(var(--warn))]" />{t("trend_pending")}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, locale, lang } = useI18n();
  const q = useGetDashboard();
  const d = q.data;
  const pct = d && d.totalRequestedAmount > 0 ? (d.totalVerifiedAmount / d.totalRequestedAmount) * 100 : 0;
  const maxCount = d ? Math.max(1, ...d.statusBreakdown.map((s) => s.count)) : 1;
  const empty = d && d.totalRequests === 0 && d.bankRecordCount === 0;

  return (
    <>
      <PageHeader
        title={t("dash_title")}
        sub={t("dash_sub")}
        actions={
          <>
            <Link href="/upload" data-testid="link-verify" className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold ring-1 ring-border transition hover:ring-foreground/30"><FileSearch className="size-4" />{t("verify_receipt")}</Link>
            <Link href="/payments/new" data-testid="link-new-request" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--orange))] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-105"><Plus className="size-4" />{t("new_request")}</Link>
          </>
        }
      />
      {q.isLoading && (
        <div className="space-y-4" data-testid="state-loading">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64 rounded-2xl lg:col-span-2" /><Skeleton className="h-64 rounded-2xl" /></div>
        </div>
      )}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {d && (
        <div className="space-y-5">
          {empty && <GettingStarted />}
          <Kpis d={d} />
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel className="relative overflow-hidden p-6 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("verified_amount")}</p>
              <Money value={d.totalVerifiedAmount} big className="mt-2 text-4xl font-semibold md:text-5xl" />
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="grow-x h-full rounded-full bg-[hsl(var(--ok))]" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground"><span className="num font-semibold text-foreground">{pct.toFixed(1)}%</span> {t("of_requested")}</span>
                <span className="text-muted-foreground">{t("requested_amount")} <Money value={d.totalRequestedAmount} className="font-semibold text-foreground" /></span>
              </div>
            </Panel>
            <Panel className="ledger-grid-dark flex flex-col justify-between bg-[#101B35] p-6 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{t("bank_records")}</p>
                <p className="num mt-2 text-4xl font-semibold">{d.bankRecordCount}</p>
                <p className="mt-2 text-sm text-white/60"><span className="num font-semibold text-[hsl(var(--orange))]">{d.unmatchedBankCount}</span> {t("unmatched_records")}</p>
              </div>
              <Link href="/bank-transactions" data-testid="link-dash-bank" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">{t("import_csv")} <ArrowUpRight className="size-4 rtl:-scale-x-100" /></Link>
            </Panel>
          </div>
          <div className="grid gap-5 lg:grid-cols-5">
            <Panel title={t("breakdown")} className="lg:col-span-2">
              <ul className="space-y-4 p-5">
                {d.statusBreakdown.map((s) => (
                  <li key={s.status}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-semibold"><StatusIcon status={s.status} className="text-muted-foreground" />{t(`status_${s.status}`)}</span>
                      <span className="flex items-center gap-3"><Money value={s.amount} className="text-xs text-muted-foreground" /><span className="num w-6 text-end font-semibold">{s.count}</span></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("grow-x h-full rounded-full", STATUS_STYLE[s.status].bar)} style={{ width: `${(s.count / maxCount) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title={t("trend")} className="lg:col-span-3"><Trend d={d} /></Panel>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("recent_requests")} action={<Link href="/payments" data-testid="link-all-payments" className="text-xs font-semibold text-[hsl(15_80%_48%)]">{t("see_all")}</Link>}>
              {d.recentPayments.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("pay_empty")}</p> : (
                <ul className="divide-y divide-border">
                  {d.recentPayments.map((p) => (
                    <li key={p.id}>
                      <Link href={`/payments/${p.id}`} data-testid={`row-recent-payment-${p.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.customerName}</p>
                          <p className="num truncate text-xs text-muted-foreground" dir="ltr">{p.reference} · {p.orderId}</p>
                        </div>
                        <Money value={p.amount} className="text-sm font-semibold" />
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t("recent_activity")} action={<Link href="/history" data-testid="link-all-history" className="text-xs font-semibold text-[hsl(15_80%_48%)]">{t("see_all")}</Link>}>
              {d.recentActivity.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("no_activity")}</p> : (
                <ul className="divide-y divide-border">
                  {d.recentActivity.map((a) => (
                    <li key={a.id}>
                      <Link href={`/payments/${a.paymentId}`} data-testid={`row-recent-attempt-${a.id}`} className="flex items-start gap-3 px-5 py-3 transition hover:bg-muted/50">
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STATUS_STYLE[a.status].dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{a.customerName} <span className="font-normal text-muted-foreground">· {t(`status_${a.status}`)}</span></p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{systemText(a.reason, lang)}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.createdAt, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <Disclaimer compact />
        </div>
      )}
    </>
  );
}
