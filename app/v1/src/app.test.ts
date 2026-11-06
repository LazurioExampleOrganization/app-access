import { expect, test } from "bun:test";
import { GATEWAY_HEADERS } from "@lazurio/module-kit";
import { API_PATH, DESCRIPTION, type describe, handle, hostAllowed } from "./app.ts";

const loopback = new Set(["localhost", "127.0.0.1", "::1"]);
const HOST = "app-access.pilot.example.lazurio.io";
const ALENA = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const local = {
  LAZURIO_RUNTIME_LISTENER_APP_HOST: "127.0.0.1",
  LAZURIO_RUNTIME_LISTENER_APP_PORT: "25384",
};
const hosted = { ...local, LAZURIO_RUNTIME_LISTENER_APP_EXTERNAL_ORIGIN: `https://${HOST}` };
const through = (path: string, extra: Record<string, string> = {}) =>
  new Request(`https://${HOST}${path}`, { headers: { host: HOST, ...extra } });
const alena = (entry: string, role?: string) => ({
  [GATEWAY_HEADERS.subject]: ALENA,
  [GATEWAY_HEADERS.username]: "alena",
  [GATEWAY_HEADERS.entry]: entry,
  ...(role ? { [GATEWAY_HEADERS.appRole]: role } : {}),
});
const api = async (request: Request, env: Record<string, string>) => {
  const response = handle(request, env);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return (await response.json()) as Record<string, unknown> & {
    access: Record<string, unknown>;
    described: ReturnType<typeof describe>;
  };
};

test("the whole Environment: the person as an application admin", async () => {
  const body = await api(through(API_PATH, alena("environment")), hosted);
  expect(body.module).toBe(DESCRIPTION.module);
  expect(body.access).toMatchObject({
    entry: "environment",
    appRole: "admin",
    source: "gateway",
    reason: null,
  });
  expect(body.described).toMatchObject({
    person: "alena",
    subject: ALENA,
    appRole: "Application admin",
  });
});

test("this App only: the role Lazurio stated", async () => {
  const body = await api(through(API_PATH, alena("app", "user")), hosted);
  expect(body.access).toMatchObject({ entry: "app", appRole: "user" });
  expect(body.described.appRole).toBe("Application user");
});

test("through the gateway without a statement: no role, shown as such", async () => {
  const body = await api(through(API_PATH), hosted);
  expect(body.access).toMatchObject({ entry: "unknown", appRole: null, person: null });
  expect(body.described).toMatchObject({ person: null, appRole: "No application role" });
});

test("on a computer without a gateway: local, without a name", async () => {
  const body = await api(
    new Request("http://127.0.0.1:25384/api/who-came", { headers: alena("app", "user") }),
    local,
  );
  expect(body.access).toMatchObject({
    entry: "local",
    appRole: "admin",
    person: null,
    reason: "not-hosted",
  });
});

test("the page shows the answer and never trusts a forged name in HTML", async () => {
  const response = handle(
    through("/", { ...alena("environment"), [GATEWAY_HEADERS.username]: "<b>x</b>" }),
    hosted,
  );
  expect(response.headers.get("content-type")).toContain("text/html");
  const html = await response.text();
  expect(html).toContain('data-entry="environment"');
  expect(html).toContain('data-app-role="admin"');
  expect(html).toContain("Application admin");
  expect(html).not.toContain("<b>x</b>");
});

test("unknown routes and write methods are refused", () => {
  expect(handle(new Request("http://127.0.0.1/missing"), local).status).toBe(404);
  expect(handle(new Request("http://127.0.0.1/", { method: "POST" }), local).status).toBe(405);
});

test("only allowed hostnames pass the Host check", () => {
  const request = (host: string) => new Request("http://127.0.0.1/", { headers: { host } });
  expect(hostAllowed(request("127.0.0.1:4000"), loopback)).toBe(true);
  expect(hostAllowed(request("[::1]:4000"), loopback)).toBe(true);
  expect(hostAllowed(request("foreign.invalid"), loopback)).toBe(false);
  expect(hostAllowed(request("LOCALHOST:4000"), loopback)).toBe(true);
});
