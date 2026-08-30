/**
 * Next.js instrumentation — runs once when the server starts.
 * Validates required environment variables so misconfiguration fails fast
 * with a clear message instead of failing later in opaque ways.
 * (Wired up per the env.ts design — it was previously only tested, never called.)
 */
export async function register() {
  const { validateEnv } = await import("./lib/env");
  const result = validateEnv();

  if (result.valid) {
    if (result.warnings.length > 0) {
      console.warn("[env] optional vars missing: " + result.warnings.join(", "));
    }
    return;
  }

  const msg = "[env] Missing required vars: " + result.missing.join(", ") + ". Copy .env.example to .env and fill them in.";
  if (process.env.NODE_ENV === "production") {
    throw new Error(msg); // fail fast in production
  }
  console.error(msg); // warn loudly in development
}
