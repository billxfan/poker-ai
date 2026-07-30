"use client";

export type GameSound =
  | "deal"
  | "check"
  | "fold"
  | "chips"
  | "all-in"
  | "turn"
  | "win"
  | "lose"
  | "ui";

const SOUND_PREFERENCE_KEY = "poker-ai-web/sound-enabled";
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return null;
  }
  audioContext ??= new window.AudioContext();
  return audioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  offset: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + offset;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

export function loadSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function saveSoundPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  } catch {
    // Sound still works for this page even if local storage is unavailable.
  }
}

export function unlockGameAudio(enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (context?.state === "suspended") {
    void context.resume();
  }
}

export function playGameSound(sound: GameSound, enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  switch (sound) {
    case "deal":
      [0, 0.055, 0.11].forEach((offset, index) =>
        tone(context, 520 + index * 55, offset, 0.055, 0.022, "triangle"),
      );
      break;
    case "check":
      tone(context, 420, 0, 0.055, 0.026, "triangle");
      break;
    case "fold":
      tone(context, 260, 0, 0.07, 0.024, "triangle");
      tone(context, 190, 0.055, 0.09, 0.018, "triangle");
      break;
    case "chips":
      tone(context, 630, 0, 0.055, 0.03, "square");
      tone(context, 820, 0.055, 0.065, 0.024, "square");
      break;
    case "all-in":
      [330, 440, 660].forEach((frequency, index) =>
        tone(context, frequency, index * 0.07, 0.13, 0.032, "triangle"),
      );
      break;
    case "turn":
      tone(context, 740, 0, 0.12, 0.026, "sine");
      tone(context, 990, 0.09, 0.18, 0.024, "sine");
      break;
    case "win":
      [523, 659, 784, 1047].forEach((frequency, index) =>
        tone(context, frequency, index * 0.09, 0.22, 0.032, "sine"),
      );
      break;
    case "lose":
      [392, 330, 262].forEach((frequency, index) =>
        tone(context, frequency, index * 0.11, 0.2, 0.025, "triangle"),
      );
      break;
    case "ui":
      tone(context, 560, 0, 0.06, 0.022, "sine");
      break;
  }
}
