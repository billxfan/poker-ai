# Steam Windows Release Checklist

## Implemented in the repository

- [x] Electron main process and stable packaged application origin
- [x] Sandboxed renderer with Node integration disabled
- [x] External navigation, new windows, downloads and permissions denied
- [x] Packaged Vinext worker and client asset adapter
- [x] Windows x64 NSIS target and deterministic product identifiers
- [x] Unit tests for origin, path containment and renderer privileges
- [x] Desktop startup smoke command
- [x] Production dependency audit with zero known vulnerabilities

## Required before a public Steam depot

- [ ] Run the Windows installer on a clean Windows 10/11 x64 machine
- [ ] Verify first launch, offline relaunch and save persistence
- [ ] Verify 1920×1080, 2560×1440 and 1366×768 window layouts
- [ ] Verify keyboard shortcuts, Chinese IME coexistence and audio device changes
- [ ] Code-sign the executable and installer
- [ ] Create Steam AppID, depot and launch option for `PokerAITrainer.exe`
- [ ] Complete the Steam generative-AI content disclosure for shipped artwork
- [ ] Archive artwork provenance and commercial-use evidence
- [ ] Upload required capsules, library artwork and gameplay-only screenshots
- [ ] Test installation and launch through a private Steam branch
