import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, Show, useClerk, useUser } from "@clerk/react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useI18n, type TKey } from "@/lib/i18n";
import { AppShell } from "@/components/shell";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import Payments from "@/pages/payments";
import PaymentNew from "@/pages/payment-new";
import PaymentDetail from "@/pages/payment-detail";
import UploadPage from "@/pages/upload";
import Bank from "@/pages/bank";
import History from "@/pages/history";
import Reports from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import { SignInPage, SignUpPage } from "@/pages/auth";
import { ErrorState } from "@/components/kit";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, refetchInterval: 60000, retry: 1 } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#F36B3F",
    colorForeground: "#101B35",
    colorMutedForeground: "#5B6478",
    colorDanger: "#D12F42",
    colorBackground: "#FFFFFF",
    colorInput: "#FFFFFF",
    colorInputForeground: "#101B35",
    colorNeutral: "#101B35",
    fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-3xl w-[440px] max-w-full overflow-hidden border border-[#E2E6EE] shadow-[0_20px_60px_-30px_rgba(16,27,53,0.35)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#101B35] font-extrabold text-xl",
    headerSubtitle: "text-[#5B6478]",
    socialButtonsBlockButtonText: "text-[#101B35] font-semibold",
    formFieldLabel: "text-[#101B35] font-semibold",
    footerActionLink: "text-[#D9532A] font-bold",
    footerActionText: "text-[#5B6478]",
    dividerText: "text-[#5B6478]",
    identityPreviewEditButton: "text-[#D9532A]",
    formFieldSuccessText: "text-[#1F8A5B]",
    alertText: "text-[#101B35]",
    logoBox: "justify-center",
    logoImage: "h-11 w-11",
    socialButtonsBlockButton: "border border-[#DCE1EA] bg-white rounded-xl",
    formButtonPrimary: "bg-[#F36B3F] text-white font-bold rounded-full shadow-none",
    formFieldInput: "rounded-xl border border-[#D3D9E4] bg-white text-[#101B35]",
    footerAction: "justify-center",
    dividerLine: "bg-[#E2E6EE]",
    alert: "rounded-xl border border-[#F3C3B3] bg-[#FFF4EF]",
    otpCodeFieldInput: "rounded-lg border border-[#D3D9E4] text-[#101B35]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function RouteMetadata() {
  const [location] = useLocation();
  const { t, lang } = useI18n();
  useEffect(() => {
    const routes: Record<string, [TKey, TKey]> = {
      "/": ["brand", "land_sub"],
      "/dashboard": ["nav_dashboard", "tagline"],
      "/payments": ["pay_title", "tagline"],
      "/payments/new": ["new_request", "tagline"],
      "/upload": ["up_title", "up_sub"],
      "/bank-transactions": ["bank_title", "bank_sub"],
      "/history": ["hist_title", "hist_sub"],
      "/reports": ["rep_title", "rep_sub"],
      "/settings": ["set_title", "set_sub"],
    };
    const keys = routes[location] ?? (location.startsWith("/sign-in") ? ["sign_in", "auth_signin_sub"] : location.startsWith("/sign-up") ? ["sign_up", "auth_signup_sub"] : ["detail_ref", "tagline"]);
    const title = location === "/" ? "VERIFY PAY | " + t("tagline") : `${t(keys[0] as TKey)} | VERIFY PAY`;
    const description = t(keys[1] as TKey);
    document.title = title;
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector(selector)?.setAttribute("content", title);
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector(selector)?.setAttribute("content", description);
    document.querySelector('meta[name="robots"]')?.setAttribute("content", location === "/" ? "index, follow" : "noindex, nofollow");
  }, [location, lang, t]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function inShell(C: () => ReactNode) {
  return function Wrapped() {
    return (
      <WorkspaceGate>
        <AppShell>
          <RoutedErrorBoundary>
            <C />
          </RoutedErrorBoundary>
        </AppShell>
      </WorkspaceGate>
    );
  };
}

// Initialize the demo cookie after Clerk has resolved identity, before mounting
// independent page queries. Otherwise concurrent first loads could create
// different demo workspaces and leave the UI holding another workspace's IDs.
function WorkspaceGate({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const { t } = useI18n();
  const profile = useGetProfile({ query: {
    queryKey: [...getGetProfileQueryKey(), user?.id ?? "demo-bootstrap"],
    enabled: isLoaded,
    staleTime: 30000,
  } });
  if (!isLoaded || profile.isLoading || !profile.data && !profile.isError) {
    return <div className="grid min-h-screen place-items-center bg-background text-foreground"><p role="status">{t("loading")}…</p></div>;
  }
  if (profile.isError) return <div className="mx-auto max-w-lg px-4 py-20"><ErrorState onRetry={() => profile.refetch()} /></div>;
  return children;
}

const R = {
  dashboard: inShell(DashboardPage),
  payments: inShell(Payments),
  paymentNew: inShell(PaymentNew),
  paymentDetail: inShell(PaymentDetail),
  upload: inShell(UploadPage),
  bank: inShell(Bank),
  history: inShell(History),
  reports: inShell(Reports),
  settings: inShell(SettingsPage),
};

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: t("auth_signin_title"), subtitle: t("auth_signin_sub") } },
        signUp: { start: { title: t("auth_signup_title"), subtitle: t("auth_signup_sub") } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <RouteMetadata />
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard" component={R.dashboard} />
            <Route path="/payments" component={R.payments} />
            <Route path="/payments/new" component={R.paymentNew} />
            <Route path="/payments/:id" component={R.paymentDetail} />
            <Route path="/upload" component={R.upload} />
            <Route path="/bank-transactions" component={R.bank} />
            <Route path="/history" component={R.history} />
            <Route path="/reports" component={R.reports} />
            <Route path="/settings" component={R.settings} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </I18nProvider>
  );
}

export default App;
