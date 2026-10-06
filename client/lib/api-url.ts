export function resolveApiBaseUrl(envValue?: string, origin?: string) {
  const configured = (envValue ?? "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  return (origin ?? "").trim().replace(/\/+$/, "");
}
