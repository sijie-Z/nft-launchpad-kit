/**
 * Environment variable validation.
 * Call `validateEnv()` at app startup to catch missing config early.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { name: "DATABASE_URL", required: true, description: "Database connection string" },
  { name: "ALCHEMY_API_KEY", required: true, description: "Alchemy RPC API key" },
  { name: "SIGNER_PRIVATE_KEY", required: false, description: "Trusted signer key for /api/signature" },
  { name: "ETHERSCAN_API_KEY", required: false, description: "Etherscan contract verification" },
];

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    if (!value || value.trim() === "") {
      if (v.required) {
        missing.push(`${v.name} — ${v.description}`);
      } else {
        warnings.push(`${v.name} — ${v.description}`);
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Returns a human-readable startup config summary.
 */
export function getEnvSummary(): string {
  const lines: string[] = ["[ENV] Configuration check:"];
  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    const status = value && value.trim() !== "" ? "OK" : v.required ? "MISSING" : "not set";
    lines.push(`  ${v.name}: ${status}`);
  }
  return lines.join("\n");
}
