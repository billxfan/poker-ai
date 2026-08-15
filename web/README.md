# Poker AI Web

An offline-first, single-player Texas Hold'em web game. Play a six-handed table
against five local AI opponents without an account or backend.

## MVP scope

- Six-handed no-limit Texas Hold'em
- Five local AI opponents
- Fold, check/call, raise, and all-in actions
- Hand settlement and action history
- Equity-aware AI decisions with recency-weighted opponent modeling and bounded persona tilt
- Continuous automatic Bot rebuys tracked as statistics rather than permanent strategy pressure
- Local history, opponent profiles, and accessible poker-stat explanations
- Offline game sounds with a persistent mute control
- Device-local autosave
- Responsive desktop and mobile table
- No sign-in, multiplayer, real money, ads, or cloud sync

## Local development

```bash
npm install
npm run dev
```

Run the production verification:

```bash
npm test
```

## Docker / NAS

Docker is a deployment form of this Web client, not a separate game codebase.
Its packaging files live under `deploy/docker/` and do not include `ios/`.

From the repository root, build and start the Web game:

```bash
docker compose -f deploy/docker/compose.yaml up -d --build
```

Open `http://<NAS-IP>:3000`. Set `POKER_AI_PORT` to publish a different host
port. See `deploy/docker/README.md` for all NAS deployment commands.

Game progress and settings remain in each visitor's browser storage. The
container has no database volume, user accounts, or cross-device sync.

## Other clients

The Steam/Electron delivery shell is intentionally isolated in
[`../desktop-steam/`](../desktop-steam/). This package remains the Web/PWA client.
