const fs = require("node:fs");
const path = require("node:path");
const { createCanvas } = require("canvas");

const outputDir = path.join(process.cwd(), "public", "pwa");
fs.mkdirSync(outputDir, { recursive: true });

function createIcon(size, type) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const isAdmin = type === "admin";

  ctx.fillStyle = isAdmin ? "#111111" : "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (!isAdmin) {
    ctx.strokeStyle = "#d6b36a";
    ctx.lineWidth = size * 0.025;
    ctx.strokeRect(size * 0.055, size * 0.055, size * 0.89, size * 0.89);
  }

  const gold = ctx.createLinearGradient(0, size * 0.2, size, size * 0.8);
  gold.addColorStop(0, "#f2da99");
  gold.addColorStop(0.5, "#d6b36a");
  gold.addColorStop(1, "#9b7435");

  ctx.fillStyle = gold;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(size * 0.48)}px Arial, sans-serif`;
  ctx.fillText("W", size / 2, size * 0.43);

  ctx.fillStyle = isAdmin ? "#ffffff" : "#18181b";
  ctx.font = `700 ${Math.round(size * (isAdmin ? 0.09 : 0.065))}px Arial, sans-serif`;
  ctx.letterSpacing = `${Math.round(size * 0.008)}px`;
  ctx.fillText(isAdmin ? "ADMIN" : "VERANSTALTER", size / 2, size * 0.76);

  fs.writeFileSync(path.join(outputDir, `${type}-${size}.png`), canvas.toBuffer("image/png"));
}

for (const size of [192, 512]) {
  createIcon(size, "admin");
  createIcon(size, "veranstalter");
}
