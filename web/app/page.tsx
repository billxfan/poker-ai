import type { Metadata } from "next";
import { PokerGame } from "./PokerGame";

export const metadata: Metadata = {
  title: { absolute: "德扑 AI 训练器" },
  description: "无需登录的离线德州扑克 AI 训练桌。",
};

export default function Home() {
  return <PokerGame />;
}
