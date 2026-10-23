import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "安智伴 家人连线台",
    short_name: "安智伴 家人连线台",
    description: "随时了解长辈的近况，查看留言、使用动态，给长辈写问候。",
    start_url: "/",
    display: "standalone",
    background_color: "#f6eee1",
    theme_color: "#FBFAF6",
    lang: "zh-CN",
    categories: ["utilities", "lifestyle", "health"],
    icons: [
      {
        src: "/pwa/icon-192x192.webp",
        sizes: "192x192",
        type: "image/webp",
      },
      {
        src: "/pwa/icon-512x512.webp",
        sizes: "512x512",
        type: "image/webp",
      },
      {
        src: "/pwa/icon-maskable-512x512.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "maskable",
      },
    ],
  };
}
