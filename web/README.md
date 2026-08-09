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

## Desktop / Steam candidate

The Electron shell runs the same production build from the stable local origin
`poker-ai://app`. It opens no local server port and exposes no Node or filesystem
API to the game renderer.

```bash
# Build and run the desktop game
npm run desktop

# Headless startup assertion used by CI/local verification
npm run desktop:smoke

# Create an unpacked build for the current platform
npm run desktop:pack
```

Create the Windows x64 NSIS installer on Windows, or from the documented
Wine-enabled electron-builder environment:

```bash
npm run desktop:dist:win
```

Unsigned local packages are development artifacts. Sign the release executable
before publishing a public Steam depot.
