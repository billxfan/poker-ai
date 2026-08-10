import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "德扑 AI 训练器",
    template: "%s · 德扑 AI 训练器",
  },
  description: "离线优先的开源单机德州扑克 AI 训练游戏。",
  applicationName: "德扑 AI 训练器",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/poker-ai-icon.png",
    shortcut: "/poker-ai-icon.png",
    apple: "/poker-ai-icon.png",
  },
  openGraph: {
    title: "德扑 AI 训练器",
    description: "无需登录，随时离线开一桌的德州扑克 AI 训练游戏。",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#080D0C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
