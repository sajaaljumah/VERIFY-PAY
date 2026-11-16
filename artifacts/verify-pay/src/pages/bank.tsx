import { useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Landmark, Loader2, PlugZap, Search, UploadCloud } from "lucide-react";
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListBankTransactionsQueryKey, getListImportsQueryKey,
  useImportBankTransactions, useListBankTransactions, useListImports, type ImportRecord,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { errMsg, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/ui";
import { Disclaimer, EmptyState, ErrorState, Money, PageHeader, Panel, RowsSkeleton } from "@/components/kit";
import { useDebounced } from "@/pages/payments";

const HEADERS = ["transaction_id", "reference", "amount", "date", "description", "sender"];

function ImportResult({ r }: { r: ImportRecord }) {
  const { t } = useI18n();
  return (
    <div className="rise rounded-2xl border border-border p-4" data-testid="panel-import-result">
      <p className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="size-4 text-[hsl(var(--ok))]" />{t("import_done")} <span className="truncate font-normal text-muted-foreground" dir="ltr">{r.fileName}</span></p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[{ k: "imported", v: r.imported, c: "text-[hsl(var(--ok))]" }, { k: "duplicates", v: r.duplicates, c: "text-[hsl(36_80%_36%)]" }, { k: "rejected", v: r.rejected, c: "text-[hsl(var(--bad))]" }].map((x) => (
          <div key={x.k} className="rounded-xl bg-muted/60 p-2.5"><p className={cn("num text-xl font-semibold", x.c)}>{x.v}</p><p className="text-[0.68rem] text-muted-foreground">{t(x.k as "imported")}</p></div>
        ))}
      </div>
      {r.errors.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold">{t("row_errors")}</p>
          <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-[hsl(var(--bad))]">{r.errors.map((e, i) => <li key={i} dir="ltr" className="text-start">{e}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function Bank() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const ds = useDebounced(search.trim());
  const tx = useListBankTransactions(ds ? { search: ds } : undefined);
  const imports = useListImports();
  const imp = useImportBankTransactions();
  const [err, setErr] = useState("");
  const [last, setLast] = useState<ImportRecord | null>(null);
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handle(f: File | undefined) {
    setErr("");
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setErr(t("not_csv"));
    if (f.size > 2 * 1024 * 1024) return setErr(t("csv_too_big"));
    const csv = await f.text();
    imp.mutate({ data: { fileName: f.name, csv } }, {
      onSuccess: (r) => {
        setLast(r);
        [getListBankTransactionsQueryKey(), getListImportsQueryKey(), getGetDashboardQueryKey(), getGetReportsQueryKey()].forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      },
      onError: (e) => setErr(errMsg(e, t("error_generic"))),
    });
  }

  return (
    <>
      <PageHeader title={t("bank_title")} sub={t("bank_sub")} actions={<a href="/api/vp/sample-bank.csv" className={btnGhost} data-testid="link-sample-csv"><Download className="size-4" />{t("sample_csv")}</a>} />
      <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-[#101B35] px-4 py-3 text-sm text-white/80"><PlugZap className="size-4 shrink-0 text-[hsl(var(--orange))]" />{t("bank_no_connect")}</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-5">
          <Panel title={t("import_csv")}>
            <div className="space-y-4 p-5">
              <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} data-testid="input-csv" />
              <button
                type="button"
                disabled={imp.isPending}
                onClick={() => ref.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
                data-testid="dropzone-csv"
                className={cn("ledger-grid flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition", drag ? "border-[hsl(var(--orange))] bg-[hsl(var(--orange)/0.05)]" : "border-border hover:border-foreground/30")}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-card text-[hsl(var(--orange))] ring-1 ring-border">{imp.isPending ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}</span>
                <span className="mt-3 text-sm font-semibold">{imp.isPending ? t("importing") : t("csv_drop")}</span>
              </button>
              {err && <p className="flex items-start gap-1.5 text-sm font-medium text-[hsl(var(--bad))]" data-testid="text-import-error"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{err}</p>}
              {last && <ImportResult r={last} />}
              <div>
                <p className="mb-2 text-xs font-bold">{t("csv_headers")}</p>
                <div className="flex flex-wrap gap-1.5" dir="ltr">{HEADERS.map((h) => <code key={h} className="num rounded-md bg-muted px-2 py-0.5 text-[0.7rem]">{h}</code>)}</div>
                <p className="mt-2 text-xs text-muted-foreground">{t("csv_format")}</p>
              </div>
            </div>
          </Panel>
          <Panel title={t("import_history")}>
            {imports.isLoading ? <RowsSkeleton rows={3} /> : imports.isError ? <div className="p-4"><ErrorState onRetry={() => imports.refetch()} /></div> : imports.data && imports.data.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("no_imports")}</p> : (
              <ul className="divide-y divide-border">
                {imports.data?.map((r) => (
                  <li key={r.id} className="px-5 py-3" data-testid={`row-import-${r.id}`}>
                    <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" /><span className="truncate" dir="ltr">{r.fileName}</span></span><span className="shrink-0 text-xs text-muted-foreground">{fmtDate(r.createdAt, locale)}</span></div>
                    <p className="mt-1 text-xs text-muted-foreground"><span className="num text-[hsl(var(--ok))]">{r.imported}</span> {t("imported")} · <span className="num">{r.duplicates}</span> {t("duplicates")} · <span className="num text-[hsl(var(--bad))]">{r.rejected}</span> {t("rejected")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Disclaimer compact />
        </div>
        <div>
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("bank_search_ph")} data-testid="input-search-bank" className="h-11 w-full rounded-full border border-input bg-card pe-4 ps-10 text-sm outline-none focus:border-[hsl(var(--orange))] focus:ring-4 focus:ring-[hsl(var(--orange)/0.12)]" />
          </label>
          <Panel className="overflow-hidden">
            {tx.isLoading && <RowsSkeleton />}
            {tx.isError && <div className="p-5"><ErrorState onRetry={() => tx.refetch()} /></div>}
            {tx.data && tx.data.length === 0 && <EmptyState icon={<Landmark className="size-6" />} title={ds ? t("pay_no_results") : t("bank_empty")} sub={ds ? t("pay_no_results_sub") : t("bank_empty_sub")} />}
            {tx.data && tx.data.length > 0 && (
              <ul className="divide-y divide-border">
                {tx.data.map((r) => (
                  <li key={r.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-muted/40 md:grid-cols-[1.2fr_1fr_auto_auto]" data-testid={`row-tx-${r.id}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.sender || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                    </div>
                    <div className="order-3 col-span-2 min-w-0 text-xs text-muted-foreground md:order-none md:col-span-1">
                      <p className="num truncate" dir="ltr">{r.transactionId}</p>
                      <p className="num truncate" dir="ltr">{r.reference}</p>
                    </div>
                    <div className="text-end">
                      <Money value={r.amount} className="text-sm font-semibold" />
                      <p className="text-xs text-muted-foreground">{fmtDate(r.date, locale)}</p>
                    </div>
                    <div className="hidden items-center md:flex">
                      {r.matchedPaymentId ? (
                        <Link href={`/payments/${r.matchedPaymentId}`} data-testid={`link-tx-payment-${r.id}`} className="rounded-full bg-[hsl(var(--ok)/0.1)] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--ok))]">{t("matched")}</Link>
                      ) : <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{t("unmatched")}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
