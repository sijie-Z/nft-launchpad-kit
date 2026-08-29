// @ts-check
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  const rootEnvPath = path.resolve(__dirname, "../../.env");
  const localEnvPath = path.resolve(__dirname, ".env");
  dotenv.config({ path: rootEnvPath });
  dotenv.config({ path: localEnvPath });
}

// Alchemy keys must come from environment variables only — never hardcode them here.
const alchemyApiKey = process.env.ALCHEMY_API_KEY || "";
const alchemyGasPolicyId = process.env.ALCHEMY_GAS_POLICY_ID || "";

if (!alchemyApiKey) {
  console.warn(
    "[next.config] ALCHEMY_API_KEY is not set. RPC calls against Alchemy will fail. " +
      "Copy ../../.env.example to ../../.env and fill in the value."
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  env: {
    // Alchemy config (server-side only) — empty string when unset, never a baked-in default
    ALCHEMY_GAS_POLICY_ID: alchemyGasPolicyId,
    ALCHEMY_API_KEY: alchemyApiKey,
  },
};

export default nextConfig;
