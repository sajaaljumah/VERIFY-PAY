import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getGetDashboardQueryKey, getListPaymentsQueryKey, useCreatePayment } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { AMOUNT_RE, errMsg } from "@/lib/format";
import { btnGhost, btnPrimary, inputCls } from "@/lib/ui";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Money, PageHeader, Panel } from "@/components/kit";

export default function PaymentNew() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreatePayment();
  const schema = z.object({
    customerName: z.string().trim().min(1, t("v_required")).max(120),
    orderId: z.string().trim().min(1, t("v_required")).max(100),
    amount: z.string().trim().refine((v) => AMOUNT_RE.test(v) && Number(v) >= 0.001, t("v_amount")),
    description: z.string().max(1000),
  });
  type F = z.infer<typeof schema>;
  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: { customerName: "", orderId: "", amount: "", description: "" } });
  const amt = form.watch("amount");

  const onSubmit = (v: F) => {
    create.mutate(
      { data: { customerName: v.customerName, orderId: v.orderId, amount: Number(v.amount), description: v.description } },
      {
        onSuccess: (p) => {
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: t("created_toast"), description: p.reference });
          setLocation(`/payments/${p.id}`);
        },
        onError: (e) => toast({ variant: "destructive", title: t("error_title"), description: errMsg(e, t("error_generic")) }),
      },
    );
  };

  return (
    <>
      <Link href="/payments" data-testid="link-back" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" />{t("pay_title")}</Link>
      <PageHeader title={t("new_title")} sub={t("new_sub")} />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="customerName" render={({ field }) => (
                  <FormItem><FormLabel>{t("customer")}</FormLabel><FormControl><input {...field} className={inputCls} placeholder={t("f_customer_ph")} data-testid="input-customer" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="orderId" render={({ field }) => (
                  <FormItem><FormLabel>{t("order_id")}</FormLabel><FormControl><input {...field} dir="ltr" className={inputCls} placeholder={t("f_order_ph")} data-testid="input-order" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("amount")}</FormLabel>
                  <FormControl>
                    <div className="relative" dir="ltr">
                      <input {...field} inputMode="decimal" className={`${inputCls} num h-14 pe-16 text-xl`} placeholder={t("f_amount_ph")} data-testid="input-amount" onBlur={(e) => { field.onBlur(); if (AMOUNT_RE.test(e.target.value)) form.setValue("amount", Number(e.target.value).toFixed(3)); }} />
                      <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">KWD</span>
                    </div>
                  </FormControl>
                  <FormDescription>{t("f_amount_help")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>{t("description")}</FormLabel><FormControl><textarea {...field} rows={3} className={`${inputCls} h-auto py-3`} placeholder={t("f_desc_ph")} data-testid="input-description" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Link href="/payments" className={btnGhost} data-testid="link-cancel">{t("cancel")}</Link>
                <button type="submit" disabled={create.isPending} className={btnPrimary} data-testid="button-create">
                  {create.isPending && <Loader2 className="size-4 animate-spin" />}
                  {create.isPending ? t("creating") : t("create_request")}
                </button>
              </div>
            </form>
          </Form>
        </Panel>
        <Panel className="ledger-grid-dark h-fit bg-[#101B35] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-white/45">{t("preview")}</p>
          <p className="mt-4 text-lg font-bold">{form.watch("customerName") || "—"}</p>
          <p className="num text-sm text-white/55" dir="ltr">{form.watch("orderId") || "—"}</p>
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs text-white/45">{t("expected")}</p>
            <Money value={AMOUNT_RE.test(amt) ? Number(amt) : null} big className="mt-1 text-4xl font-semibold" />
          </div>
        </Panel>
      </div>
    </>
  );
}
