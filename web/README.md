# Poker AI Web

An offline-first, single-player Texas Hold'em web game. Play a six-handed table
against five local AI opponents without an account or backend.

## MVP scope

- Six-handed no-limit Texas Hold'em
- Five local AI opponents
- Fold, check/call, raise, and all-in actions
- Hand settlement and action history
- Staged AI turn pacing and automatic AI rebuys between hands
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

From the repository root, build and start the web game:

```bash
docker compose up -d --build
```

Open `http://<NAS-IP>:3000`. Set `POKER_AI_PORT` to publish a different host
port, for example `POKER_AI_PORT=8080 docker compose up -d --build`.

Game progress and settings remain in each visitor's browser storage. The
container has no database volume, user accounts, or cross-device sync.

## Desktop / Steam candidate

The Electron shell runs the same production build from the stable local origin
`poker-ai://app`. It opens no local server port and exposes no Node or filesystem
API to the game renderer.

```bash
# Build and run the desktop game
npm run desktop

# Headless startup assertion used by CI/local verification
npm run desktop:smoke

# Electron player flow and security assertions
npm run desktop:e2e

# Create an unpacked build for the current platform
npm run desktop:pack

# Cross-build an unpacked Windows x64 candidate
npm run desktop:pack:win
```

Create the Windows x64 NSIS installer on Windows, or from the documented
Wine-enabled electron-builder environment:

```bash
npm run desktop:dist:win
```

Unsigned local packages are development artifacts. Sign the release executable
before publishing a public Steam depot.
