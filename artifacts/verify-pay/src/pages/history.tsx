import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, History as HistoryIcon, Search } from "lucide-react";
import { useListAttempts, type PaymentStatus } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { systemText } from "@/lib/system-text";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckList, EmptyState, ErrorState, Money, PageHeader, Panel, RowsSkeleton, STATUS_STYLE, StatusBadge, StatusFilter } from "@/components/kit";
import { MatchedTx } from "@/components/attempt-card";
import { useDebounced } from "@/pages/payments";

export default function History() {
  const { t, locale, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const ds = useDebounced(search.trim());
  const q = useListAttempts({ ...(ds ? { search: ds } : {}), ...(status ? { status } : {}) });

  return (
    <>
      <PageHeader title={t("hist_title")} sub={t("hist_sub")} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("hist_search_ph")} data-testid="input-search-history" className="h-11 w-full rounded-full border border-input bg-card pe-4 ps-10 text-sm outline-none focus:border-[hsl(var(--orange))] focus:ring-4 focus:ring-[hsl(var(--orange)/0.12)]" />
        </label>
        <StatusFilter value={status} onChange={setStatus} />
      </div>
      <Panel className="overflow-hidden">
        {q.isLoading && <RowsSkeleton />}
        {q.isError && <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>}
        {q.data && q.data.length === 0 && <EmptyState icon={<HistoryIcon className="size-6" />} title={ds || status ? t("pay_no_results") : t("hist_empty")} sub={ds || status ? t("pay_no_results_sub") : t("hist_empty_sub")} />}
        {q.data && q.data.length > 0 && (
          <ul className="divide-y divide-border">
            {q.data.map((a) => {
              const isOpen = open === a.id;
              return (
                <li key={a.id} className={cn("relative", isOpen && "bg-muted/30")}>
                  <span className={cn("absolute inset-y-0 start-0 w-1", STATUS_STYLE[a.status].bar)} />
                  <button onClick={() => setOpen(isOpen ? null : a.id)} data-testid={`row-attempt-${a.id}`} className="flex w-full flex-col gap-2 px-5 py-4 text-start md:flex-row md:items-center md:gap-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{a.customerName} <span className="num ms-1 text-xs font-normal text-muted-foreground" dir="ltr">{a.orderId} · {a.reference}</span></p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{systemText(a.reason, lang)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Money value={a.amount} className="text-sm font-semibold" />
                      <span className="hidden w-28 text-xs text-muted-foreground sm:block">{fmtDate(a.createdAt, locale, true)}</span>
                      <StatusBadge status={a.status} />
                      <ChevronDown className={cn("size-4 text-muted-foreground transition", isOpen && "rotate-180")} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="rise grid gap-5 px-5 pb-5 md:grid-cols-[1.3fr_1fr]">
                      <CheckList checks={a.checks} />
                      <div className="space-y-3">
                        <MatchedTx attempt={a} />
                        <Link href={`/payments/${a.paymentId}`} data-testid={`link-attempt-payment-${a.id}`} className="inline-flex text-sm font-semibold text-[hsl(15_80%_48%)] hover:underline">{t("go_detail")}</Link>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
