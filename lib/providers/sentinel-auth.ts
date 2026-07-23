/**
 * Sentinel Hub OAuth2 token management (server-only).
 *
 * Sentinel Hub authenticates with OAuth2 client_credentials. Tokens are
 * Bearer, embedded with an `exp` claim, and TOKEN REQUESTS ARE RATE LIMITED -
 * requesting a fresh token on every call returns HTTP 429. So we cache a token
 * module-wide and reuse it until it nears expiry, refreshing lazily.
 *
 * CLIENT_ID / CLIENT_SECRET are read from the environment and NEVER leave the
 * server - the client only ever sees our own /api/tiles/... proxy URL.
 *
 * Endpoints default to the Copernicus Data Space Ecosystem (CDSE), where free
 * Sentinel-2 OAuth clients are created (User settings -> OAuth clients). If you
 * hold a classic Sentinel Hub account instead, override the three SENTINEL_*_URL
 * vars in .env.local (see .env.local.example).
 */

// CDSE by default; classic Sentinel Hub accounts override via env.
const TOKEN_URL =
  process.env.SENTINEL_TOKEN_URL ??
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

/**
 * Sentinel Hub API base. CDSE accounts use sh.dataspace.copernicus.eu; classic
 * SH accounts use services.sentinel-hub.com. WMS + Process/statistics endpoints
 * are derived from this.
 */
export const SENTINEL_API_BASE =
  process.env.SENTINEL_API_BASE ??
  "https://sh.dataspace.copernicus.eu";

const clientId = process.env.SENTINEL_CLIENT_ID ?? "";
const clientSecret = process.env.SENTINEL_SECRET ?? "";

/** Cached token + the wall-clock ms it expires at. */
type CachedToken = { token: string; expiresAtMs: number };
let cached: CachedToken | null = null;
let inFlight: Promise<string> | null = null;

/** True only when credentials are configured. Used by the registry to gate. */
export function hasSentinelCredentials(): boolean {
  return clientId.length > 0 && clientSecret.length > 0;
}

/**
 * Decode the `exp` (seconds since epoch) from a JWT without verifying - we
 * trust Sentinel Hub to have signed it; we only use the expiry locally to
 * decide when to refresh. Falls back to a conservative TTL if malformed.
 */
function expFromJwt(jwt: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** A valid, non-expired Sentinel Hub Bearer token. Refreshes when within 60s of expiry. */
export async function getSentinelToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAtMs - now > 60_000) {
    return cached.token;
  }

  // Coalesce concurrent requests into one token fetch (avoid 429 bursts).
  if (inFlight) return inFlight;
  inFlight = fetchToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Sentinel Hub auth failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data = (await res.json()) as { access_token: string };
  const expiresAtMs = expFromJwt(data.access_token) || Date.now() + 10 * 60_000;
  cached = { token: data.access_token, expiresAtMs };
  return data.access_token;
}

/** Force the next call to re-authenticate (e.g. after a 401 from the tile API). */
export function invalidateSentinelToken(): void {
  cached = null;
}
