# Prompt Library App Deployment and Storage Checklist

Date: 2026-04-29

Status: Manual checklist for deployment-options decision support

## Purpose

Use this checklist before treating a deployment mode as acceptable for Prompt Library App v2 prototype work. The goal is to verify that static hosting choices do not hide storage-origin surprises, break JSON backup workflows, or weaken the `v1-stable` rollback path.

Do not deploy as part of this checklist unless a separate deployment decision has already been made.

## 1. Local localhost testing

Suggested context:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

- [ ] App loads without console errors that block normal use.
- [ ] Asset paths work for `index.html`, `styles.css`, `app.js`, `prompt-model.js`, and `storage-adapter.js`.
- [ ] Browser storage behavior is understood for the `http://localhost:8000` origin.
- [ ] Existing `localStorage` and any future IndexedDB data are treated as local to this localhost origin.
- [ ] JSON export downloads a valid backup file.
- [ ] JSON import/restore can restore the exported file in the same browser origin.
- [ ] Data does not unexpectedly cross into `file://`, another localhost port, another browser profile, or another browser.
- [ ] The `v1-stable` rollback path remains usable from a local checkout.
- [ ] A v1-compatible JSON export/import path remains available or explicitly documented as pending before relying on v2 data.

## 2. LAN testing from another device

Suggested context:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Open `http://<development-machine-lan-ip>:8000/` from another device on the same network.

- [ ] App loads from the LAN URL on the second device.
- [ ] Asset paths work when the app is loaded through the LAN host/IP origin.
- [ ] Browser storage behavior is understood for the LAN origin.
- [ ] LAN data is expected to be separate from `http://localhost:8000`, `file://`, and future hosted origins.
- [ ] JSON export works from the second device.
- [ ] JSON import/restore works on the second device from a known backup file.
- [ ] Data does not unexpectedly appear across devices unless it was moved through JSON import or a future explicit sync feature.
- [ ] The `v1-stable` rollback path remains usable locally even if LAN testing finds v2 issues.
- [ ] Any browser permission differences between localhost and LAN HTTP are noted before using LAN results as release evidence.

## 3. Future hosted preview, such as GitHub Pages

Suggested context:

```text
https://<owner>.github.io/<repo>/
```

Only use this section after a separate decision enables a hosted static preview.

- [ ] App loads from the hosted preview URL.
- [ ] Asset paths work from the hosted project subpath, not only from `/`.
- [ ] Browser storage behavior is understood for the hosted HTTPS origin.
- [ ] Hosted-preview localStorage and any future IndexedDB data are expected to be separate from localhost, LAN, `file://`, and other domains.
- [ ] JSON export works from the hosted preview.
- [ ] JSON import/restore works into the hosted preview from a known backup file.
- [ ] Data does not unexpectedly cross browser origins, accounts, branches, preview URLs, or custom domains.
- [ ] The deployment source branch or folder is documented before the preview is shared.
- [ ] The `v1-stable` rollback path remains usable from local checkout and the `v1.0.0` tag.
- [ ] A v1-compatible restore path is verified before encouraging users to move important prompt data into a hosted v2 preview.

## Rollback Notes

- `v1-stable` and `v1.0.0` are the known-good localStorage-only rollback anchors.
- JSON export/import is the manual data transfer and recovery path between origins.
- Browser storage is origin-scoped. Treat each protocol, host, port, path-hosting choice, browser, and profile as a separate storage context unless proven otherwise.
- A hosted preview should not be treated as sync, backup, or multi-device support by itself.
