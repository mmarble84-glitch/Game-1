/**
 * Procedural holographic textures for the globe — generated in-browser so ORBIS
 * needs zero committed binary assets and renders fully offline.
 *
 * These are purely cosmetic. They produce a THREE.CanvasTexture; no game state.
 */

import * as THREE from 'three';

/**
 * Build a dark "holographic" earth surface: deep-space gradient with a faint
 * cyan latitude/longitude grid. The glowing country polygons (drawn by
 * react-globe.gl on top) supply the actual landmasses, so the sphere underneath
 * only needs to read as a subtly-lit hologram.
 */
export function makeHolographicEarthTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Vertical gradient: darker at poles, faint glow at the equator.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#050a14');
  grad.addColorStop(0.5, '#0a1a30');
  grad.addColorStop(1.0, '#050a14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Faint graticule grid (meridians + parallels) for the war-room hologram feel.
  ctx.strokeStyle = 'rgba(54, 224, 255, 0.10)';
  ctx.lineWidth = 1;
  const meridians = 24; // every 15° lng
  const parallels = 12; // every 15° lat
  for (let i = 1; i < meridians; i++) {
    const x = (i / meridians) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 1; j < parallels; j++) {
    const y = (j / parallels) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Brighter equator + prime-meridian lines.
  ctx.strokeStyle = 'rgba(54, 224, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Build a tiling starfield data URL for the scene background — scattered faint
 * stars on the deep-space color.
 */
export function makeStarfieldDataUrl(): string {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#05080f';
  ctx.fillRect(0, 0, size, size);

  // Deterministic-ish scatter of stars at varying brightness.
  const stars = 480;
  for (let i = 0; i < stars; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.3 + 0.2;
    const a = Math.random() * 0.6 + 0.15;
    ctx.fillStyle = `rgba(207, 232, 255, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}
