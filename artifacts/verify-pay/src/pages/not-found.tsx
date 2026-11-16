import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/lang-switch";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="ledger-grid flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      <Logo />
      <p className="num mt-10 text-7xl font-semibold text-[hsl(var(--orange))]">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">{t("nf_title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("nf_sub")}</p>
      <Link href="/dashboard" data-testid="link-404-home" className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">{t("go_home")}</Link>
    </div>
  );
}
