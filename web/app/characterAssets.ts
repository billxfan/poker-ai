export const AVATAR_SOURCES: Readonly<Record<number, string>> = {
  0: "/characters/portraits/golden-player.webp",
  1: "/characters/portraits/british-shorthair.webp",
  2: "/characters/portraits/siamese.webp",
  3: "/characters/portraits/maine-coon.webp",
  4: "/characters/portraits/orange-tabby.webp",
  5: "/characters/portraits/abyssinian.webp",
};

export const AI_PROFILE_AVATAR_SOURCES = Object.freeze(
  [1, 2, 3, 4, 5].map((seatId) => AVATAR_SOURCES[seatId]),
);
