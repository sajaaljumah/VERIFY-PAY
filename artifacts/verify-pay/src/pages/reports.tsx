import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { useGetProfile, useGetReports, type PaymentStatus } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { systemText } from "@/lib/system-text";
import { fmtDate } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls } from "@/lib/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclaimer, ErrorState, Money, PageHeader, Panel, StatusBadge, StatusFilter } from "@/components/kit";

export default function Reports() {
  const { t, locale, lang } = useI18n();
  const q = useGetReports();
  const profile = useGetProfile();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const href = `/api/vp/export.csv?${new URLSearchParams({ search: search.trim(), status }).toString()}`;

  return (
    <>
      <PageHeader title={t("rep_title")} sub={t("rep_sub")} actions={<button onClick={() => window.print()} className={btnGhost} data-testid="button-print"><Printer className="size-4" />{t("print")}</button>} />
      <Panel className="no-print mb-5 p-5">
        <h2 className="font-bold">{t("rep_export_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("rep_export_sub")}</p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("pay_search_ph")} className={`${inputCls} lg:max-w-xs`} data-testid="input-export-search" />
          <StatusFilter value={status} onChange={setStatus} />
          <a href={href} className={`${btnPrimary} lg:ms-auto`} data-testid="link-export-csv"><Download className="size-4" />{t("export_csv")}</a>
        </div>
      </Panel>
      {q.isLoading && <div className="space-y-4" data-testid="state-loading"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {q.data && (() => {
        const s = q.data.summary;
        const rows = [
          ["kpi_total", s.totalRequests], ["kpi_verified", s.verifiedPayments], ["kpi_pending", s.pendingPayments], ["kpi_mismatch", s.mismatchedPayments],
          ["kpi_duplicate", s.duplicateAttempts], ["kpi_manual", s.manualReview], ["bank_records", s.bankRecordCount], ["unmatched", s.unmatchedBankCount],
        ] as const;
        return (
          <div className="space-y-5">
            <Panel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="text-lg font-extrabold" data-testid="text-report-business">{profile.data?.businessName || t("brand")}</p>
                  <p className="text-xs text-muted-foreground">{t("generated")}: {fmtDate(q.data.generatedAt, locale, true)}</p>
                </div>
                <div className="flex gap-8">
                  <div><p className="text-xs text-muted-foreground">{t("verified_amount")}</p><Money value={s.totalVerifiedAmount} className="text-xl font-semibold" /></div>
                  <div><p className="text-xs text-muted-foreground">{t("requested_amount")}</p><Money value={s.totalRequestedAmount} className="text-xl font-semibold" /></div>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{t(k)}</dt><dd className="num text-2xl font-semibold">{v}</dd></div>)}
              </dl>
            </Panel>
            <Panel title={<>{t("rep_attempts")} <span className="num ms-1 text-muted-foreground">{q.data.attempts.length}</span></>} className="overflow-hidden">
              {q.data.attempts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("no_activity")}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>{(["date", "customer", "order_id", "reference", "amount", "status", "reason"] as const).map((h) => <th key={h} className="px-4 py-2.5 text-start font-semibold">{t(h)}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {q.data.attempts.map((a) => (
                        <tr key={a.id} data-testid={`row-report-attempt-${a.id}`}>
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(a.createdAt, locale)}</td>
                          <td className="px-4 py-2.5 font-medium">{a.customerName}</td>
                          <td className="num px-4 py-2.5" dir="ltr">{a.orderId}</td>
                          <td className="num px-4 py-2.5" dir="ltr">{a.reference}</td>
                          <td className="px-4 py-2.5"><Money value={a.amount} unit={false} /></td>
                          <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                          <td className="max-w-xs px-4 py-2.5 text-xs text-muted-foreground">{systemText(a.reason, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <Panel title={t("rep_imports")}>
              {q.data.imports.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("no_imports")}</p> : (
                <ul className="divide-y divide-border">
                  {q.data.imports.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <span className="font-semibold" dir="ltr">{r.fileName}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt, locale)} · <span className="num">{r.imported}</span> {t("imported")} · <span className="num">{r.duplicates}</span> {t("duplicates")} · <span className="num">{r.rejected}</span> {t("rejected")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Disclaimer />
          </div>
        );
      })()}
    </>
  );
}
