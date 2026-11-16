const verifyPaySupabaseProjectRef = "xvptcesvwoivwbxzbbin";

export function getDatabaseConnectionString(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.NODE_ENV !== "production" && env.SUPABASE_POSTGRES_URL) {
    let url: URL;

    try {
      url = new URL(env.SUPABASE_POSTGRES_URL);
    } catch {
      throw new Error("SUPABASE_POSTGRES_URL must be a PostgreSQL session-pooler URI.");
    }

    const username = decodeURIComponent(url.username);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname.endsWith(".pooler.supabase.com") ||
      url.port !== "5432" ||
      username !== `postgres.${verifyPaySupabaseProjectRef}`
    ) {
      throw new Error(
        "SUPABASE_POSTGRES_URL must target the configured VERIFY PAY Supabase session pooler.",
      );
    }

    // Require encrypted transport. pg v8 currently treats "require" as
    // verify-full unless libpq compatibility is enabled; Supabase's pooler
    // certificate therefore needs its CA bundle for certificate verification.
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("uselibpqcompat", "true");
    return url.toString();
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  return env.DATABASE_URL;
}
