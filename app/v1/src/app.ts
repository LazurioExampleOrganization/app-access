/** Request handling of App access, free of the listener so it has unit tests.
 *
 * The App shows who came to it through Lazurio and with which application role,
 * the answer of `appAccess` of @lazurio/module-kit (Lazurio decision 0231;
 * Lazurio Module Standard, "Who came and with which role"). It is the reference
 * for Modules that tell people apart: read the answer on the server for every
 * request and never trust anything the browser says about the person. */
import { type AppAccess, appAccess } from "@lazurio/module-kit";

export const HEALTH_PATH = "/healthz";
export const API_PATH = "/api/who-came";

export const DESCRIPTION = {
  module: "app-access",
  organization: "LazurioExampleOrganization",
  title: "App access",
};

type Environment = Readonly<Record<string, string | undefined>>;

/** Hostnames the service answers; `allowedHosts()` of module-kit gives loopback
 * plus the external origin of a hosted listener. Anything else is refused. */
export function hostAllowed(request: Request, hosts: ReadonlySet<string>): boolean {
  const header = request.headers.get("host");
  if (header === null) return false;
  let hostname: string;
  try {
    hostname = new URL(`http://${header}`).hostname;
  } catch {
    return false;
  }
  return hosts.has(hostname.replace(/^\[(.*)\]$/, "$1").replace(/\.$/, ""));
}

const ENTRY: Record<AppAccess["entry"], string> = {
  environment: "The whole Environment where this App runs",
  app: "This App only, shared with them",
  local: "From inside the Environment (no gateway in between)",
  unknown: "Lazurio did not say who came",
};

const REASON: Record<string, string> = {
  "not-hosted": "No gateway stands in front of this App, for example on a person's own computer.",
  "not-through-gateway":
    "The request came to a loopback address: a sibling Module, a script or an agent.",
  "local-entry":
    "The request came through the Environment browser's local entry, which signs nobody in.",
  "no-identity":
    "The request came through the gateway without a valid statement, so it gets no role.",
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The answer as a person reads it. */
export function describe(access: AppAccess) {
  return {
    person: access.person
      ? (access.person.username ?? "a Lazurio account without a username")
      : null,
    subject: access.person?.subject ?? null,
    entry: ENTRY[access.entry],
    appRole:
      access.appRole === "admin"
        ? "Application admin"
        : access.appRole === "user"
          ? "Application user"
          : "No application role",
    source: access.source,
    reason: access.reason === null ? null : (REASON[access.reason] ?? access.reason),
  };
}

function page(access: AppAccess): string {
  const view = describe(access);
  const rows: [string, string][] = [
    ["Person", view.person ?? "Nobody named"],
    ["Lazurio subject", view.subject ?? "–"],
    ["Entry", view.entry],
    ["Application role", view.appRole],
    ["Stated by", view.source ?? "–"],
    ...(view.reason ? ([["Why", view.reason]] as [string, string][]) : []),
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>App access · LazurioExampleOrganization</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:2rem;max-width:44rem;color:#0f172a}
h1{font-size:1.5rem;margin:0 0 .25rem}p.lead{color:#475569;margin:0 0 1.5rem}
dl{display:grid;grid-template-columns:12rem 1fr;gap:.5rem 1rem;margin:0 0 1.5rem}
dt{color:#475569}dd{margin:0;font-weight:600}
code{font-size:.9em}
</style>
</head>
<body>
<h1>Who came</h1>
<p class="lead">Who opened this App through Lazurio, how, and with which application role.</p>
<dl data-entry="${escapeHtml(access.entry)}" data-app-role="${escapeHtml(access.appRole ?? "none")}">
${rows.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`).join("\n")}
</dl>
<p>The server reads this on every request with <code>appAccess</code> of <code>@lazurio/module-kit</code>. What an application admin and an application user may do is this Organization's rule in the Module's code, enforced on the server; Lazurio only says who came and with which role. Agents read the same answer at <code>${API_PATH}</code>.</p>
</body>
</html>
`;
}

export function handle(request: Request, env: Environment = process.env): Response {
  const { pathname } = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  }
  // Read per request, never cached: another account on the next request is
  // that person (Module Standard, "Who came and with which role").
  const noStore = { "cache-control": "no-store" };
  if (pathname === "/") {
    return new Response(page(appAccess(request, "app", env)), {
      headers: { "content-type": "text/html; charset=utf-8", ...noStore },
    });
  }
  if (pathname === API_PATH) {
    const access = appAccess(request, "app", env);
    return Response.json(
      { ...DESCRIPTION, access, described: describe(access) },
      { headers: noStore },
    );
  }
  return Response.json({ error: "not_found" }, { status: 404 });
}
