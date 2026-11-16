import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Copy, FileSpreadsheet, FileText, Languages, PlugZap, ReceiptText, ScanSearch, Scale } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { LangSwitch, Logo } from "@/components/lang-switch";
import { Disclaimer, Money, STATUSES, StatusBadge } from "@/components/kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function HeroMock() {
  const { t } = useI18n();
  const checks: TKey[] = ["mock_check_amount", "mock_check_ref", "mock_check_date", "mock_check_dup"];
  return (
    <div className="relative mx-auto w-full max-w-[460px]" aria-label={t("mock_label")}>
      <span className="absolute -top-3 end-4 z-20 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/60 ring-1 ring-white/15">{t("mock_label")}</span>
      <div className="rise relative overflow-hidden rounded-3xl bg-white p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)]" style={{ animationDelay: "150ms" }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-2xl bg-[#F5F7FA] p-3.5">
            <span className="scan-line pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent via-[hsl(var(--orange)/0.18)] to-transparent" />
            <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground"><ReceiptText className="size-3.5" /> {t("mock_receipt")}</p>
            <Money value={42.75} className="mt-3 text-xl font-semibold text-foreground" />
            <p className="num mt-2 text-[0.7rem] text-muted-foreground" dir="ltr">REF VP-7Q4M2</p>
            <p className="num text-[0.7rem] text-muted-foreground" dir="ltr">2025-03-11</p>
          </div>
          <div className="rounded-2xl bg-[#101B35] p-3.5 text-white">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-white/50"><FileSpreadsheet className="size-3.5" /> {t("mock_bank")}</p>
            <Money value={42.75} className="mt-3 text-xl font-semibold" />
            <p className="num mt-2 text-[0.7rem] text-white/50" dir="ltr">TXN 88190342</p>
            <p className="num text-[0.7rem] text-white/50" dir="ltr">2025-03-11</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {checks.map((k, i) => (
            <li key={k} className="rise flex items-center gap-2.5 text-sm text-foreground" style={{ animationDelay: `${450 + i * 140}ms` }}>
              <CheckCircle2 className="size-4 text-[hsl(var(--ok))]" /> {t(k)}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <StatusBadge status="VERIFIED" size="lg" />
          <span className="text-[0.7rem] text-muted-foreground">{t("mock_bank")}</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t } = useI18n();
  const steps = [
    { i: ReceiptText, t: "step1_t", d: "step1_d" },
    { i: ScanSearch, t: "step2_t", d: "step2_d" },
    { i: FileSpreadsheet, t: "step3_t", d: "step3_d" },
    { i: Scale, t: "step4_t", d: "step4_d" },
  ] as const;
  const kw = [
    { i: FileText, t: "k1_t", d: "k1_d" },
    { i: Languages, t: "k2_t", d: "k2_d" },
    { i: PlugZap, t: "k3_t", d: "k3_d" },
    { i: Copy, t: "k4_t", d: "k4_d" },
  ] as const;
  return (
    <div className="min-h-[100dvh] bg-background">
      <section className="ledger-grid-dark relative overflow-hidden bg-[#101B35] text-white">
        <div className="pointer-events-none absolute -end-40 -top-40 size-[520px] rounded-full bg-[hsl(var(--orange)/0.14)] blur-3xl" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 md:px-8">
          <Logo dark />
          <div className="flex items-center gap-2 md:gap-3">
            <LangSwitch dark />
            <Link href="/sign-in" data-testid="link-header-signin" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white sm:inline-flex">{t("sign_in")}</Link>
            <Link href="/dashboard" data-testid="link-header-demo" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#101B35] transition hover:bg-white/90">{t("try_demo")}</Link>
          </div>
        </header>
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-16">
          <div>
            <p className="rise mb-5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/75 ring-1 ring-white/10">
              <span className="size-1.5 rounded-full bg-[hsl(var(--orange))]" /> {t("land_eyebrow")}
            </p>
            <h1 className="rise text-[2.4rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl" style={{ animationDelay: "60ms" }}>
              {t("land_h1a")}
              <br />
              <span className="text-[hsl(var(--orange))]">{t("land_h1b")}</span>
            </h1>
            <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg" style={{ animationDelay: "120ms" }}>{t("land_sub")}</p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
              <Link href="/dashboard" data-testid="link-hero-demo" className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--orange))] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[hsl(var(--orange)/0.3)] transition hover:brightness-105">
                {t("try_demo")} <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link href="/sign-up" data-testid="link-hero-signup" className="inline-flex items-center rounded-full px-6 py-3.5 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/5">{t("sign_up")}</Link>
            </div>
            <p className="rise mt-6 flex items-center gap-2 text-xs text-white/50" style={{ animationDelay: "240ms" }}><PlugZap className="size-4" /> {t("land_no_connect")}</p>
          </div>
          <HeroMock />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--orange))]">{t("land_how")}</p>
        <h2 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight">{t("land_how_title")}</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="card-lift relative rounded-2xl border border-card-border bg-card p-6">
              <span className="num absolute end-5 top-5 text-3xl font-semibold text-foreground/[0.07]">0{i + 1}</span>
              <span className="grid size-11 place-items-center rounded-xl bg-[#101B35] text-white"><s.i className="size-5" /></span>
              <h3 className="mt-5 font-bold">{t(s.t)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(s.d)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{t("land_status_title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("land_status_sub")}</p>
            <div className="mt-8"><Disclaimer /></div>
          </div>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {STATUSES.map((s) => (
              <li key={s} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="w-40 shrink-0"><StatusBadge status={s} /></div>
                <p className="text-sm text-muted-foreground">{t(`status_desc_${s}`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight">{t("land_kuwait_title")}</h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {kw.map((k) => (
            <div key={k.t} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--orange)/0.1)] text-[hsl(var(--orange))]"><k.i className="size-5" /></span>
              <div>
                <h3 className="font-bold">{t(k.t)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(k.d)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 md:px-8">
        <h2 className="text-2xl font-extrabold tracking-tight">{t("land_faq")}</h2>
        <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-border bg-card px-5">
          {(["1", "2", "3", "4"] as const).map((n) => (
            <AccordionItem key={n} value={n} className="last:border-0">
              <AccordionTrigger data-testid={`button-faq-${n}`} className="text-start font-semibold">{t(`faq${n}_q`)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{t(`faq${n}_a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="px-5 pb-16 md:px-8">
        <div className="ledger-grid-dark mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-[#101B35] p-8 text-white md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">{t("land_cta_title")}</h2>
            <p className="mt-2 max-w-xl text-white/65">{t("land_cta_sub")}</p>
          </div>
          <Link href="/dashboard" data-testid="link-cta-demo" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[hsl(var(--orange))] px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-105">
            {t("try_demo")} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <Logo />
          <p className="max-w-xl">{t("footer_note")}</p>
        </div>
      </footer>
    </div>
  );
}
