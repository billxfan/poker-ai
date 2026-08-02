import type { PresentationEvent } from "../core/presentation";

export type CharacterGesture =
  "check" | "call" | "raise" | "all-in" | "fold" | "win" | "loss";

export type CharacterPerformance = {
  eventId: string;
  gesture: CharacterGesture;
  durationMs: number;
  actionLabel?: string;
};

const ACTION_DURATIONS: Record<
  Exclude<CharacterGesture, "win" | "loss">,
  number
> = {
  check: 360,
  call: 460,
  raise: 680,
  "all-in": 1_050,
  fold: 680,
};

export function performancesForEvent(
  event: PresentationEvent,
): Record<number, CharacterPerformance> {
  if (event.kind === "action") {
    return {
      [event.seatId]: {
        eventId: event.id,
        gesture: event.action,
        durationMs: ACTION_DURATIONS[event.action],
        actionLabel:
          event.label ??
          (event.action === "check"
            ? "过牌"
            : event.action === "fold"
              ? "弃牌"
              : event.action === "all-in"
                ? `全下 ${event.amount}`
                : event.action === "call"
                  ? `跟注 ${event.amount}`
                  : `加注 ${event.amount}`),
      },
    };
  }
  if (event.kind !== "result") return {};

  return Object.fromEntries(
    Object.entries(event.netBySeat)
      .map(([seatId, net]) => [Number(seatId), net] as const)
      .filter(([, net]) => net !== 0)
      .map(([seatId, net]) => [
        seatId,
        {
          eventId: `${event.id}:${seatId}`,
          gesture: net > 0 ? "win" : "loss",
          durationMs: net > 0 ? 1_650 : 1_350,
        } satisfies CharacterPerformance,
      ]),
  );
}

export function characterGestureLabel(gesture: CharacterGesture): string {
  const labels: Record<CharacterGesture, string> = {
    check: "轻敲桌面，选择过牌",
    call: "将跟注筹码推入桌面",
    raise: "向前推筹码并完成加注",
    "all-in": "把全部筹码推入底池",
    fold: "收回身体并弃牌",
    win: "收拢筹码，庆祝获胜",
    loss: "放低姿态，接受结果",
  };
  return labels[gesture];
}
