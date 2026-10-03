// Edge proxy: /api/* → the central API Worker (service binding `API`), everything else is the
// Vite build in ./dist. Only /api/* reaches this code (`assets.run_worker_first`).
// The proxy (CSRF check, path limit, no cookies forwarded) lives in @tada/kit/proxy.
import { createApiProxy } from "@tada/kit/proxy";

// Least privilege: only the finance module of the API (and /health) is reachable through this host.
export default createApiProxy({ prefixes: ["/v1/finance/"] });
