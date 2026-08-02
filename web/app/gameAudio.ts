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
  | "win-medium"
  | "win-big"
  | "lose"
  | "ui";

const SOUND_PREFERENCE_KEY = "poker-ai-web/sound-enabled";
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let ambienceSource: AudioBufferSourceNode | null = null;
let ambienceGain: GainNode | null = null;
const playedEventIds = new Set<string>();

function getAudioContext(): AudioContext | null {
  if (
    typeof window === "undefined" ||
    typeof window.AudioContext === "undefined"
  ) {
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
  return (hash >>> 0) % 5;
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

function seededNoise(index: number, variation: number) {
  const value =
    Math.sin((index + 1) * (12.9898 + variation * 4.1414)) * 43_758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function cardSlide(
  context: AudioContext,
  offset: number,
  accent = false,
  variation = 0,
  duration = 0.092,
) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / frameCount;
    samples[index] = seededNoise(index, variation) * (1 - progress) ** 1.8;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + offset;

  filter.type = "bandpass";
  const timbre = 1 + (variation - 2) * 0.045;
  filter.frequency.setValueAtTime((accent ? 1850 : 1450) * timbre, start);
  filter.frequency.exponentialRampToValueAtTime(
    (accent ? 1_150 : 820) * timbre,
    start + duration,
  );
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
    (accent ? 430 : 350) * timbre,
    offset + 0.018,
    Math.min(0.065, duration * 0.7),
    accent ? 0.013 : 0.009,
    "triangle",
  );
}

function cardFlip(context: AudioContext, offset: number, variation = 0) {
  cardSlide(context, offset, true, variation, 0.075);
  cardSlide(context, offset + 0.055, false, (variation + 2) % 5, 0.055);
  tone(
    context,
    510 * (1 + (variation - 2) * 0.035),
    offset + 0.046,
    0.07,
    0.012,
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
  tone(context, 620 * pitch, offset + 0.009, 0.04, 0.014 * weight, "triangle");
}

function chipSlide(
  context: AudioContext,
  offset: number,
  duration = 0.18,
  variation = 0,
) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / frameCount;
    samples[index] =
      seededNoise(index, variation + 11) *
      Math.sin(Math.PI * progress) *
      (0.72 - progress * 0.32);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + offset;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(620 + variation * 55, start);
  filter.frequency.exponentialRampToValueAtTime(
    1_050 + variation * 70,
    start + duration,
  );
  filter.Q.value = 0.65;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.016, start + duration * 0.22);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination(context));
  source.start(start);
}

function tableTap(context: AudioContext, offset: number, pitch = 1) {
  tone(context, 185 * pitch, offset, 0.045, 0.025, "triangle");
  tone(context, 96 * pitch, offset + 0.012, 0.055, 0.012, "sine");
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

export function syncTableAmbience(enabled: boolean) {
  if (!enabled) {
    if (ambienceGain && audioContext) {
      ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
      ambienceGain.gain.setValueAtTime(
        Math.max(0.0001, ambienceGain.gain.value),
        audioContext.currentTime,
      );
      ambienceGain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.18,
      );
    }
    const source = ambienceSource;
    ambienceSource = null;
    ambienceGain = null;
    if (source && audioContext) {
      window.setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Source may already have stopped during a rapid toggle.
        }
      }, 210);
    }
    return;
  }

  if (ambienceSource) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const duration = 3.2;
  const frameCount = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let brown = 0;
  for (let index = 0; index < frameCount; index += 1) {
    const white = seededNoise(index, 7);
    brown = (brown + 0.018 * white) / 1.018;
    samples[index] = brown * 0.42;
  }

  const source = context.createBufferSource();
  const lowpass = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 680;
  lowpass.Q.value = 0.55;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.013, context.currentTime + 0.5);
  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination(context));
  source.start();
  ambienceSource = source;
  ambienceGain = gain;
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
  eventKey = "deal-sequence",
) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const count = Math.min(12, Math.max(1, Math.floor(cardCount)));
  const baseVariation = variantFromKey(eventKey);
  for (let index = 0; index < count; index += 1) {
    cardSlide(
      context,
      index * spacingSeconds,
      index === count - 1,
      (baseVariation + index) % 5,
    );
  }
}

