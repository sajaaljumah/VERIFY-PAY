import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn("inline-flex rounded-full p-0.5 text-xs font-bold", dark ? "bg-white/10" : "bg-card ring-1 ring-border")}
    >
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          data-testid={`button-lang-${l}`}
          className={cn(
            "rounded-full px-3 py-1 transition",
            lang === l
              ? "bg-[hsl(var(--orange))] text-white shadow-sm"
              : dark ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l === "en" ? "EN" : "عربي"}
        </button>
      ))}
    </div>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} dir="ltr">
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill={dark ? "#F5F7FA" : "#101B35"} />
        <path d="M17 20h9l6 17 6-17h9L36 46h-8z" fill={dark ? "#101B35" : "#F5F7FA"} />
        <circle cx="47" cy="44" r="6" fill="#F36B3F" />
      </svg>
      <span className={cn("text-[0.95rem] font-extrabold tracking-[0.14em]", dark ? "text-white" : "text-foreground")}>
        VERIFY<span className="text-[hsl(var(--orange))]"> PAY</span>
      </span>
    </span>
  );
}
