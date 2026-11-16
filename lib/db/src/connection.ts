const verifyPaySupabaseProjectRef = "xvptcesvwoivwbxzbbin";

export interface DatabaseConnectionOptions {
  connectionString: string;
  ssl?: {
    rejectUnauthorized: true;
    ca: string;
  };
}

export function getDatabaseConnectionOptions(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionOptions {
  const useSupabase =
    Boolean(env.SUPABASE_POSTGRES_URL) &&
    (env.NODE_ENV !== "production" || env.VERCEL === "1");

  if (useSupabase) {
    let url: URL;

    try {
      url = new URL(env.SUPABASE_POSTGRES_URL!);
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

    if (env.VERCEL === "1") {
      const ca = env.SUPABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
      if (!ca) {
        throw new Error(
          "SUPABASE_CA_CERT is required for verified TLS when running on Vercel.",
        );
      }

      // Use Node's TLS verification rather than pg's compatibility mode, which
      // only encrypts the connection and does not verify the pooler certificate.
      url.searchParams.delete("sslmode");
      url.searchParams.delete("uselibpqcompat");
      return {
        connectionString: url.toString(),
        ssl: { rejectUnauthorized: true, ca },
      };
    }

    // Existing Replit development uses encrypted transport. The pooler CA has
    // not been installed in this environment, so certificate verification is
    // intentionally deferred there; Vercel production requires the CA above.
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("uselibpqcompat", "true");
    return { connectionString: url.toString() };
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  return { connectionString: env.DATABASE_URL };
}

export function getDatabaseConnectionString(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return getDatabaseConnectionOptions(env).connectionString;
}
