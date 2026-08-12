# Adversarial Review — Steam Desktop Implementation — 2026-08-09

> Status: ⚠️ 待优化。This is development-candidate evidence, not a release approval.

## Scope

Electron main process, custom protocol adapter, packaged build contents, desktop
smoke test and end-to-end test.

## Dynamic review

| Question | Operation | Evidence and conclusion |
|---|---|---|
| Can an XSS reach Node, IPC or the filesystem? | CHALLENGE | No preload or IPC bridge is shipped. Node integration is disabled, context isolation and Chromium sandboxing are enabled, and Electron E2E observes both `process` and `require` as unavailable. |
| Can a crafted URL escape the client directory? | SURFACE | The resolver rejects invalid encoding, null bytes and paths outside the client root. Dedicated traversal and route-handler tests pass. |
| Can content navigate to or silently contact the Internet? | CONNECT | Permission requests, downloads, new windows and external navigation are denied. The full home-to-table E2E records zero HTTP(S) requests. |
| Is persistence accidentally tied to a transient origin? | CHALLENGE | The application uses the stable `poker-ai://app` origin. A two-launch smoke test writes local storage on the first launch and reads the same value on the second. |
| Does the shipping archive include development-only code? | SURFACE | The final macOS and Windows `app.asar` archives contain only the three desktop runtime modules and package metadata; the Web production output is a separate packaged resource. Test harnesses and `node_modules` are excluded. |
| Does cross-building prove Windows compatibility? | CHALLENGE | No. It proves that a Windows x64 executable and resource layout can be produced. Native Windows launch, graphics, installer and Steam-client behavior remain release gates. |

## Verdict

**Pass for a desktop development candidate.** No Critical or High implementation
issue remains in the reviewed scope. Public Steam release remains conditional on
native Windows validation, signing, Steamworks configuration and asset-rights
evidence.
