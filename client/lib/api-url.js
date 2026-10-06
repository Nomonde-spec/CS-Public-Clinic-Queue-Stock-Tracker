export function resolveApiBaseUrl(envValue, fallback = "http://127.0.0.1:3001") {
  const configured = String(envValue ?? "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  return String(fallback ?? "http://127.0.0.1:3001").trim().replace(/\/+$/, "");
}
