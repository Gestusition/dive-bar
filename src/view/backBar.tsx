import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ingredients } from '../game/content';
import { lathePoints, smoothProfile, type Profile } from './liquid';
import { barReflections } from './barTools';
import { bottleLength, bottleLook, liquidColor, liquidOpacity, paintLabel } from './DrinkStage';

// The bottles on the shelves behind the bar, the same bottles a hand takes for a pour. Nobody
// moves them, so what is in them is painted on: two merged meshes, drawn in two calls.
const shelves = [1.45, 2.12];
const perShelf = 13;
const spacing = 0.38,
  firstX = -2.3,
  shelfZ = -4.01,
  shelfTop = 0.065,
  scale = 0.86;
const columns = 8,
  rowsOfLabels = 4,
  cellW = 256,
  cellH = 160;
const shelved = ingredients.filter(
  (i) =>
    ['spirit', 'liqueur', 'vermouth', 'sweetener', 'bitters'].includes(i.kind ?? '') &&
    i.unit !== 'piece' &&
    i.unit !== 'pinch',
);
function tinted(geometry: THREE.BufferGeometry, color: (y: number) => THREE.Color) {
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const c = color(position.getY(i));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
function buildShelves() {
  const bodies: THREE.BufferGeometry[] = [];
  const labels: THREE.BufferGeometry[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = cellW * columns;
  canvas.height = cellH * rowsOfLabels;
  const paint = canvas.getContext('2d')!;
  const steel = new THREE.Color('#c9cfd4');
  shelves.forEach((shelfY, row) => {
    for (let i = 0; i < perShelf; i++) {
      const id = shelved[(i * 3 + row * 5) % shelved.length].id;
      const look = bottleLook(id);
      const outer: Profile = smoothProfile(look.profile, 7);
      const length = bottleLength(look);
      // Some nearly full and some nearly out, as on any back bar.
      const fill = length * (0.42 + (((i * 7 + row * 3) % 5) / 5) * 0.34);
      // On a dim shelf the wall shows through glass: clear spirits read dark, not white,
      // and it is the highlights down each bottle that say it is glass.
      const shadow = new THREE.Color('#3a2a22');
      const liquid = new THREE.Color(liquidColor(id)).lerp(
        shadow,
        liquidOpacity(id) < 0.5 ? 0.62 : 0.14,
      );
      const glass = liquid.clone().lerp(shadow, 0.6);
      const body = new THREE.LatheGeometry(lathePoints([[0, 0], ...outer, [0, length]]), 28);
      tinted(body, (y) => (y < fill ? liquid : glass));
      const cap = new THREE.CylinderGeometry(0.031, 0.034, 0.07, 16);
      cap.translate(0, length + 0.018, 0);
      tinted(cap, () => (look.pourer ? steel : new THREE.Color(look.cap)));
      const place = (g: THREE.BufferGeometry) => {
        const n = g.index ? g.toNonIndexed() : g;
        n.scale(scale, scale, scale);
        n.translate(firstX + i * spacing, shelfY + shelfTop, shelfZ);
        return n;
      };
      bodies.push(place(body), place(cap));
      if (!look.label) continue;
      const span = outer.filter(([, y]) => y >= look.label![0] && y <= look.label![1]);
      if (span.length < 2) continue;
      const label = new THREE.LatheGeometry(
        lathePoints(span.map(([r, y]) => [r + 0.002, y] as [number, number])),
        14,
        -1.2,
        2.4,
      );
      // Its own cell of the one canvas.
      const cell = (i + row * perShelf) % (columns * rowsOfLabels);
      const cx = cell % columns,
        cy = Math.floor(cell / columns);
      paintLabel(paint, cx * cellW, cy * cellH, cellW, cellH, id, look.labelColor);
      const uv = label.attributes.uv;
      for (let v = 0; v < uv.count; v++)
        uv.setXY(v, (cx + uv.getX(v)) / columns, 1 - (cy + 1 - uv.getY(v)) / rowsOfLabels);
      labels.push(place(label));
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const merge = (list: THREE.BufferGeometry[]) => {
    const merged = mergeGeometries(list)!;
    list.forEach((g) => g.dispose());
    return merged;
  };
  return { body: merge(bodies), label: merge(labels), texture };
}
export default function BackBar() {
  const { body, label, texture } = useMemo(buildShelves, []);
  return (
    <>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.1}
          envMap={barReflections()}
          envMapIntensity={1.6}
        />
      </mesh>
      <mesh geometry={label}>
        <meshStandardMaterial map={texture} roughness={0.78} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
