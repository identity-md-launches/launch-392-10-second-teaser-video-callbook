// Draw the price-touch shot as 80 RGB frames and pipe them to FFmpeg.
// Only Node's standard library is used.
const { spawn } = require('child_process');

const W = 1280, H = 720, FPS = 24, FRAMES = 80;
const ffmpeg = process.argv[2];
const output = process.argv[3];
if (!ffmpeg || !output) throw new Error('usage: node render_chart.js FFMPEG OUTPUT');

const base = Buffer.alloc(W * H * 3);
function pixelOffset(x, y) { return (y * W + x) * 3; }
function mix(buffer, x, y, color, alpha) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H || alpha <= 0) return;
  const i = pixelOffset(x, y), a = Math.min(1, alpha);
  buffer[i] = Math.round(buffer[i] * (1 - a) + color[0] * a);
  buffer[i + 1] = Math.round(buffer[i + 1] * (1 - a) + color[1] * a);
  buffer[i + 2] = Math.round(buffer[i + 2] * (1 - a) + color[2] * a);
}
function dot(buffer, cx, cy, radius, color, alpha) {
  const x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(W - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(H - 1, Math.ceil(cy + radius));
  const rr = radius * radius;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d2 = (x - cx) ** 2 + (y - cy) ** 2;
    if (d2 < rr) mix(buffer, x, y, color, alpha * Math.pow(1 - d2 / rr, 1.6));
  }
}
function stroke(buffer, a, b, radius, color, alpha) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.ceil(len / Math.max(1.5, radius * 0.42));
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    dot(buffer, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, radius, color, alpha);
  }
}

// Navy chart surface, gentle center light, grid, and dotted target line.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = pixelOffset(x, y);
  const center = Math.max(0, 1 - Math.hypot((x - 610) / 1000, (y - 280) / 850));
  const vignette = Math.max(0, 1 - 0.28 * Math.hypot((x - 640) / 640, (y - 360) / 360));
  base[i] = Math.round((9 + 7 * center) * vignette);
  base[i + 1] = Math.round((20 + 13 * center) * vignette);
  base[i + 2] = Math.round((32 + 18 * center) * vignette);
}
for (let x = 114; x <= 1164; x += 105) {
  for (let y = 102; y < 626; y++) mix(base, x, y, [75, 116, 129], 0.17);
}
for (let y = 102; y <= 626; y += 87) {
  for (let x = 114; x <= 1164; x++) mix(base, x, y, [75, 116, 129], 0.17);
}
for (let x = 115; x <= 1165; x++) {
  const a = x % 25 < 10 ? 0.55 : 0;
  mix(base, x, 250, [154, 206, 193], a);
  mix(base, x, 251, [119, 178, 164], a * 0.45);
}
// Low-contrast bars behind the glowing line add chart depth.
const bars = [494, 459, 476, 424, 405, 433, 374, 358, 392, 342, 316, 281, 298, 267];
for (let j = 0; j < bars.length; j++) {
  const x = 158 + j * 66, y = bars[j];
  for (let yy = y - 24; yy <= y + 30; yy++) mix(base, x, yy, [55, 122, 111], 0.16);
  for (let yy = y - 12; yy <= y + 12; yy++) for (let xx = x - 6; xx <= x + 6; xx++) mix(base, xx, yy, [53, 147, 113], 0.15);
}

const path = [[135, 551], [235, 510], [332, 521], [453, 435], [543, 447],
              [655, 369], [742, 389], [846, 309], [925, 328], [1030, 250]];
const lengths = [];
let total = 0;
for (let i = 1; i < path.length; i++) {
  const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  lengths.push(l); total += l;
}
const mint = [63, 207, 127]; // #3fcf7f exactly at the bright core
const light = [203, 255, 221];
function priceLine(buffer, distance) {
  let done = 0, end = path[0];
  for (let i = 1; i < path.length && done < distance; i++) {
    const use = Math.min(lengths[i - 1], distance - done);
    const a = path[i - 1], b = path[i];
    end = [a[0] + (b[0] - a[0]) * use / lengths[i - 1], a[1] + (b[1] - a[1]) * use / lengths[i - 1]];
    stroke(buffer, a, end, 18, mint, 0.11);
    stroke(buffer, a, end, 7, mint, 0.38);
    stroke(buffer, a, end, 3.3, mint, 0.94);
    stroke(buffer, a, end, 1.4, light, 0.48);
    done += use;
  }
  dot(buffer, end[0], end[1], 21, mint, 0.20);
  dot(buffer, end[0], end[1], 7, mint, 0.75);
  dot(buffer, end[0], end[1], 2.5, light, 0.85);
}
function check(buffer, opacity) {
  const a = [1009, 219], b = [1032, 241], c = [1081, 185];
  for (const [u, v] of [[a, b], [b, c]]) {
    stroke(buffer, u, v, 25, mint, opacity * 0.18);
    stroke(buffer, u, v, 12, mint, opacity * 0.35);
    stroke(buffer, u, v, 5, mint, opacity);
    stroke(buffer, u, v, 2, light, opacity * 0.65);
  }
}

const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo',
  '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-frames:v', String(FRAMES), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
  '-pix_fmt', 'yuv420p', output], { stdio: ['pipe', 'inherit', 'inherit'] });
child.on('error', e => { throw e; });
(async () => {
  for (let f = 0; f < FRAMES; f++) {
    const t = f / FPS;
    const buffer = Buffer.from(base);
    // Ease the reveal into the target at 2.16 seconds.
    const u = Math.max(0, Math.min(1, (t - 0.08) / 2.08));
    const reveal = 1 - (1 - u) ** 2;
    priceLine(buffer, total * reveal);
    if (u >= 0.999) {
      const flash = t < 2.43 ? (0.72 + 0.28 * Math.sin((t - 2.16) * 48)) : 1;
      check(buffer, flash);
      dot(buffer, 1030, 250, 42, mint, t < 2.53 ? 0.13 : 0.05);
    }
    if (!child.stdin.write(buffer)) await new Promise(resolve => child.stdin.once('drain', resolve));
  }
  child.stdin.end();
})();
child.on('close', code => { if (code) process.exit(code); });
