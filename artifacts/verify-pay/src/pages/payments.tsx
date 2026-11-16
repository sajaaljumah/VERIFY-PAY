import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Download, Plus, ReceiptText, Search, Paperclip } from "lucide-react";
import { useListPayments, type PaymentStatus } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { EmptyState, ErrorState, Money, PageHeader, Panel, RowsSkeleton, StatusBadge, StatusFilter } from "@/components/kit";

export function useDebounced(v: string, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

export default function Payments() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const ds = useDebounced(search.trim());
  const params = { ...(ds ? { search: ds } : {}), ...(status ? { status } : {}) };
  const q = useListPayments(params);
  const filtered = !!ds || !!status;
  const exportHref = `/api/vp/export.csv?${new URLSearchParams({ search: ds, status }).toString()}`;

  return (
    <>
      <PageHeader
        title={t("pay_title")}
        sub={t("pay_sub")}
        actions={
          <>
            <a href={exportHref} data-testid="link-export" className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold ring-1 ring-border hover:ring-foreground/30"><Download className="size-4" />{t("export_csv")}</a>
            <Link href="/payments/new" data-testid="link-new-payment" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--orange))] px-4 py-2.5 text-sm font-bold text-white hover:brightness-105"><Plus className="size-4" />{t("new_request")}</Link>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("pay_search_ph")} data-testid="input-search" className="h-11 w-full rounded-full border border-input bg-card pe-4 ps-10 text-sm outline-none transition focus:border-[hsl(var(--orange))] focus:ring-4 focus:ring-[hsl(var(--orange)/0.12)]" />
        </label>
        <StatusFilter value={status} onChange={setStatus} />
      </div>
      <Panel className="overflow-hidden">
        {q.isLoading && <RowsSkeleton />}
        {q.isError && <div className="p-5"><ErrorState onRetry={() => q.refetch()} /></div>}
        {q.data && q.data.length === 0 && (
          filtered ? (
            <EmptyState icon={<Search className="size-6" />} title={t("pay_no_results")} sub={t("pay_no_results_sub")} action={<button data-testid="button-clear" onClick={() => { setSearch(""); setStatus(""); }} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("clear_filters")}</button>} />
          ) : (
            <EmptyState icon={<ReceiptText className="size-6" />} title={t("pay_empty")} sub={t("pay_empty_sub")} action={<Link href="/payments/new" data-testid="link-empty-new" className="rounded-full bg-[hsl(var(--orange))] px-4 py-2 text-sm font-bold text-white">{t("new_request")}</Link>} />
          )
        )}
        {q.data && q.data.length > 0 && (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    {["reference", "customer", "order_id", "amount", "receipts", "created", "status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-start font-semibold">{t(h as "reference")}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {q.data.map((p) => (
                    <tr key={p.id} className="group transition hover:bg-muted/40" data-testid={`row-payment-${p.id}`}>
                      <td className="px-5 py-3.5"><Link href={`/payments/${p.id}`} className="num font-semibold" dir="ltr">{p.reference}</Link></td>
                      <td className="px-5 py-3.5 font-medium">{p.customerName}</td>
                      <td className="num px-5 py-3.5 text-muted-foreground" dir="ltr">{p.orderId}</td>
                      <td className="px-5 py-3.5"><Money value={p.amount} className="font-semibold" /></td>
                      <td className="px-5 py-3.5 text-muted-foreground"><span className="inline-flex items-center gap-1"><Paperclip className="size-3.5" /><span className="num">{p.receiptCount}</span></span></td>
                      <td className="px-5 py-3.5 text-muted-foreground">{fmtDate(p.createdAt, locale)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-3"><Link href={`/payments/${p.id}`} data-testid={`link-payment-${p.id}`} className="grid size-8 place-items-center rounded-full text-muted-foreground transition group-hover:bg-card group-hover:text-foreground"><ChevronRight className="size-4 rtl:rotate-180" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {q.data.map((p) => (
                <li key={p.id}>
                  <Link href={`/payments/${p.id}`} data-testid={`card-payment-${p.id}`} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold">{p.customerName}</span><StatusBadge status={p.status} /></div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="num" dir="ltr">{p.reference} · {p.orderId}</span><Money value={p.amount} className="text-sm font-semibold text-foreground" /></div>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground"><span className="num">{q.data.length}</span> {t("results_count")}</p>
          </>
        )}
      </Panel>
    </>
  );
}
