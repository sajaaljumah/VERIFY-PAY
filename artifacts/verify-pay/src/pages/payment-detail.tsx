import { Link, useParams } from "wouter";
import { ArrowLeft, Download, ExternalLink, FileText, SearchX, Upload } from "lucide-react";
import { getGetPaymentQueryKey, useGetPayment, type Receipt } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { btnGhost, btnPrimary } from "@/lib/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclaimer, EmptyState, ErrorState, Money, Panel, StatusBadge } from "@/components/kit";
import { AttemptCard } from "@/components/attempt-card";

function ReceiptTile({ r }: { r: Receipt }) {
  const { t, locale } = useI18n();
  const isImg = r.contentType.startsWith("image/");
  return (
    <li className="flex gap-3 rounded-xl border border-border p-3" data-testid={`card-receipt-${r.id}`}>
      <a href={r.fileUrl} target="_blank" rel="noreferrer" className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
        {isImg ? <img src={r.fileUrl} alt={r.fileName} className="size-full object-cover" /> : <FileText className="size-6 text-muted-foreground" />}
      </a>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" dir="ltr">{r.fileName}</p>
        <p className="text-xs text-muted-foreground">{fmtDate(r.createdAt, locale, true)} · {t(`conf_${r.confidence}`)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <Money value={r.amount} className="font-semibold" />
          {r.duplicateFile && <span className="rounded-full bg-[hsl(var(--bad)/0.1)] px-2 py-0.5 font-semibold text-[hsl(var(--bad))]">{t("duplicate_file")}</span>}
        </div>
      </div>
      <a href={r.fileUrl} target="_blank" rel="noreferrer" title={t("open_file")} data-testid={`link-open-receipt-${r.id}`} className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ExternalLink className="size-4" /></a>
    </li>
  );
}

export default function PaymentDetail() {
  const { t, locale } = useI18n();
  const { id = "" } = useParams<{ id: string }>();
  const q = useGetPayment(id, { query: { enabled: !!id, queryKey: getGetPaymentQueryKey(id) } });
  const status = (q.error as { status?: number } | null)?.status;

  return (
    <>
      <Link href="/payments" data-testid="link-back" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" />{t("pay_title")}</Link>
      {q.isLoading && <div className="space-y-4" data-testid="state-loading"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>}
      {q.isError && (status === 404 ? <EmptyState icon={<SearchX className="size-6" />} title={t("not_found")} sub={t("not_found_sub")} action={<Link href="/payments" className={btnPrimary}>{t("pay_title")}</Link>} /> : <ErrorState onRetry={() => q.refetch()} />)}
      {q.data && (() => {
        const { payment: p, receipts, attempts } = q.data;
        return (
          <div className="space-y-5">
            <Panel className="ledger-grid-dark overflow-hidden bg-[#101B35] p-6 text-white md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/45">{t("detail_ref")}</p>
                  <p className="num mt-1 text-lg font-semibold text-[hsl(var(--orange))]" dir="ltr" data-testid="text-reference">{p.reference}</p>
                  <h1 className="mt-3 text-2xl font-extrabold md:text-3xl" data-testid="text-customer">{p.customerName}</h1>
                  <p className="mt-1 text-sm text-white/55"><span className="num" dir="ltr">{p.orderId}</span> · {fmtDate(p.createdAt, locale, true)}</p>
                  {p.description && <p className="mt-3 max-w-xl text-sm text-white/70">{p.description}</p>}
                </div>
                <div className="md:text-end">
                  <Money value={p.amount} big className="text-4xl font-semibold md:text-5xl" />
                  <div className="mt-3"><StatusBadge status={p.status} size="lg" /></div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                <Link href={`/upload?paymentId=${p.id}`} className={btnPrimary} data-testid="link-upload-receipt"><Upload className="size-4" />{t("upload_receipt")}</Link>
                <a href={`/api/vp/sample-receipt.pdf?paymentId=${encodeURIComponent(p.id)}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white/80 ring-1 ring-white/20 hover:text-white" data-testid="link-sample-receipt"><Download className="size-4" />{t("sample_receipt")}</a>
              </div>
            </Panel>
            <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
              <Panel title={<>{t("receipts")} <span className="num ms-1 text-muted-foreground">{receipts.length}</span></>}>
                {receipts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("no_receipts")}</p> : <ul className="space-y-2 p-4">{receipts.map((r) => <ReceiptTile key={r.id} r={r} />)}</ul>}
              </Panel>
              <div className="space-y-4">
                <h2 className="text-sm font-bold">{t("attempts")} <span className="num ms-1 text-muted-foreground">{attempts.length}</span></h2>
                {attempts.length === 0 ? (
                  <EmptyState icon={<Upload className="size-6" />} title={t("no_attempts")} action={<Link href={`/upload?paymentId=${p.id}`} className={btnGhost}>{t("upload_receipt")}</Link>} />
                ) : attempts.map((a) => <AttemptCard key={a.id} attempt={a} />)}
                <Disclaimer compact />
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
