import * as THREE from 'three';

// Liquid the way Half-Life: Alyx draws it. There is no fluid simulation: the inside of the
// container is one closed mesh, and a shader cuts it off at a plane that stays level in the
// room however the container is turned. Through the cut you see the mesh's back faces, which
// are shaded as if they lay on that plane, so they read as the surface. What makes it feel
// wet is how the plane moves: its height is worked out from the volume in the container, and
// it tilts and settles on a spring when the container is moved.

export type Profile = [number, number][]; // [radius, height] from the bottom up

/** A curve through the points of an outline, so that a lathe of it has no facets on its way up. */
export function smoothProfile(points: Profile, steps = 6): Profile {
  if (points.length < 3) return points;
  const curve = new THREE.CatmullRomCurve3(
    points.map(([r, y]) => new THREE.Vector3(r, y, 0)),
    false,
    'centripetal',
  );
  const out: Profile = [];
  const count = (points.length - 1) * steps;
  for (let i = 0; i <= count; i++) {
    const p = curve.getPoint(i / count);
    out.push([Math.max(0, p.x), p.y]);
  }
  // Exactly on the ends, whatever the curve did.
  out[0] = [...points[0]];
  out[count] = [...points[points.length - 1]];
  return out;
}
export function radiusAt(p: Profile, y: number) {
  for (let i = 1; i < p.length; i++) {
    const [r0, y0] = p[i - 1],
      [r1, y1] = p[i];
    if (y <= y1) return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return p[p.length - 1][0];
}
/** The closed inside of a container with walls this thick, from its floor to its rim. */
export function innerProfile(outer: Profile, floor: number, wall: number, steps = 30): Profile {
  const rimY = outer[outer.length - 1][1];
  const out: Profile = [[0, floor]];
  for (let i = 0; i <= steps; i++) {
    const y = floor + ((rimY - floor) * i) / steps;
    out.push([Math.max(0.001, radiusAt(outer, y) - wall), y]);
  }
  out.push([0, rimY]);
  return out;
}
/** A container in section as one closed line: up the outside, over the rim, down the inside. */
export function shellOutline(outer: Profile, floor: number, wall: number): Profile {
  const rimY = outer[outer.length - 1][1];
  const rimR = outer[outer.length - 1][0];
  const inside: Profile = [];
  const steps = 26;
  for (let i = steps; i >= 0; i--) {
    const y = floor + ((rimY - floor) * i) / steps;
    inside.push([Math.max(0.001, radiusAt(outer, y) - wall), y]);
  }
  return [
    [0, outer[0][1]],
    ...outer,
    [rimR - wall * 0.2, rimY + wall * 0.42],
    [rimR - wall * 0.8, rimY + wall * 0.42],
    ...inside,
    [0, floor],
  ];
}
export const lathePoints = (p: Profile) => p.map(([r, y]) => new THREE.Vector2(r, y));

/** Weighted points through the inside of a container, x y z weight, to find its level by. */
export function volumeSamples(inner: Profile, layers = 30, rings = 3, around = 10) {
  const low = inner[0][1],
    high = inner[inner.length - 1][1];
  const out = new Float32Array(layers * rings * around * 4);
  let n = 0;
  for (let l = 0; l < layers; l++) {
    const y = low + ((high - low) * (l + 0.5)) / layers;
    const r = radiusAt(inner.slice(1), y);
    for (let k = 0; k < rings; k++) {
      // Rings of equal area, each carrying its share of the slice.
      const at = r * Math.sqrt((k + 0.5) / rings);
      const weight = (r * r) / (rings * around);
      for (let a = 0; a < around; a++) {
        const angle = ((a + (k + l) * 0.5) / around) * Math.PI * 2;
        out[n++] = Math.cos(angle) * at;
        out[n++] = y;
        out[n++] = Math.sin(angle) * at;
        out[n++] = weight;
      }
    }
  }
  return out;
}
const bins = new Float64Array(128);
/**
 * The height in the room at which this share of the container's volume lies below a level
 * plane, with the container placed by `matrix`. Turn a bottle over and the same volume finds
 * its new level by itself, down in the neck.
 */
export function levelFor(samples: Float32Array, matrix: THREE.Matrix4, fraction: number) {
  const e = matrix.elements;
  let low = Infinity,
    high = -Infinity,
    total = 0;
  for (let i = 0; i < samples.length; i += 4) {
    const y = e[1] * samples[i] + e[5] * samples[i + 1] + e[9] * samples[i + 2] + e[13];
    if (y < low) low = y;
    if (y > high) high = y;
    total += samples[i + 3];
  }
  const size = high - low || 1;
  bins.fill(0);
  for (let i = 0; i < samples.length; i += 4) {
    const y = e[1] * samples[i] + e[5] * samples[i + 1] + e[9] * samples[i + 2] + e[13];
    bins[Math.min(bins.length - 1, Math.floor(((y - low) / size) * bins.length))] += samples[i + 3];
  }
  const want = THREE.MathUtils.clamp(fraction, 0, 1) * total;
  let seen = 0;
  for (let i = 0; i < bins.length; i++) {
    if (seen + bins[i] >= want) {
      const within = bins[i] ? (want - seen) / bins[i] : 0;
      return low + ((i + within) / bins.length) * size;
    }
    seen += bins[i];
  }
  return high;
}

const noMove = new THREE.Matrix4();
/** How high this share of its volume stands in a container standing upright. */
export function uprightLevel(inner: Profile, fraction: number) {
  return levelFor(volumeSamples(inner), noMove, fraction);
}

/** Gravity, to scale with the room: what a sideways shove is measured against. */
const gravity = 7;
const springRate = 95,
  springDamping = 3.6,
  mostTilt = 0.42;
/**
 * The state of the liquid in one container: how full it is, where its surface is, and how
 * the surface is moving. Stepped once a frame with the matrix of what holds it.
 */
export class LiquidBody {
  samples: Float32Array | null = null;
  fraction = 0;
  /** How high the surface is in the room, and the middle of it. */
  level = 0;
  centre = new THREE.Vector3();
  tiltX = 0;
  tiltZ = 0;
  /** How rough the surface is; movement stirs it up and it settles. */
  agitation = 0;
  time = 0;
  ripple = new THREE.Vector4(0, 0, 0, 0);
  foam = 0;
  /** With reduced motion the surface is still: no waves running over it. */
  still = false;
  color = new THREE.Color('#d6a35a');
  opacity = 0.9;
  private speedX = 0;
  private speedZ = 0;
  private seen = false;
  private at = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  /** Move the surface directly, as a spoon going round does; x and z are a shove in tilt. */
  push(x: number, z: number) {
    this.speedX += x;
    this.speedZ += z;
  }
  /** Something landed in it, here in the room. */
  splash(x: number, z: number, strength: number) {
    this.ripple.x = x;
    this.ripple.y = z;
    if (this.ripple.w < strength) this.ripple.z = 0;
    this.ripple.w = Math.max(this.ripple.w, strength);
    this.agitation = Math.min(1, this.agitation + strength * 0.2);
  }
  step(matrix: THREE.Matrix4, dt: number) {
    if (!this.samples || dt <= 0) return;
    const e = matrix.elements;
    const x = e[12],
      y = e[13],
      z = e[14];
    const ux = e[4],
      uy = e[5],
      uz = e[6];
    if (this.seen) {
      const vx = (x - this.at.x) / dt,
        vz = (z - this.at.z) / dt;
      const ax = THREE.MathUtils.clamp((vx - this.velocity.x) / dt, -60, 60),
        az = THREE.MathUtils.clamp((vz - this.velocity.z) / dt, -60, 60);
      this.velocity.set(vx, 0, vz);
      // Liquid stays behind when its container is shoved, then swings past and settles.
      this.speedX += (-springRate * (this.tiltX + ax / gravity) - springDamping * this.speedX) * dt;
      this.speedZ += (-springRate * (this.tiltZ + az / gravity) - springDamping * this.speedZ) * dt;
      // Turning the container throws the surface the other way.
      this.speedX -= (ux - this.up.x) * 3.5;
      this.speedZ -= (uz - this.up.z) * 3.5;
      this.tiltX = THREE.MathUtils.clamp(this.tiltX + this.speedX * dt, -mostTilt, mostTilt);
      this.tiltZ = THREE.MathUtils.clamp(this.tiltZ + this.speedZ * dt, -mostTilt, mostTilt);
      const moved = Math.hypot(ax, az) / 60 + Math.hypot(ux - this.up.x, uz - this.up.z) * 2;
      this.agitation = Math.min(
        1,
        Math.max(this.agitation * Math.exp(-dt * 1.8), Math.min(1, moved * 0.9)),
      );
    }
    this.seen = true;
    this.at.set(x, y, z);
    this.up.set(ux, uy, uz);
    if (!this.still) this.time += dt;
    this.ripple.z += dt;
    this.ripple.w *= Math.exp(-dt * 2.4);
    this.level = levelFor(this.samples, matrix, this.fraction);
    // The surface tilts about the middle of what is under it.
    const s = this.samples;
    let cx = 0,
      cz = 0,
      w = 0;
    for (let i = 0; i < s.length; i += 4) {
      const sy = e[1] * s[i] + e[5] * s[i + 1] + e[9] * s[i + 2] + y;
      if (sy > this.level) continue;
      cx += (e[0] * s[i] + e[4] * s[i + 1] + e[8] * s[i + 2] + x) * s[i + 3];
      cz += (e[2] * s[i] + e[6] * s[i + 1] + e[10] * s[i + 2] + z) * s[i + 3];
      w += s[i + 3];
    }
    this.centre.set(w ? cx / w : x, this.level, w ? cz / w : z);
  }
}

const header = /* glsl */ `
uniform vec4 uPlane;
uniform float uWave;
uniform float uTime;
uniform float uFoam;
uniform vec3 uSurface;
uniform vec4 uRipple;
varying vec3 vLiquidWorld;
float liquidWaves(vec3 p) {
  return uWave * (sin(p.x * 21.0 + uTime * 8.0) * 0.5 + sin(p.z * 29.0 - uTime * 10.0) * 0.32
    + sin((p.x - p.z) * 53.0 + uTime * 17.0) * 0.18);
}
`;
/** The one material of a liquid; each container has its own, sharing a compiled shader. */
export function liquidMaterial(envMap: THREE.Texture) {
  const uniforms = {
    uPlane: { value: new THREE.Vector4(0, 1, 0, 0) },
    uWave: { value: 0 },
    uTime: { value: 0 },
    uFoam: { value: 0 },
    uSurface: { value: new THREE.Color() },
    uRipple: { value: new THREE.Vector4() },
  };
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.1,
    metalness: 0,
    envMap,
    envMapIntensity: 1.1,
    emissiveIntensity: 0.28,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLiquidWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vLiquidWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + header)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
float liquidHeight = dot(uPlane.xyz, vLiquidWorld) - uPlane.w - liquidWaves(vLiquidWorld);
if (liquidHeight > 0.0) discard;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (gl_FrontFacing) {
  // Seen through the side: a bright line where it meets the glass, richer further down,
  // and a head of foam on top after a shake.
  float depthIn = -liquidHeight;
  diffuseColor.rgb = mix(diffuseColor.rgb, uSurface, (1.0 - smoothstep(0.0, 0.013, depthIn)) * 0.75);
  diffuseColor.rgb *= mix(1.0, 0.76, smoothstep(0.0, 0.4, depthIn));
  float foam = uFoam * (1.0 - smoothstep(uFoam * 0.03, uFoam * 0.055, depthIn));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.94, 0.86), foam);
  diffuseColor.a = max(diffuseColor.a, foam);
} else {
  diffuseColor.rgb = mix(uSurface, vec3(0.97, 0.94, 0.86), uFoam * 0.9);
  diffuseColor.a = max(diffuseColor.a, mix(0.72, 1.0, uFoam));
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
if (!gl_FrontFacing) {
  // Back along the line of sight to the point on the plane this pixel really shows.
  vec3 toCamera = isOrthographic
    ? vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
    : normalize(cameraPosition - vLiquidWorld);
  float along = (uPlane.w - dot(uPlane.xyz, vLiquidWorld)) / max(dot(uPlane.xyz, toCamera), 0.05);
  vec3 onPlane = vLiquidWorld + toCamera * along;
  vec3 surfaceNormal = uPlane.xyz;
  vec2 fromHit = onPlane.xz - uRipple.xy;
  float away = length(fromHit) + 0.0001;
  surfaceNormal.xz += (fromHit / away) * uRipple.w * 0.55
    * sin(away * 105.0 - uRipple.z * 20.0) * exp(-away * 7.0);
  surfaceNormal.x += uWave * 9.0 * cos(onPlane.x * 21.0 + uTime * 8.0);
  surfaceNormal.z -= uWave * 9.0 * cos(onPlane.z * 29.0 - uTime * 10.0);
  normal = normalize((viewMatrix * vec4(surfaceNormal, 0.0)).xyz);
}`,
      );
  };
  material.customProgramCacheKey = () => 'alyx-liquid';
  material.userData.uniforms = uniforms;
  return material;
}
const surfaceTint = new THREE.Color('#ffffff');
const planeNormal = new THREE.Vector3();
/** Copy a body's state into its material, for this frame. */
export function showLiquid(material: THREE.MeshStandardMaterial, body: LiquidBody) {
  const u = material.userData.uniforms;
  const n = planeNormal.set(body.tiltX, 1, body.tiltZ).normalize();
  u.uPlane.value.set(n.x, n.y, n.z, n.dot(body.centre));
  u.uWave.value = body.still ? 0 : 0.0028 + body.agitation * 0.014;
  u.uTime.value = body.time;
  u.uFoam.value = body.foam;
  u.uRipple.value.copy(body.ripple);
  u.uSurface.value.copy(body.color).lerp(surfaceTint, 0.3);
  material.color.copy(body.color);
  material.emissive.copy(body.color);
  material.opacity = body.opacity;
}

/**
 * Real glass is clear where you look straight through it and bright where you look along it,
 * and its highlights are as strong as any solid's. Alpha follows both. `side` splits the two
 * sides of a glass, so the liquid can be drawn between its far wall and its near one.
 */
export function glassMaterial(
  envMap: THREE.Texture,
  side: THREE.Side,
  options: { clear?: number; tint?: string; rough?: number; envIntensity?: number } = {},
) {
  const uniforms = {
    uClear: { value: options.clear ?? 0.05 },
    uFrost: { value: 0 },
  };
  const material = new THREE.MeshStandardMaterial({
    color: options.tint ?? '#f4fbfa',
    transparent: true,
    side,
    depthWrite: false,
    roughness: options.rough ?? 0.035,
    metalness: 0,
    envMap,
    envMapIntensity: options.envIntensity ?? 1.9,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlassLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlassLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uClear;
uniform float uFrost;
varying vec3 vGlassLocal;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `float facing = abs(normal.z);
float along = pow(1.0 - facing, 2.6);
float shine = dot(reflectedLight.directSpecular + reflectedLight.indirectSpecular, vec3(0.33));
// Beads of cold on the glass: a fine mottle, heavier towards the bottom.
vec3 cell = floor(vGlassLocal * vec3(420.0, 300.0, 420.0));
float bead = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
float mist = uFrost * (0.2 + 0.14 * bead);
outgoingLight = mix(outgoingLight, vec3(0.93, 0.97, 0.98), mist * 0.7);
diffuseColor.a = clamp(uClear + along * 0.62 + shine * 1.1 + mist, 0.0, 1.0);
#include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => 'clear-glass';
  material.userData.uniforms = uniforms;
  return material;
}

