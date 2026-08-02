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
