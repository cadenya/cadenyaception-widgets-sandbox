export function allowedRequestOrigin(request: Request): string | null {
  const allowed = new Set([
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
    "https://widgets-demo.cadenya.com",
    ...(process.env.CADENYA_ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean),
  ]);
  // Only trust configured origins and Vercel's own deployment environment.
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) allowed.add(`https://${host}`);
  }
  const origin = request.headers.get("origin");
  if (!origin || !allowed.has(origin)) return null;
  if (process.env.NODE_ENV === "production" && isLoopback(new URL(origin).hostname)) return null;
  return origin;
}

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "[::1]" || /^127\./.test(hostname);
}

// Separate the widget's hostname policy from CORS; production never accepts
// development tokens, even if localhost remains in a shared origin allowlist.
export function turnstileHostname(origin: string): string | null {
  const hostname = new URL(origin).hostname;
  const production = process.env.NODE_ENV === "production";
  const defaults = production ? "widgets-demo.cadenya.com" : "localhost,widgets-demo.cadenya.com";
  const allowed = (process.env.TURNSTILE_HOSTNAMES?.trim() || defaults).split(",").map(value => value.trim()).filter(Boolean);
  return allowed.includes(hostname) && !(production && isLoopback(hostname)) ? hostname : null;
}
