# Poker AI Desktop / Steam

## Status

This delivery target is **pending optimization** and must not be described as a
public-release-ready Steam build until every unchecked release gate is closed.

## Boundaries

- Keep Electron runtime, packaging, desktop-only tests and release notes here.
- Keep poker rules, AI, UI, assets and browser persistence in `../web/`.
- Do not duplicate or fork game logic inside this folder.
- Do not modify `../ios/` for desktop work.
- Keep the renderer sandboxed with Node integration disabled and no preload or
  IPC bridge unless a reviewed requirement explicitly needs one.

## Verification

- `npm test`
- `npm run smoke`
- `npm run e2e`
- Native Windows acceptance remains mandatory before public Steam release.
