import * as THREE from "three";

/** Draw a rounded rect path. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const numberCache = new Map<string, THREE.CanvasTexture>();

/** A squad-number badge: number on a team-coloured rounded square. Cached. */
export function numberTexture(
  num: number,
  bg: string,
  fg: string,
): THREE.CanvasTexture {
  const key = `${num}|${bg}|${fg}`;
  const cached = numberCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bg;
  roundRect(ctx, 10, 10, size - 20, size - 20, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.font = "bold 78px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), size / 2, size / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  numberCache.set(key, tex);
  return tex;
}

let ballTex: THREE.CanvasTexture | null = null;

/** Classic football look: white with a scattered black hexagon/pentagon pattern. */
export function ballTexture(): THREE.CanvasTexture {
  if (ballTex) return ballTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f6f6f6";
  ctx.fillRect(0, 0, size, size);

  // A grid of hexagons; a third filled black for the panel look.
  const R = 26;
  const w = Math.sqrt(3) * R;
  const h = 1.5 * R;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#cfcfcf";
  for (let row = -1; row * h < size + R; row++) {
    for (let col = -1; col * w < size + w; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0);
      const cy = row * h;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = cx + R * Math.cos(a);
        const py = cy + R * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if ((row * 3 + col * 5) % 4 === 0) {
        ctx.fillStyle = "#141414";
        ctx.fill();
      }
      ctx.stroke();
    }
  }

  ballTex = new THREE.CanvasTexture(canvas);
  ballTex.wrapS = ballTex.wrapT = THREE.RepeatWrapping;
  ballTex.repeat.set(2, 1);
  ballTex.anisotropy = 4;
  return ballTex;
}