const RINGS = 22,
  SIDES = 10;
/**
 * A falling stream: a tube along the path a liquid takes under gravity from where it leaves
 * the spout, thinning as it speeds up, with a shiver running down it. It is rebuilt each frame.
 */
export class LiquidStream {
  geometry = new THREE.BufferGeometry();
  /** Where it lands, in the same frame as what it is given. */
  landing = new THREE.Vector3();
  private positions = new Float32Array((RINGS + 1) * (SIDES + 1) * 3);
  private normals = new Float32Array((RINGS + 1) * (SIDES + 1) * 3);
  private p = new THREE.Vector3();
  private t = new THREE.Vector3();
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  constructor() {
    const index: number[] = [];
    for (let r = 0; r < RINGS; r++)
      for (let s = 0; s < SIDES; s++) {
        const i = r * (SIDES + 1) + s;
        index.push(i, i + SIDES + 1, i + 1, i + 1, i + SIDES + 1, i + SIDES + 2);
      }
    this.geometry.setIndex(index);
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage),
    );
  }
  /** Lay the tube from `from`, leaving along `direction` at `speed`, down to height `toY`. */
  update(
    from: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    toY: number,
    radius: number,
    time: number,
  ) {
    const vx = direction.x * speed,
      vy = direction.y * speed,
      vz = direction.z * speed;
    // How long until it has fallen to the surface.
    const drop = Math.max(0.001, from.y - toY);
    const duration = (vy + Math.sqrt(vy * vy + 2 * gravity * drop)) / gravity;
    const { p, t, a, b } = this;
    let n = 0;
    for (let r = 0; r <= RINGS; r++) {
      const share = r / RINGS;
      const at = share * duration;
      p.set(from.x + vx * at, from.y + vy * at - 0.5 * gravity * at * at, from.z + vz * at);
      t.set(vx, vy - gravity * at, vz).normalize();
      a.set(0, 0, 1).cross(t);
      if (a.lengthSq() < 1e-5) a.set(1, 0, 0);
      a.normalize();
      b.crossVectors(t, a);
      // Faster lower down, so thinner, as water from a tap is.
      const fast = Math.hypot(speed, gravity * at);
      const width = radius * Math.sqrt(Math.max(speed, 0.3) / Math.max(fast, 0.3));
      const shiver =
        1 + 0.14 * Math.sin(share * 24 - time * 38) + 0.07 * Math.sin(share * 61 - time * 71);
      const wander = radius * 0.28 * share * Math.sin(share * 9 - time * 17);
      for (let s = 0; s <= SIDES; s++) {
        const angle = (s / SIDES) * Math.PI * 2;
        const c = Math.cos(angle),
          d = Math.sin(angle);
        const nx = a.x * c + b.x * d,
          ny = a.y * c + b.y * d,
          nz = a.z * c + b.z * d;
        const w = width * shiver;
        this.positions[n] = p.x + nx * w + wander;
        this.positions[n + 1] = p.y + ny * w;
        this.positions[n + 2] = p.z + nz * w;
        this.normals[n] = nx;
        this.normals[n + 1] = ny;
        this.normals[n + 2] = nz;
        n += 3;
      }
    }
    this.landing.set(from.x + vx * duration, toY, from.z + vz * duration);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}

