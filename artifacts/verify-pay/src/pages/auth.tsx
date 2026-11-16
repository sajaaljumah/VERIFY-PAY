import type { ReactNode } from "react";
import { Link } from "wouter";
import { SignIn, SignUp } from "@clerk/react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LangSwitch, Logo } from "@/components/lang-switch";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1fr_1.1fr]">
      <aside className="ledger-grid-dark relative hidden flex-col justify-between overflow-hidden bg-[#101B35] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -bottom-40 -start-40 size-[480px] rounded-full bg-[hsl(var(--orange)/0.14)] blur-3xl" />
        <Link href="/" data-testid="link-auth-home"><Logo dark /></Link>
        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight">{t("auth_side_title")}</h1>
          <p className="mt-3 max-w-sm text-white/65">{t("auth_side_sub")}</p>
        </div>
        <p className="relative max-w-sm text-xs text-white/40">{t("footer_note")}</p>
      </aside>
      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-auth-back"><ArrowLeft className="size-4 rtl:rotate-180" />{t("back")}</Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-[hsl(15_80%_48%)]" data-testid="link-auth-demo">{t("try_demo")}</Link>
            <LangSwitch />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-10">{children}</div>
      </main>
    </div>
  );
}

export function SignInPage() {
  return (
    <AuthFrame>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

export function SignUpPage() {
  return (
    <AuthFrame>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}
