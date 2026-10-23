import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceIconPath = path.join(projectRoot, "app", "icon.png");
const pwaOutputDir = path.join(projectRoot, "public", "pwa");

const androidResArg = process.argv.find((arg) =>
  arg.startsWith("--android-res-dir="),
);
const androidResDir = androidResArg
  ? androidResArg.slice("--android-res-dir=".length)
  : process.env.ANDROID_RES_DIR;

function createCircleMask(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white" />
    </svg>
  `);
}

async function writeWebp(size, outputPath) {
  await sharp(sourceIconPath)
    .resize(size, size)
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath);
}

async function writeMaskableWebp(size, outputPath) {
  const foreground = await sharp(sourceIconPath)
    .resize(Math.round(size * 0.82), Math.round(size * 0.82), {
      fit: "contain",
    })
    .webp({ quality: 88, effort: 6 })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#FBFAF6",
    },
  })
    .composite([
      {
        input: foreground,
        gravity: "center",
      },
    ])
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath);
}

async function writeAndroidIcons(resDir) {
  const densities = [
    { dir: "mipmap-mdpi", size: 48 },
    { dir: "mipmap-hdpi", size: 72 },
    { dir: "mipmap-xhdpi", size: 96 },
    { dir: "mipmap-xxhdpi", size: 144 },
    { dir: "mipmap-xxxhdpi", size: 192 },
  ];

  for (const density of densities) {
    const targetDir = path.join(resDir, density.dir);
    await mkdir(targetDir, { recursive: true });

    const squareBuffer = await sharp(sourceIconPath)
      .resize(density.size, density.size)
      .png()
      .toBuffer();

    await sharp(squareBuffer)
      .webp({ quality: 92 })
      .toFile(path.join(targetDir, "ic_launcher.webp"));

    await sharp(squareBuffer)
      .composite([
        {
          input: createCircleMask(density.size),
          blend: "dest-in",
        },
      ])
      .webp({ quality: 92 })
      .toFile(path.join(targetDir, "ic_launcher_round.webp"));
  }
}

await mkdir(pwaOutputDir, { recursive: true });

await Promise.all([
  writeWebp(192, path.join(pwaOutputDir, "icon-192x192.webp")),
  writeWebp(512, path.join(pwaOutputDir, "icon-512x512.webp")),
  writeWebp(180, path.join(pwaOutputDir, "apple-touch-icon.webp")),
  writeWebp(96, path.join(pwaOutputDir, "badge-96x96.webp")),
  writeMaskableWebp(512, path.join(pwaOutputDir, "icon-maskable-512x512.webp")),
]);

if (androidResDir) {
  await writeAndroidIcons(androidResDir);
}

console.log("Icons generated successfully.");
