// Edge proxy: /api/* → the central API Worker (service binding `API`), everything else is the
// Vite build in ./dist. Only /api/* reaches this code (`assets.run_worker_first`).
//
// Why: the browser then talks to this hostname only, so one Cloudflare Access login covers the
// app and its API calls (no second login, no cross-origin cookies). The API still verifies
// the Access JWT itself — this proxy adds no identity, it only forwards what Access attached.

/** @param {Request} request @param {{ API: Fetcher, ASSETS: Fetcher, API_PUBLIC_URL: string }} env */
async function handle(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

  // Least privilege: once this app is shared, strangers hold a valid Access JWT for this host, so
  // only forward what the app itself calls (the API still checks every request on its own).
  const path = url.pathname.slice("/api".length);
  if (path !== "/health" && !path.startsWith("/v1/finance/")) {
    return Response.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }

  // Keep the API's public origin in the URL so it builds correct absolute links (e.g. media).
  const target = new URL(url.pathname.slice("/api".length) || "/", env.API_PUBLIC_URL);
  target.search = url.search;

  const headers = new Headers(request.headers);
  headers.delete("Cookie"); // the API authenticates with the Cf-Access-Jwt-Assertion header only

  return env.API.fetch(
    new Request(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    }),
  );
}

export default { fetch: handle };
