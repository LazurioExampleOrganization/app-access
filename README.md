# App access

Module `app-access` of `LazurioExampleOrganization`: one page that shows who
came to this App through Lazurio and with which application role, the answer
of `appAccess` of `@lazurio/module-kit` (Lazurio decision 0231; Lazurio Module
Standard, section "Who came and with which role"). It is the reference for a
Module that tells people apart, and the page Alena and Bob open on Ring 0 to
check the contract. A `bun-service` on `Bun.serve`, TypeScript strict, no
framework, no data.

## What it shows

| Entry | Application role | When |
| --- | --- | --- |
| The whole Environment | Application admin | the person has the whole Environment where the App runs |
| This App only | Application admin or user | the App was shared with them, with the role the Organization gave |
| From inside the Environment | Application admin, no name | a computer without a gateway, a sibling, a script or an agent, the Environment browser's local entry |
| Lazurio did not say who came | No role | through the gateway without a valid statement |

`GET /` renders it as a page; `GET /api/who-came` returns the same answer as
JSON for agents. Both read it per request on the server and are never cached.

## Structure

- `lazurio.module.json`: the Module's identity, lease `main` from the
  Organization's pool, `apps[]` and `default_app`.
- `app/v1/`: the App. `src/server.ts` reads the listener through
  `@lazurio/module-kit`, refuses a foreign `Host` and closes on `SIGTERM`;
  `src/app.ts` handles the requests and reads `appAccess`.
- `.github/workflows/check.yml`: CI with `bun install --frozen-lockfile`,
  `bun run check` and `bun test`.

## Development

```sh
cd app/v1
bun install --frozen-lockfile
bun run check   # tsc --noEmit + biome
bun test        # unit tests and the start contract
```

The Launchpad starts it: `lazurio module start LazurioExampleOrganization/app-access --json`,
then open `result.runtime.url`. A manual start needs the listener variables
only (the port is lease `main` in `lazurio.module.json`):

```sh
LAZURIO_RUNTIME_LISTENER_APP_HOST=127.0.0.1 LAZURIO_RUNTIME_LISTENER_APP_PORT=<port> bun run dev
```

Started this way, without a gateway, every request is `local`.
