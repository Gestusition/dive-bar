import * as THREE from 'three';
import { personModel } from '../game/person';
import { voxelGeometry, voxelMaterial } from './voxels';

// Card portraits are the real 3D head from the character model, rendered once per
// character by a small offscreen renderer and kept as an image. The room's material
// and light colours are reused, so a face on a card looks like the one in the room.
const size = 192;
/** Turned a little to the side and seen from slightly above, like a three-quarter photo. */
const turn = 0.5,
  lookDown = 0.3;
let renderer: THREE.WebGLRenderer | null | undefined;
const cache = new Map<string, string>();

function portraitRenderer() {
  if (renderer !== undefined) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: document.createElement('canvas'),
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size, false);
    // Match the room's renderer.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch {
    renderer = null;
  }
  return renderer;
}

/** The character's head as an image URL, or null where WebGL is not available. */
export function portraitImage(id: string): string | null {
  const cached = cache.get(id);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;
  const gl = portraitRenderer();
  if (!gl) return null;
  const geometry = voxelGeometry(personModel(id).head);
  geometry.computeBoundingBox();
  geometry.translate(...geometry.boundingBox!.getCenter(new THREE.Vector3()).negate().toArray());
  const scene = new THREE.Scene();
  const head = new THREE.Mesh(geometry, voxelMaterial);
  head.rotation.y = turn;
  scene.add(head);
  scene.add(new THREE.AmbientLight('#ffe6c0', 1.1));
  scene.add(new THREE.HemisphereLight('#ead9bd', '#60473f', 1.3));
  const key = new THREE.DirectionalLight('#ffddae', 1.8);
  key.position.set(2, 4, 5);
  scene.add(key);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, Math.sin(lookDown) * 10, Math.cos(lookDown) * 10);
  camera.lookAt(0, 0, 0);
  // Fit the view to the farthest corner of the head as this camera sees it, so the
  // face fills the round frame without any corner reaching it, whatever the model.
  head.updateMatrixWorld();
  camera.updateMatrixWorld();
  const toView = camera.matrixWorldInverse.clone().multiply(head.matrixWorld);
  const point = new THREE.Vector3();
  const corners = geometry.attributes.position;
  let reach = 0;
  for (let i = 0; i < corners.count; i++) {
    point.fromBufferAttribute(corners, i).applyMatrix4(toView);
    reach = Math.max(reach, Math.hypot(point.x, point.y));
  }
  reach /= 0.94;
  Object.assign(camera, { left: -reach, right: reach, top: reach, bottom: -reach });
  camera.updateProjectionMatrix();
  gl.setClearColor(0x000000, 0);
  gl.render(scene, camera);
  const url = gl.domElement.toDataURL('image/png');
  geometry.dispose();
  cache.set(id, url);
  return url;
}