/** The drops thrown up where a stream lands, and shaken off a dash bottle. */
export class Droplets {
  mesh: THREE.InstancedMesh;
  private live: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    age: number;
    size: number;
  }[] = [];
  private matrix = new THREE.Matrix4();
  private next = 0;
  /** The wall of the container they are in: its middle, and how far they can go from it. */
  wall = { x: 0, z: 0, radius: 0.15 };
  constructor(count = 28) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshStandardMaterial({ roughness: 0.08, transparent: true, opacity: 0.92 }),
      count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.live = Array.from({ length: count }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: Infinity,
      size: 0,
    }));
  }
  throw(at: THREE.Vector3, up: number, spread: number, size: number) {
    const d = this.live[this.next];
    this.next = (this.next + 1) % this.live.length;
    const angle = Math.random() * Math.PI * 2;
    const out = spread * (0.35 + Math.random() * 0.65);
    d.x = at.x;
    d.y = at.y;
    d.z = at.z;
    d.vx = Math.cos(angle) * out;
    d.vz = Math.sin(angle) * out;
    d.vy = up * (0.5 + Math.random() * 0.5);
    d.age = 0;
    d.size = size * (0.6 + Math.random() * 0.6);
  }
  /** Move the drops on; each is gone once it has fallen below `floorY`. */
  step(dt: number, floorY: number) {
    let n = 0;
    for (const d of this.live) {
      if (d.age === Infinity) continue;
      d.age += dt;
      d.vy -= gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      if (d.y < floorY && d.vy < 0) {
        d.age = Infinity;
        continue;
      }
      const ox = d.x - this.wall.x,
        oz = d.z - this.wall.z;
      const out = Math.hypot(ox, oz);
      if (out > this.wall.radius) {
        d.x = this.wall.x + (ox / out) * this.wall.radius;
        d.z = this.wall.z + (oz / out) * this.wall.radius;
        d.vx *= -0.3;
        d.vz *= -0.3;
      }
      this.matrix.makeScale(d.size, d.size * (1 + Math.min(1, -d.vy * 0.25)), d.size);
      this.matrix.setPosition(d.x, d.y, d.z);
      this.mesh.setMatrixAt(n++, this.matrix);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
