"use client";

import type { PresentationEvent } from "../core/presentation";

export type GameSound =
  | "deal"
  | "check"
  | "call"
  | "raise"
  | "fold"
  | "all-in"
  | "flop"
  | "street-turn"
  | "river"
  | "showdown"
  | "pot-award"
  | "your-turn"
  | "win"
  | "lose"
  | "ui";

const SOUND_PREFERENCE_KEY = "poker-ai-web/sound-enabled";
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
const playedEventIds = new Set<string>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return null;
  }
  audioContext ??= new window.AudioContext();
  return audioContext;
}

function destination(context: AudioContext): AudioNode {
  if (!compressor || !masterGain) {
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;
    masterGain = context.createGain();
    masterGain.gain.value = 0.78;
    masterGain.connect(compressor);
    compressor.connect(context.destination);
  }
  return masterGain;
}

function variantFromKey(key: string): number {
  let hash = 2_166_136_261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 3;
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
  gain.connect(destination(context));
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function cardSlide(context: AudioContext, offset: number, accent = false) {
  const duration = 0.052;
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / frameCount;
    samples[index] = (Math.random() * 2 - 1) * (1 - progress) ** 1.8;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + offset;

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(accent ? 1850 : 1450, start);
  filter.Q.setValueAtTime(0.78, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.052 : 0.04, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination(context));
  source.start(start);

  tone(
    context,
    accent ? 430 : 350,
    offset + 0.018,
    0.034,
    accent ? 0.013 : 0.009,
    "triangle",
  );
}

function chipClack(
  context: AudioContext,
  offset: number,
  weight = 1,
  pitch = 1,
) {
  tone(context, 1_080 * pitch, offset, 0.028, 0.018 * weight, "square");
  tone(
    context,
    620 * pitch,
    offset + 0.009,
    0.04,
    0.014 * weight,
    "triangle",
  );
}

function tableTap(context: AudioContext, offset: number) {
  tone(context, 185, offset, 0.045, 0.025, "triangle");
  tone(context, 96, offset + 0.012, 0.055, 0.012, "sine");
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

export function playDealSequence(
  cardCount: number,
  enabled: boolean,
  spacingSeconds = 0.062,
) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const count = Math.min(12, Math.max(1, Math.floor(cardCount)));
  for (let index = 0; index < count; index += 1) {
    cardSlide(context, index * spacingSeconds, index === count - 1);
  }
}

export function playGameSound(sound: GameSound, enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const variation = 0;
  const pitch = 1 + (variation - 1) * 0.025;
  switch (sound) {
    case "deal":
      cardSlide(context, 0, true);
      break;
    case "check":
      tableTap(context, 0);
      tableTap(context, 0.085);
      break;
    case "call":
      chipClack(context, 0, 0.9, pitch);
      chipClack(context, 0.055, 0.78, pitch * 1.03);
      break;
    case "raise":
      [0, 0.042, 0.086, 0.135].forEach((offset, index) =>
        chipClack(
          context,
          offset,
          0.92 - index * 0.08,
          pitch * (1 + index * 0.025),
        ),
      );
      tone(context, 520 * pitch, 0.03, 0.17, 0.016, "triangle");
      break;
    case "fold":
      cardSlide(context, 0, false);
      tone(context, 260, 0, 0.07, 0.024, "triangle");
      tone(context, 190, 0.055, 0.09, 0.018, "triangle");
      break;
    case "all-in":
      [0, 0.032, 0.065, 0.1, 0.138, 0.18].forEach((offset, index) =>
        chipClack(context, offset, 1 - index * 0.06, 0.94 + index * 0.025),
      );
      [330, 440, 660].forEach((frequency, index) =>
        tone(context, frequency, index * 0.085, 0.16, 0.024, "triangle"),
      );
      break;
    case "flop":
      [0, 0.065, 0.13].forEach((offset, index) =>
        cardSlide(context, offset, index === 2),
      );
      tone(context, 300, 0.19, 0.13, 0.018, "sine");
      break;
    case "street-turn":
      cardSlide(context, 0, true);
      tone(context, 410, 0.055, 0.12, 0.022, "triangle");
      break;
    case "river":
      cardSlide(context, 0, true);
      tone(context, 330, 0.04, 0.12, 0.024, "triangle");
      tone(context, 660, 0.1, 0.15, 0.015, "sine");
      break;
    case "showdown":
      cardSlide(context, 0, true);
      cardSlide(context, 0.085, true);
      [260, 390, 520].forEach((frequency, index) =>
        tone(context, frequency, index * 0.07, 0.16, 0.02, "sine"),
      );
      break;
    case "pot-award":
      [0, 0.035, 0.075, 0.12, 0.17].forEach((offset, index) =>
        chipClack(
          context,
          offset,
          0.86 - index * 0.07,
          1.08 - index * 0.035,
        ),
      );
      break;
    case "your-turn":
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

export function playGameEventSound(
  eventId: string,
  sound: GameSound,
  enabled: boolean,
) {
  if (!enabled || playedEventIds.has(eventId)) return;
  playedEventIds.add(eventId);
  if (playedEventIds.size > 256) {
    const oldest = playedEventIds.values().next().value;
    if (oldest) playedEventIds.delete(oldest);
  }
  const variation = variantFromKey(eventId);
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const pitch = 1 + (variation - 1) * 0.025;

  if (sound === "call") {
    chipClack(context, 0, 0.9, pitch);
    chipClack(context, 0.055, 0.78, pitch * 1.03);
    return;
  }
  if (sound === "raise") {
    [0, 0.042, 0.086, 0.135].forEach((offset, index) =>
      chipClack(
        context,
        offset,
        0.92 - index * 0.08,
        pitch * (1 + index * 0.025),
      ),
    );
    tone(context, 520 * pitch, 0.03, 0.17, 0.016, "triangle");
    return;
  }
  playGameSound(sound, true);
}

export function resetGameAudioEvents() {
  playedEventIds.clear();
}

export function gameSoundsForPresentationEvent(
  event: PresentationEvent,
): GameSound[] {
  if (event.kind === "deal") return ["deal"];
  if (event.kind === "your-turn") return ["your-turn"];
  if (event.kind === "street") {
    return [
      event.street === "flop"
        ? "flop"
        : event.street === "turn"
          ? "street-turn"
          : "river",
    ];
  }
  if (event.kind === "action") {
    return [
      event.action === "raise"
        ? "raise"
        : event.action === "all-in"
          ? "all-in"
          : event.action,
    ];
  }
  return [
    ...(event.showdown ? (["showdown"] as const) : []),
    "pot-award",
    event.humanDelta > 0 ? "win" : "lose",
  ];
}