export function playGameSound(
  sound: GameSound,
  enabled: boolean,
  variation = 0,
) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const pitch = 1 + (variation - 2) * 0.022;
  const stagger = 1 + (variation - 2) * 0.025;
  switch (sound) {
    case "deal":
      cardSlide(context, 0, true, variation);
      break;
    case "check":
      tableTap(context, 0, pitch);
      tableTap(context, 0.14 * stagger, pitch * 0.985);
      tone(context, 128 * pitch, 0.025, 0.22, 0.008, "sine");
      break;
    case "call":
      chipSlide(context, 0, 0.15, variation);
      chipClack(context, 0.125, 0.9, pitch);
      chipClack(context, 0.185, 0.78, pitch * 1.03);
      break;
    case "raise":
      chipSlide(context, 0, 0.25, variation);
      [0.18, 0.235, 0.295, 0.365].forEach((offset, index) =>
        chipClack(
          context,
          offset,
          0.92 - index * 0.08,
          pitch * (1 + index * 0.025),
        ),
      );
      tone(context, 520 * pitch, 0.16, 0.32, 0.014, "triangle");
      break;
    case "fold":
      cardSlide(context, 0, false, variation, 0.24);
      cardSlide(context, 0.075, false, (variation + 1) % 5, 0.16);
      tone(context, 250 * pitch, 0.04, 0.15, 0.018, "triangle");
      tone(context, 178 * pitch, 0.17 * stagger, 0.18, 0.012, "triangle");
      break;
    case "all-in":
      chipSlide(context, 0, 0.32, variation);
      [0.2, 0.255, 0.315, 0.38, 0.45, 0.525].forEach((offset, index) =>
        chipClack(
          context,
          offset * stagger,
          1 - index * 0.06,
          pitch * (0.94 + index * 0.025),
        ),
      );
      [330, 440, 660].forEach((frequency, index) =>
        tone(
          context,
          frequency * pitch,
          (0.12 + index * 0.12) * stagger,
          0.28,
          0.024,
          "triangle",
        ),
      );
      break;
    case "flop":
      [0, 0.105, 0.21].forEach((offset, index) =>
        cardFlip(context, offset * stagger, (variation + index) % 5),
      );
      tone(context, 300 * pitch, 0.29 * stagger, 0.16, 0.015, "sine");
      break;
    case "street-turn":
      cardFlip(context, 0, variation);
      tone(context, 410 * pitch, 0.095 * stagger, 0.14, 0.018, "triangle");
      break;
    case "river":
      cardFlip(context, 0, variation);
      tone(context, 330 * pitch, 0.075 * stagger, 0.15, 0.02, "triangle");
      tone(context, 660 * pitch, 0.15 * stagger, 0.2, 0.013, "sine");
      break;
    case "showdown":
      cardFlip(context, 0, variation);
      cardFlip(context, 0.13 * stagger, (variation + 1) % 5);
      [260, 390, 520].forEach((frequency, index) =>
        tone(
          context,
          frequency * pitch,
          index * 0.07 * stagger,
          0.16,
          0.02,
          "sine",
        ),
      );
      break;
    case "pot-award":
      chipSlide(context, 0, 0.22, variation);
      [0.14, 0.19, 0.245, 0.31, 0.38].forEach((offset, index) =>
        chipClack(
          context,
          offset * stagger,
          0.86 - index * 0.07,
          pitch * (1.08 - index * 0.035),
        ),
      );
      break;
    case "your-turn":
      tone(context, 740 * pitch, 0, 0.08, 0.024, "sine");
      tone(context, 990 * pitch, 0.075 * stagger, 0.1, 0.021, "sine");
      break;
    case "win":
      [523, 659, 784, 1047].forEach((frequency, index) =>
        tone(
          context,
          frequency * pitch,
          index * 0.09 * stagger,
          0.22,
          0.032,
          "sine",
        ),
      );
      break;
    case "win-medium":
      [523, 659, 784, 988, 1175, 1319].forEach((frequency, index) =>
        tone(
          context,
          frequency * pitch,
          index * 0.115 * stagger,
          0.3,
          index < 4 ? 0.03 : 0.022,
          index % 2 === 0 ? "sine" : "triangle",
        ),
      );
      break;
    case "win-big":
      [392, 523, 659, 784, 988, 1175, 1319, 1568].forEach((frequency, index) =>
        tone(
          context,
          frequency * pitch,
          index * 0.14 * stagger,
          index === 7 ? 0.55 : 0.34,
          index < 5 ? 0.032 : 0.024,
          index % 3 === 0 ? "triangle" : "sine",
        ),
      );
      break;
    case "lose":
      [392, 330, 262].forEach((frequency, index) =>
        tone(
          context,
          frequency * pitch,
          index * 0.11 * stagger,
          0.2,
          0.025,
          "triangle",
        ),
      );
      break;
    case "ui":
      tone(context, 560 * pitch, 0, 0.06, 0.022, "sine");
      break;
  }
}

export function outcomeSoundForHumanDelta(humanDelta: number): GameSound {
  if (humanDelta <= 0) return "lose";
  if (humanDelta >= 800) return "win-big";
  if (humanDelta >= 240) return "win-medium";
  return "win";
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
  playGameSound(sound, true, variantFromKey(eventId));
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
    outcomeSoundForHumanDelta(event.humanDelta),
  ];
}
