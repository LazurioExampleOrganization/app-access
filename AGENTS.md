# App access: rules for agents

Module `app-access` of `LazurioExampleOrganization`, created with
`lazurio module create` (stack `bun-service`). It keeps the Lazurio Module
Standard from its first commit; keep it that way. This Organization works in
English.

## What it is for

It shows who came to the App through Lazurio and with which application role
(application admin or application user, Lazurio decision 0231), read with
`appAccess` of `@lazurio/module-kit`. It is the reference for other Modules
and the page Alena and Bob open on Ring 0 to check the contract.

- Read the answer only through `appAccess`, on the server, for every request.
  Never read the gateway's headers yourself and never take a name or a role
  from the browser.
- `unknown` means no role. `local` means a request from inside the Environment.
- Admin and user never stand alone: say "application admin" or "application
  user", never just "admin", so nobody confuses them with the Organization
  Admin.

## Scope

- This repository is one Module: `lazurio.module.json` at the root; the App
  lives in `app/v<N>/`.
- The slot, Teams and access are held by `modules.manifest.json` of the
  Organization's root repository; a change of them is a separate pull request
  there, not here.
- One task worktree, one branch, one pull request. The primary checkout stays
  on `main`.

## Standard

- `dev` starts one server process and nothing else.
- Host and port come only from `LAZURIO_RUNTIME_LISTENER_<ID>_HOST` and `_PORT`
  (through `@lazurio/module-kit`); without them the App exits with code 2. The
  port belongs only in `lazurio.module.json`.
- No `.env*` files, no secrets in the repository, no imports from outside it.

## Before a pull request

```sh
lazurio module setup <path to the Module> --root <Lazurio root> --json
```

The expected state is `current`. `README.md` lists the App's commands.
