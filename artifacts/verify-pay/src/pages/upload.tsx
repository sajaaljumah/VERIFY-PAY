import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Download, FileText, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import {
  getGetDashboardQueryKey, getGetPaymentQueryKey, getGetReportsQueryKey, getListAttemptsQueryKey, getListBankTransactionsQueryKey, getListPaymentsQueryKey,
  useExtractReceipt, useListPayments, useRequestReceiptUpload, useVerifyReceipt,
  type Attempt, type Receipt, type ReceiptUploadInputContentType,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { AMOUNT_RE, errMsg, fmtAmount } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclaimer, Money, PageHeader, Panel, StatusBadge, CheckList, ErrorState } from "@/components/kit";
import { MatchedTx } from "@/components/attempt-card";

const TYPES = ["image/jpeg", "image/png", "application/pdf"];
type Phase = "pick" | "uploading" | "extracting" | "review" | "verifying" | "done";
type Fields = { amount: string; transactionDate: string; reference: string; sender: string; receiver: string };
const EMPTY: Fields = { amount: "", transactionDate: "", reference: "", sender: "", receiver: "" };

export default function UploadPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const search = useSearch();
  const initialPid = useMemo(() => new URLSearchParams(search).get("paymentId") ?? "", [search]);
  const payments = useListPayments();
  const [paymentId, setPaymentId] = useState(initialPid);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState("");
  const [phase, setPhase] = useState<Phase>("pick");
  const [receiptId, setReceiptId] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [extractErr, setExtractErr] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [verifyErr, setVerifyErr] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestUpload = useRequestReceiptUpload();
  const extract = useExtractReceipt();
  const verify = useVerifyReceipt();

  useEffect(() => { if (initialPid) setPaymentId(initialPid); }, [initialPid]);
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selected = payments.data?.find((p) => p.id === paymentId);
  const locked = phase !== "pick";

  function choose(f: File | undefined) {
    setFileErr("");
    if (!f) return;
    if (!TYPES.includes(f.type)) return setFileErr(t("bad_type"));
    if (f.size > 10 * 1024 * 1024) return setFileErr(t("too_big"));
    setFile(f);
  }

  async function start() {
    if (!file || !paymentId) return;
    setFileErr("");
    setPhase("uploading");
    let rid = "";
    try {
      const up = await requestUpload.mutateAsync({ data: { paymentId, name: file.name, size: file.size, contentType: file.type as ReceiptUploadInputContentType } });
      const put = await fetch(up.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error(`${t("upload_failed")} (${put.status})`);
      rid = up.receiptId;
      setReceiptId(rid);
    } catch (e) {
      setFileErr(errMsg(e, t("upload_failed")));
      setPhase("pick");
      return;
    }
    setPhase("extracting");
    try {
      const r = await extract.mutateAsync({ id: rid });
      setReceipt(r);
      setFields({ amount: r.amount === null ? "" : fmtAmount(r.amount).replace(/,/g, ""), transactionDate: r.transactionDate || "", reference: r.reference || "", sender: r.sender || "", receiver: r.receiver || "" });
      setExtractErr("");
    } catch (e) {
      setReceipt(null);
      setFields(EMPTY);
      setExtractErr(errMsg(e, t("extract_failed")));
    }
    qc.invalidateQueries({ queryKey: getGetPaymentQueryKey(paymentId) });
    setPhase("review");
  }

  const amountOk = fields.amount.trim() === "" || AMOUNT_RE.test(fields.amount.trim());

  async function runVerify() {
    if (!receiptId || !amountOk) return;
    setVerifyErr("");
    setPhase("verifying");
    try {
      const a = await verify.mutateAsync({
        id: receiptId,
        data: { amount: fields.amount.trim() === "" ? null : Number(fields.amount), transactionDate: fields.transactionDate, reference: fields.reference.trim(), sender: fields.sender.trim(), receiver: fields.receiver.trim() },
      });
      setAttempt(a);
      setPhase("done");
      [getListPaymentsQueryKey(), getGetDashboardQueryKey(), getListAttemptsQueryKey(), getGetReportsQueryKey(), getListBankTransactionsQueryKey(), getGetPaymentQueryKey(paymentId)].forEach((queryKey) => qc.invalidateQueries({ queryKey }));
    } catch (e) {
      setVerifyErr(errMsg(e, t("error_generic")));
      setPhase("review");
    }
  }

  function reset() {
    setFile(null); setPhase("pick"); setReceiptId(""); setReceipt(null); setExtractErr(""); setFields(EMPTY); setAttempt(null); setVerifyErr(""); setFileErr("");
  }

  const stepIdx = phase === "pick" ? (file ? 1 : paymentId ? 1 : 0) : phase === "uploading" || phase === "extracting" ? 1 : phase === "done" ? 3 : 2;
  const steps = [t("up_step1"), t("up_step2"), t("up_step3"), t("up_step4")];

  return (
    <>
      <PageHeader title={t("up_title")} sub={t("up_sub")} />
      <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-2">
            <span className={cn("grid size-7 place-items-center rounded-full text-xs font-bold transition", i < stepIdx ? "bg-[hsl(var(--ok))] text-white" : i === stepIdx ? "bg-[hsl(var(--orange))] text-white" : "bg-muted text-muted-foreground")}>
              {i < stepIdx ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("text-sm font-semibold", i === stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < 3 && <span className="mx-1 h-px w-6 bg-border md:w-10" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-5">
          <Panel title={`1. ${t("up_step1")}`} className="overflow-visible">
            <div className="p-5">
              {payments.isLoading ? <Skeleton className="h-11 rounded-xl" /> : payments.isError ? <ErrorState onRetry={() => payments.refetch()} /> : payments.data && payments.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("no_requests_hint")} <Link href="/payments/new" className="font-semibold text-[hsl(15_80%_48%)]">{t("new_request")}</Link></p>
              ) : (
                <Select value={paymentId} onValueChange={setPaymentId} disabled={locked}>
                  <SelectTrigger className="h-auto min-h-11 rounded-xl" data-testid="select-payment"><SelectValue placeholder={t("choose_request")} /></SelectTrigger>
                  <SelectContent>
                    {payments.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id} data-testid={`option-payment-${p.id}`}>
                        <span className="flex items-center gap-2"><span className="num text-xs text-muted-foreground" dir="ltr">{p.reference}</span><span className="font-medium">{p.customerName}</span><span className="num text-xs" dir="ltr">{fmtAmount(p.amount)}</span><span className="text-xs text-muted-foreground">· {t(`status_${p.status}`)}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selected && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3.5">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{selected.customerName}</p><p className="num text-xs text-muted-foreground" dir="ltr">{selected.orderId}</p></div>
                  <div className="text-end"><p className="text-[0.68rem] text-muted-foreground">{t("expected")}</p><Money value={selected.amount} className="font-semibold" /></div>
                </div>
              )}
              {selected && (
                <a href={`/api/vp/sample-receipt.pdf?paymentId=${encodeURIComponent(selected.id)}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="link-sample-receipt"><Download className="size-3.5" />{t("sample_receipt")}</a>
              )}
            </div>
          </Panel>

          <Panel title={`2. ${t("up_step2")}`}>
            <div className="p-5">
              <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} data-testid="input-file" />
              {!file ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0]); }}
                  data-testid="dropzone-receipt"
                  className={cn("ledger-grid flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition", drag ? "border-[hsl(var(--orange))] bg-[hsl(var(--orange)/0.05)]" : "border-border hover:border-foreground/30")}
                >
                  <span className={cn("grid size-12 place-items-center rounded-2xl bg-card text-[hsl(var(--orange))] shadow-sm ring-1 ring-border transition", drag && "scale-110")}><UploadCloud className="size-6" /></span>
                  <span className="mt-3 font-semibold">{t("drop_title")}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{t("drop_sub")}</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
                  <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <FileText className="size-7 text-muted-foreground" />}
                    {(phase === "uploading" || phase === "extracting") && <span className="scan-line absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent via-[hsl(var(--orange)/0.4)] to-transparent" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" dir="ltr" data-testid="text-file-name">{file.name}</p>
                    <p className="num text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    {(phase === "uploading" || phase === "extracting") && <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[hsl(15_80%_48%)]"><Loader2 className="size-3.5 animate-spin" />{phase === "uploading" ? t("uploading") : t("extracting")}</p>}
                    {receipt && <a href={receipt.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold underline-offset-4 hover:underline">{t("open_file")}</a>}
                  </div>
                  {phase === "pick" && <button onClick={() => setFile(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="button-remove-file">{t("replace_file")}</button>}
                </div>
              )}
              {fileErr && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--bad))]" data-testid="text-file-error"><AlertTriangle className="size-4" />{fileErr}</p>}
              {phase === "pick" && (
                <button onClick={start} disabled={!file || !paymentId} className={cn(btnPrimary, "mt-4 w-full")} data-testid="button-upload">
                  {t("upload_extract")} <ArrowRight className="size-4 rtl:rotate-180" />
                </button>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          {(phase === "pick" || phase === "uploading" || phase === "extracting") && (
            <Panel className="ledger-grid flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              {phase === "pick" ? (
                <>
                  <p className="text-sm font-semibold text-muted-foreground">{t("up_step3")}</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t("review_hint")}</p>
                </>
              ) : (
                <div className="w-full max-w-sm space-y-3" data-testid="state-extracting">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                </div>
              )}
            </Panel>
          )}

          {(phase === "review" || phase === "verifying") && (
            <Panel title={`3. ${t("up_step3")}`} action={receipt && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{t(`conf_${receipt.confidence}`)}</span>}>
              <div className="space-y-4 p-5">
                {extractErr && <div className="flex gap-2 rounded-xl bg-[hsl(var(--warn)/0.1)] p-3 text-sm" data-testid="text-extract-error"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--warn))]" /><div><p className="font-semibold">{t("extract_failed")}</p><p className="text-xs text-muted-foreground">{extractErr}</p></div></div>}
                {receipt?.extractionNote && <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{t("extraction_note")}: </span>{receipt.extractionNote}</p>}
                {receipt?.duplicateFile && <p className="rounded-xl bg-[hsl(var(--bad)/0.08)] p-3 text-xs font-semibold text-[hsl(var(--bad))]">{t("duplicate_file")}</p>}
                <p className="text-xs text-muted-foreground">{t("review_hint")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold">{t("amount")}</span>
                    <div className="relative" dir="ltr">
                      <input value={fields.amount} onChange={(e) => setFields({ ...fields, amount: e.target.value })} inputMode="decimal" placeholder="0.000" className={cn(inputCls, "num h-12 pe-16 text-lg", !amountOk && "border-[hsl(var(--bad))]")} data-testid="input-review-amount" disabled={phase === "verifying"} />
                      <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">KWD</span>
                    </div>
                    {!amountOk && <span className="mt-1 block text-xs text-[hsl(var(--bad))]">{t("v_amount")}</span>}
                    {selected && <span className="mt-1 block text-xs text-muted-foreground">{t("expected")}: <Money value={selected.amount} /></span>}
                  </label>
                  <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t("date")}</span><input type="date" value={fields.transactionDate} onChange={(e) => setFields({ ...fields, transactionDate: e.target.value })} className={inputCls} dir="ltr" data-testid="input-review-date" disabled={phase === "verifying"} /></label>
                  <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t("reference")}</span><input value={fields.reference} maxLength={200} onChange={(e) => setFields({ ...fields, reference: e.target.value })} className={cn(inputCls, "num")} dir="ltr" data-testid="input-review-reference" disabled={phase === "verifying"} /></label>
                  <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t("sender")}</span><input value={fields.sender} maxLength={200} onChange={(e) => setFields({ ...fields, sender: e.target.value })} className={inputCls} data-testid="input-review-sender" disabled={phase === "verifying"} /></label>
                  <label className="block"><span className="mb-1.5 block text-sm font-semibold">{t("receiver")}</span><input value={fields.receiver} maxLength={200} onChange={(e) => setFields({ ...fields, receiver: e.target.value })} className={inputCls} data-testid="input-review-receiver" disabled={phase === "verifying"} /></label>
                </div>
                {verifyErr && <p className="flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--bad))]" data-testid="text-verify-error"><AlertTriangle className="size-4" />{verifyErr}</p>}
                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <button onClick={reset} className={btnGhost} disabled={phase === "verifying"} data-testid="button-reset"><RotateCcw className="size-4" />{t("replace_file")}</button>
                  <button onClick={runVerify} disabled={phase === "verifying" || !amountOk} className={btnPrimary} data-testid="button-verify">
                    {phase === "verifying" && <Loader2 className="size-4 animate-spin" />}
                    {phase === "verifying" ? t("verifying") : t("run_verify")}
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {phase === "done" && attempt && (
            <Panel title={`4. ${t("result_title")}`} className="rise">
              <div className="space-y-5 p-5" data-testid="panel-result">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge status={attempt.status} size="lg" />
                  <Money value={attempt.amount} className="text-xl font-semibold" />
                </div>
                <p className="text-sm font-medium" data-testid="text-result-reason">{attempt.reason}</p>
                <CheckList checks={attempt.checks} />
                <MatchedTx attempt={attempt} />
                <Disclaimer compact />
                <div className="flex flex-wrap justify-between gap-2">
                  <button onClick={reset} className={btnGhost} data-testid="button-verify-another"><RotateCcw className="size-4" />{t("verify_another")}</button>
                  <Link href={`/payments/${attempt.paymentId}`} className={btnPrimary} data-testid="link-go-detail">{t("go_detail")} <ArrowRight className="size-4 rtl:rotate-180" /></Link>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
