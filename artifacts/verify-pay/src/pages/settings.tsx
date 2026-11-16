import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Building2, Loader2 } from "lucide-react";
import { getGetProfileQueryKey, getGetReportsQueryKey, useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { errMsg } from "@/lib/format";
import { btnPrimary, inputCls } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ErrorState, PageHeader, Panel } from "@/components/kit";

export default function SettingsPage() {
  const { t, setLang } = useI18n();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useGetProfile();
  const update = useUpdateProfile();
  const schema = z.object({
    businessName: z.string().trim().min(1, t("v_required")).max(120),
    ownerName: z.string().trim().min(1, t("v_required")).max(120),
    email: z.string().trim().max(254).refine((v) => v === "" || z.string().email().safeParse(v).success, t("v_email")),
    language: z.enum(["en", "ar"]),
  });
  type F = z.infer<typeof schema>;
  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: { businessName: "", ownerName: "", email: "", language: "en" } });
  const init = useRef(false);
  useEffect(() => {
    if (q.data && !init.current) {
      init.current = true;
      form.reset({ businessName: q.data.businessName, ownerName: q.data.ownerName, email: q.data.email, language: q.data.language });
    }
  }, [q.data, form]);

  const onSubmit = (v: F) =>
    update.mutate({ data: v }, {
      onSuccess: (p) => {
        qc.setQueryData(getGetProfileQueryKey(), p);
        qc.invalidateQueries({ queryKey: getGetReportsQueryKey() });
        setLang(p.language);
        form.reset({ businessName: p.businessName, ownerName: p.ownerName, email: p.email, language: p.language });
        toast({ title: t("saved_toast") });
      },
      onError: (e) => toast({ variant: "destructive", title: t("error_title"), description: errMsg(e, t("error_generic")) }),
    });

  return (
    <>
      <PageHeader title={t("set_title")} sub={t("set_sub")} />
      {q.isLoading && <Skeleton className="h-96 rounded-2xl" data-testid="state-loading" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {q.data && (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Panel className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField control={form.control} name="businessName" render={({ field }) => (<FormItem><FormLabel>{t("business_name")}</FormLabel><FormControl><input {...field} className={inputCls} data-testid="input-business" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="ownerName" render={({ field }) => (<FormItem><FormLabel>{t("owner_name")}</FormLabel><FormControl><input {...field} className={inputCls} data-testid="input-owner" /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t("email")}</FormLabel><FormControl><input {...field} type="email" dir="ltr" className={inputCls} data-testid="input-email" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="language" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pref_language")}</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(["en", "ar"] as const).map((l) => (
                        <button type="button" key={l} onClick={() => field.onChange(l)} data-testid={`button-pref-${l}`} className={cn("rounded-xl border px-4 py-3 text-start text-sm font-semibold transition", field.value === l ? "border-[hsl(var(--orange))] bg-[hsl(var(--orange)/0.06)] ring-4 ring-[hsl(var(--orange)/0.1)]" : "border-input hover:border-foreground/30")}>
                          {l === "en" ? "English" : "العربية"}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={update.isPending || !form.formState.isDirty} className={btnPrimary} data-testid="button-save">
                    {update.isPending && <Loader2 className="size-4 animate-spin" />}
                    {update.isPending ? t("saving") : t("save")}
                  </button>
                </div>
              </form>
            </Form>
          </Panel>
          <div className="space-y-4">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("workspace_type")}</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold" data-testid="text-workspace-type">
                {q.data.isDemo ? <FlaskConical className="size-4 text-[hsl(var(--orange))]" /> : <Building2 className="size-4 text-[hsl(var(--ok))]" />}
                {q.data.isDemo ? t("ws_demo") : t("ws_real")}
              </p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("currency")}</p>
              <p className="num mt-2 text-2xl font-semibold">{q.data.currency} <span className="text-base text-muted-foreground">0.000</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{t("currency_fixed")}</p>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
