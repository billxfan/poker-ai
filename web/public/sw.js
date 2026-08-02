const CACHE_NAME = "poker-ai-web-v7-oval-cat-table";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/poker-ai-icon.png",
  "/characters/v3/golden-player-back.webp",
  "/characters/v3/british-left-side.webp",
  "/characters/v3/siamese-far-left.webp",
  "/characters/v3/maine-coon-far-center.webp",
  "/characters/v3/orange-far-right.webp",
  "/characters/v3/abyssinian-right-side.webp",
  "/characters/portraits/golden-player.webp",
  "/characters/portraits/british-shorthair.webp",
  "/characters/portraits/siamese.webp",
  "/characters/portraits/maine-coon.webp",
  "/characters/portraits/orange-tabby.webp",
  "/characters/portraits/abyssinian.webp",
];
const CARD_SUITS = ["spades", "hearts", "diamonds", "clubs"];
const CARD_RANKS = ["a", "k", "q", "j", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const CAT_CARD_DECK = CARD_SUITS.flatMap((suit) =>
  CARD_RANKS.map((rank) => `/cards/deck-v2/${suit}-${rank}.webp`),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...APP_SHELL, ...CAT_CARD_DECK])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
