import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VoxelPart } from '../game/room-layout';

/** The one material every voxel model in the bar shares; colours live on the vertices. */
export const voxelMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.87,
});
/** Merge coloured boxes into a single geometry, drawn in one call. */
export function voxelGeometry(parts: VoxelPart[]) {
  const geometries = parts.map(([x, y, z, w, h, d, color]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    const c = new THREE.Color(color);
    const values = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) {
      values[i] = c.r;
      values[i + 1] = c.g;
      values[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(values, 3));
    return g;
  });
  const merged = mergeGeometries(geometries)!;
  geometries.forEach((g) => g.dispose());
  return merged;
}
