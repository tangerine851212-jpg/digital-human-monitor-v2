import type { Metadata, Viewport } from "next";
import "./globals.css";

import { NavigationProgressProvider } from "@/components/navigation-progress";

export const metadata: Metadata = {
  metadataBase: new URL("https://digital-human.xn--876a.net"),
  title: "安智伴 家人连线台",
  description: "随时了解长辈的近况，查看留言、使用动态，给长辈写问候。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: {
      url: "/app-icon.webp",
      sizes: "512x512",
      type: "image/webp",
    },
    apple: [
      {
        url: "/pwa/apple-touch-icon.webp",
        sizes: "180x180",
        type: "image/webp",
      },
    ],
    shortcut: "/app-icon.webp",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "安智伴 家人连线台",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F1E8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <NavigationProgressProvider>{children}</NavigationProgressProvider>
      </body>
    </html>
  );
}
