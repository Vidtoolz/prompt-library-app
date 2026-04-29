# Prompt Library App v2 Deployment Options

Date: 2026-04-29

Issue: EKA-18

Status: Proposed for v2 prototype planning

## Context

Prompt Library App v1.0.0 is a static browser app with no build step. It stores prompt data in browser `localStorage` under `prompt-shelf-state-v1` and uses JSON export/import for backup and transfer.

V2 planning recommends a hybrid local-primary sync architecture: local browser storage first, optional authenticated sync later, and JSON export/import retained as the escape hatch. Deployment should preserve that local-first shape. The first deployment decision should not force backend hosting, account sign-in, or a build pipeline before the v2 storage and sync prototype proves itself.

`v1-stable` and the `v1.0.0` tag are the fallback anchors. Any v2 deployment path should leave the v1 static app recoverable.

## Goals

- Keep local use as the default development and fallback path.
- Allow easy manual testing in a browser without a build step.
- Support sharing the static app later without changing the app architecture.
- Avoid deploying backend or sync infrastructure until the v2 prototype needs it.
- Keep rollback simple through `v1-stable`, `v1.0.0`, and JSON backup/import.

## Options Compared

| Option | Fit now | Strengths | Risks | Best use |
| --- | --- | --- | --- | --- |
| Static local app | Best | No deploy step, no hosting cost, preserves privacy and fallback behavior | Each browser origin has separate data; sharing requires manual files or local server | Default v1 and v2 prototype path |
| GitHub Pages | Good later | Simple static hosting from the repo, easy public preview, no server to manage | Public URL, origin change creates separate browser storage, care needed around branch/path selection | First hosted preview when sharing is needed |
| Local network hosting | Good for testing | Tests phone/tablet/second device on same network, no public deploy | LAN-only, machine must stay running, HTTP/browser permission differences | Manual multi-device and responsive smoke testing |
| Lightweight VPS/static host | Later | More control over headers, domains, redirects, and future backend adjacency | Operational overhead, security/patching if server-managed | Later custom domain or production-like hosting |
| Keep `v1-stable` fallback | Required | Known-good static app remains recoverable | Requires discipline not to rewrite fallback assumptions | Rollback and data recovery safety net |

## Option Notes

### Static local app

This is the best current fit. The app already runs from local files or with:

```sh
python3 -m http.server 8000
```

Local static use keeps the app independent of hosting, auth, sync configuration, and network availability. It also makes v2 storage work easier to validate because IndexedDB or localStorage behavior can be tested before any remote sync layer exists.

Recommended default:

- Continue treating local static hosting as the source of truth for v2 prototype testing.
- Prefer `http://localhost:8000` over direct `file://` when testing clipboard, import, storage, or browser permission behavior.
- Keep JSON export/import working independently of any future hosted environment.

### GitHub Pages

GitHub Pages is the lowest-friction hosted option once a public preview is useful. It matches the current no-build static shape and can serve `index.html`, `app.js`, `prompt-model.js`, `storage-adapter.js`, `styles.css`, and browser test pages directly.

Risks to handle before enabling:

- The hosted origin will not share local browser data with `localhost` or `file://`.
- If served from a project path, relative asset paths must remain path-safe.
- A public Pages URL should not imply that sync, account backup, or multi-device merge is production-ready.
- Deployment source should be explicit, such as a dedicated branch or selected docs/build folder, to avoid accidentally publishing unstable experiments.

Best first use:

- A public or private preview of the static app after local checks pass.
- Not a replacement for `v1-stable`.

### Local network hosting

Local network hosting is useful before any public deploy. It can test the current static app from another device on the same network by serving the repository from the development machine and opening the machine's LAN address.

Recommended use:

- Responsive checks on phones and tablets.
- Manual browser smoke testing on a second machine.
- Early two-device sync experiments before choosing public hosting.

Constraints:

- This is not durable hosting.
- Browser security behavior can differ between `localhost`, LAN HTTP, and HTTPS.
- The same app on a LAN URL uses a different storage origin than `localhost`.

### Lightweight VPS or Static Host

A lightweight VPS, Caddy/Nginx static site, Netlify, Vercel, Firebase Hosting, or Cloudflare Pages can all host the current app shape. These become more relevant when the project needs a custom domain, HTTPS control, deploy previews, headers, or closer pairing with the chosen sync backend.

For the near-term v2 prototype, this is premature unless GitHub Pages lacks a required capability.

Use later when:

- A custom domain is needed.
- HTTPS behavior must match a production-like environment.
- Service worker, OPFS, or browser storage experiments need specific headers.
- Firebase Hosting is selected to keep Auth, Firestore, Hosting, and deployment in one project.

Avoid for now:

- Running a general-purpose server only to host the static v1/v2 prototype.
- Adding a build/deploy pipeline before there is a clear deployment requirement.

### `v1-stable` fallback

The fallback is part of the deployment plan, not a separate concern.

Required guardrails:

- Keep `v1-stable` and `v1.0.0` available as the known-good localStorage-only app.
- Do not require auth, cloud configuration, or deployed services to recover prompt data through v1.
- Keep a v1-compatible export path in v2 planning so users can move useful prompt data back to the stable app if needed.
- Before any hosted v2 preview is treated as recommended, verify that rollback to the static v1 app and JSON import/export still works.

## Recommendation

Use a staged local-first deployment path:

1. Keep the current static local app as the primary v2 prototype deployment mode.
2. Use local network hosting for manual second-device and responsive testing.
3. Add GitHub Pages only when a shareable static preview is needed.
4. Consider Firebase Hosting, Cloudflare Pages, Netlify, Vercel, or a lightweight VPS later, after the sync/backend choice creates a concrete hosting requirement.
5. Keep `v1-stable` and `v1.0.0` as the rollback path throughout v2.

This keeps deployment aligned with the product architecture. The app remains usable locally first, v2 can prove IndexedDB/sync behavior without premature infrastructure, and hosted previews can be added without changing the core static app.

## Minimum Next Steps Before Any Deploy

- Document the exact hosted source branch or folder before enabling GitHub Pages or another static host.
- Add a short manual checklist for local, LAN, and hosted-origin data behavior.
- Confirm asset paths work from both `/` and a project subpath.
- Confirm JSON export/import still works across origins.
- Confirm `v1-stable` can still be checked out and run locally.

## Deployment Decision for V2 Prototype

Do not deploy yet.

For the next v2 prototype phase, the recommended deployment option is:

```text
Primary: static local app served from the repo.
Testing: local network hosting when another device is needed.
First hosted preview: GitHub Pages, only after local checks and a clear preview need.
Fallback: v1-stable / v1.0.0 static app.
```
