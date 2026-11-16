import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { BarChart3, FileSearch, History, Landmark, LayoutGrid, LogIn, LogOut, Menu, ReceiptText, Settings, FlaskConical } from "lucide-react";
import { useGetProfile } from "@workspace/api-client-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LangSwitch, Logo } from "@/components/lang-switch";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV: { href: string; key: TKey; icon: typeof LayoutGrid; group: 0 | 1 }[] = [
  { href: "/dashboard", key: "nav_dashboard", icon: LayoutGrid, group: 0 },
  { href: "/payments", key: "nav_payments", icon: ReceiptText, group: 0 },
  { href: "/upload", key: "nav_upload", icon: FileSearch, group: 0 },
  { href: "/bank-transactions", key: "nav_bank", icon: Landmark, group: 1 },
  { href: "/history", key: "nav_history", icon: History, group: 1 },
  { href: "/reports", key: "nav_reports", icon: BarChart3, group: 1 },
  { href: "/settings", key: "nav_settings", icon: Settings, group: 1 },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const [loc] = useLocation();
  return (
    <nav className="flex flex-col gap-6">
      {[0, 1].map((g) => (
        <div key={g}>
          <p className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/35">{t(g === 0 ? "nav_group_work" : "nav_group_records")}</p>
          <div className="flex flex-col gap-0.5">
            {NAV.filter((n) => n.group === g).map((n) => {
              const active = loc === n.href || (n.href !== "/dashboard" && loc.startsWith(n.href + "/"));
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={onNavigate}
                  data-testid={`link-nav-${n.href.slice(1)}`}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {active && <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[hsl(var(--orange))]" />}
                  <Icon className={cn("size-[18px]", active ? "text-[hsl(var(--orange))]" : "")} />
                  {t(n.key)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Account() {
  const { t } = useI18n();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { data: profile } = useGetProfile();
  if (!isSignedIn) {
    return (
      <div className="space-y-2">
        <p className="px-1 text-xs text-white/45">{t("guest")}</p>
        <Link href="/sign-up" data-testid="link-sidebar-signup" className="flex items-center justify-center rounded-xl bg-[hsl(var(--orange))] px-3 py-2.5 text-sm font-bold text-white transition hover:brightness-105">
          {t("sign_up")}
        </Link>
        <Link href="/sign-in" data-testid="link-sidebar-signin" className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 ring-1 ring-white/15 transition hover:text-white">
          <LogIn className="size-4 rtl:rotate-180" /> {t("sign_in")}
        </Link>
      </div>
    );
  }
  const name = profile?.businessName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "";
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--orange))] text-xs font-bold text-white">{initials || "VP"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white" data-testid="text-account-name">{name}</p>
        <p className="truncate text-[0.7rem] text-white/45">{t("signed_in_as")}</p>
      </div>
      <button
        onClick={() => signOut({ redirectUrl: basePath || "/" })}
        title={t("sign_out")}
        data-testid="button-sign-out"
        className="grid size-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-4 rtl:rotate-180" />
      </button>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="ledger-grid-dark flex h-full flex-col bg-sidebar px-4 py-5">
      <Link href="/dashboard" onClick={onNavigate} className="mb-1 px-2" data-testid="link-logo">
        <Logo dark />
      </Link>
      <p className="mb-8 px-2 text-[0.7rem] text-white/40">{t("tagline")}</p>
      <div className="flex-1 overflow-y-auto">
        <NavList onNavigate={onNavigate} />
      </div>
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-white/45">{t("language")}</span>
          <LangSwitch dark />
        </div>
        <Account />
      </div>
    </div>
  );
}

function DemoBanner() {
  const { t } = useI18n();
  const { isSignedIn } = useUser();
  const { data: profile } = useGetProfile();
  if (!profile?.isDemo) return null;
  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[hsl(var(--orange)/0.25)] bg-[hsl(var(--orange)/0.09)] px-4 py-2 text-xs md:px-8" data-testid="banner-demo">
      <FlaskConical className="size-4 text-[hsl(var(--orange))]" />
      <span className="flex-1 font-medium text-foreground/80">{t("demo_banner")}</span>
      {!isSignedIn && (
        <Link href="/sign-up" data-testid="link-demo-signup" className="font-bold text-[hsl(15_80%_45%)] underline-offset-4 hover:underline">
          {t("demo_banner_cta")}
        </Link>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { dir } = useI18n();
  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="sticky top-0 hidden h-[100dvh] w-[260px] shrink-0 lg:block">
        <SidebarBody />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-sidebar px-4 py-3 lg:hidden">
          <Logo dark />
          <button onClick={() => setOpen(true)} data-testid="button-menu" className="grid size-10 place-items-center rounded-xl text-white ring-1 ring-white/15">
            <Menu className="size-5" />
          </button>
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[280px] border-0 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <DemoBanner />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-7 md:px-8 md:py-9">{children}</main>
      </div>
    </div>
  );
}
